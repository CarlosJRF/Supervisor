import { BannerTurno } from '../componentes/BannerTurno';
import { Hoja, Pinza, useDatos } from '../componentes/ui';
import { useTurno } from '../componentes/useTurno';
import { avisar, intentar, useEstado } from '../estado';
import { completarTarea, deshacerTarea, reasignarTarea, tareasDelTurno, trabajadoresDelTurno, type TareaDelTurno } from '../db/repos/turnos';

export function Tareas() {
  const { usuario } = useEstado();
  const [datos] = useTurno();
  const turno = datos?.turno;
  const [tareas, recargar] = useDatos(() => (turno ? tareasDelTurno(turno.id) : Promise.resolve([])), [turno?.id]);
  const [personal] = useDatos(() => (turno ? trabajadoresDelTurno(turno.id) : Promise.resolve([])), [turno?.id]);

  if (!datos) return null;
  if (!turno)
    return (
      <>
        <Pinza titulo="Tareas" atras />
        <Hoja>
          <p class="vacio">No hay un turno abierto en esta área.</p>
        </Hoja>
      </>
    );

  const marcar = async (t: TareaDelTurno) => {
    if (t.estado === 'completada') {
      await deshacerTarea(t.id);
      return recargar();
    }
    const ok = await intentar(async () => {
      await completarTarea(t.id, usuario!.id);
      return true;
    });
    if (!ok) return;
    recargar();
    avisar(`“${t.nombre}” completada`, {
      texto: 'Deshacer',
      fn: async () => {
        await deshacerTarea(t.id);
        recargar();
      },
    }, 5000);
  };

  const asignar = async (t: TareaDelTurno, trabajadorId: string) => {
    await reasignarTarea(t.id, trabajadorId ? Number(trabajadorId) : null);
    recargar();
  };

  const traspasadas = tareas?.filter((t) => t.traspasos > 0 && t.estado === 'pendiente') ?? [];
  const normales = tareas?.filter((t) => !(t.traspasos > 0 && t.estado === 'pendiente')) ?? [];
  const grupos = new Map<string, TareaDelTurno[]>();
  for (const t of normales) {
    const k = t.trabajador ?? 'Sin asignar';
    grupos.set(k, [...(grupos.get(k) ?? []), t]);
  }
  const completas = tareas?.filter((t) => t.estado === 'completada').length ?? 0;

  const selector = (t: TareaDelTurno) => (
    <select
      aria-label={`Asignar ${t.nombre}`}
      style="width:auto;max-width:45%;min-height:40px"
      value={t.trabajador_id ?? ''}
      onChange={(e) => asignar(t, e.currentTarget.value)}
    >
      <option value="">Sin asignar</option>
      {personal?.map((p) => <option value={p.id}>{p.nombre}</option>)}
    </select>
  );

  const fila = (t: TareaDelTurno) => (
    <li class={t.estado === 'completada' ? 'hecho' : ''}>
      <input
        type="checkbox"
        class="casilla"
        checked={t.estado === 'completada'}
        onChange={() => marcar(t)}
        aria-label={`Completar ${t.nombre}`}
      />
      <div class="crece">
        <div class="titulo">{t.nombre}</div>
        <div class="sec num">
          dif. {t.dificultad}
          {t.traspasos > 0 && ` · traspasada ×${t.traspasos}`}
          {t.estado === 'completada' && ` · +${t.puntos_otorgados} pts`}
        </div>
      </div>
      {t.estado === 'pendiente' && selector(t)}
    </li>
  );

  return (
    <>
      <Pinza titulo={`Tareas · ${turno.nombre_horario}`} atras>
        <span class="num">
          {completas}/{tareas?.length ?? 0}
        </span>
      </Pinza>
      <BannerTurno turno={turno} pendientes={datos.pendientes.length} minutosAviso={datos.config.minutos_aviso} />
      <Hoja>
        {traspasadas.length > 0 && (
          <section class="aviso">
            <strong>Tareas sin completar del turno anterior</strong>
            <p class="sec">Reasígnalas si es necesario. Cada traspaso suma +{datos.config.bono_traspaso} puntos al completarla.</p>
            <ul class="renglones">{traspasadas.map(fila)}</ul>
          </section>
        )}
        {tareas?.length === 0 && <p class="vacio">Este turno no tiene tareas. Créalas en Administración → Plantillas de tareas.</p>}
        {[...grupos.entries()].map(([nombre, lista]) => (
          <>
            <h2>{nombre}</h2>
            <ul class="renglones">{lista.map(fila)}</ul>
          </>
        ))}
      </Hoja>
    </>
  );
}
