import { cambiar, leerEstado } from '../estado';
import { listarAreas } from '../db/repos/catalogo';
import { pendientesDelTurno, turnosAbiertos } from '../db/repos/turnos';
import { auditar } from '../db/repos/auditoria';
import type { Usuario } from '../db/repos/usuarios';

export async function iniciarSesion(u: Usuario) {
  const areas = await listarAreas(u);
  const previa = leerEstado().areaId;
  cambiar({ usuario: u, areas, areaId: areas.find((a) => a.id === previa)?.id ?? areas[0]?.id ?? null });
}

export async function recargarAreas() {
  const { usuario, areaId } = leerEstado();
  if (!usuario) return;
  const areas = await listarAreas(usuario);
  cambiar({ areas, areaId: areas.find((a) => a.id === areaId)?.id ?? areas[0]?.id ?? null });
}

/**
 * Candado de cierre: si hay turnos abiertos con evaluaciones pendientes en las áreas del usuario,
 * devuelve la descripción del bloqueo. Ver CLAUDE.md §6.5.
 */
export async function bloqueoDeSalida(): Promise<{ areaId: number; texto: string } | null> {
  const { areas } = leerEstado();
  for (const t of await turnosAbiertos(areas.map((a) => a.id))) {
    const { ids } = await pendientesDelTurno(t.id);
    if (ids.length) {
      const area = areas.find((a) => a.id === t.area_id)?.nombre ?? '';
      return { areaId: t.area_id, texto: `${area} – ${t.nombre_horario}: faltan ${ids.length} evaluaciones` };
    }
  }
  return null;
}

/** Cierra la sesión. `bloquear` deja el turno abierto (inactividad); salir voluntariamente respeta el candado. */
export async function cerrarSesion(motivo: 'salir' | 'inactividad') {
  const u = leerEstado().usuario;
  if (u) await auditar(u.id, motivo === 'salir' ? 'salida' : 'bloqueo_inactividad', 'usuario', u.id);
  cambiar({ usuario: null });
  location.hash = '/';
}
