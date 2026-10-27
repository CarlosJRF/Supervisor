import { consultar, ejecutar, transaccion, uno } from '../conexion';
import { auditar } from './auditoria';
import { leerConfig } from './config';
import { listarCriterios } from './catalogo';
import { deFechaISO, diaSemana } from '../../dominio/fechas';
import { puntosTarea } from '../../dominio/puntos';
import { traspasar } from '../../dominio/traspaso';
import { pendientesDeEvaluacion, type EstadoAsistencia, type EstadoEvaluacion } from '../../dominio/candado';

export interface Turno {
  id: number;
  horario_turno_id: number;
  fecha: string;
  estado: 'abierto' | 'cerrado';
  abierto_en: string;
  cerrado_en: string | null;
  area_id: number;
  nombre_horario: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface TareaDelTurno {
  id: number;
  plantilla_id: number;
  nombre: string;
  dificultad: number;
  trabajador_id: number | null;
  trabajador: string | null;
  estado: 'pendiente' | 'completada' | 'traspasada';
  traspasos: number;
  puntos_otorgados: number | null;
}

const SELECT_TURNO = `SELECT t.*, h.area_id, h.nombre AS nombre_horario, h.hora_inicio, h.hora_fin
  FROM turno t JOIN horario_turno h ON h.id = t.horario_turno_id`;

export const turnoAbierto = (areaId: number) =>
  uno<Turno>(`${SELECT_TURNO} WHERE h.area_id = ? AND t.estado = 'abierto' ORDER BY t.abierto_en DESC LIMIT 1`, [areaId]);

export const obtenerTurno = (id: number) => uno<Turno>(`${SELECT_TURNO} WHERE t.id = ?`, [id]);

export const turnoDeFecha = (horarioId: number, fecha: string) =>
  uno<Turno>(`${SELECT_TURNO} WHERE t.horario_turno_id = ? AND t.fecha = ?`, [horarioId, fecha]);

/** Todos los turnos abiertos en áreas dadas (para el candado de cierre de sesión). */
export async function turnosAbiertos(areaIds: number[]): Promise<Turno[]> {
  if (!areaIds.length) return [];
  return consultar<Turno>(`${SELECT_TURNO} WHERE t.estado = 'abierto' AND h.area_id IN (${areaIds.map(() => '?').join(',')})`, areaIds);
}

/** Abre un turno: crea las tareas del día desde las plantillas y recibe las traspasadas del área. */
export async function abrirTurno(horarioId: number, fecha: string, usuarioId: number): Promise<number> {
  const h = await uno<{ area_id: number }>('SELECT area_id FROM horario_turno WHERE id = ?', [horarioId]);
  if (!h) throw new Error('Horario inexistente');
  if (await turnoAbierto(h.area_id)) throw new Error('Ya hay un turno abierto en esta área');
  const dia = String(diaSemana(deFechaISO(fecha)));

  const id = await transaccion(async () => {
    const turnoId = await ejecutar('INSERT INTO turno (horario_turno_id, fecha, abierto_por) VALUES (?, ?, ?)', [
      horarioId,
      fecha,
      usuarioId,
    ]);
    const plantillas = await consultar<{ id: number; trabajador_id: number | null; dias_semana: string }>(
      `SELECT id, trabajador_id, dias_semana FROM plantilla_tarea
       WHERE activo = 1 AND area_id = ? AND (horario_turno_id IS NULL OR horario_turno_id = ?)`,
      [h.area_id, horarioId],
    );
    for (const p of plantillas.filter((p) => p.dias_semana.includes(dia)))
      await ejecutar('INSERT INTO tarea_turno (turno_id, plantilla_id, trabajador_id) VALUES (?, ?, ?)', [
        turnoId,
        p.id,
        p.trabajador_id,
      ]);

    const pendientes = await consultar<{ id: number; plantilla_id: number; trabajador_id: number | null; traspasos: number }>(
      `SELECT tt.id, tt.plantilla_id, tt.trabajador_id, tt.traspasos FROM tarea_turno tt
       JOIN turno t ON t.id = tt.turno_id JOIN horario_turno h ON h.id = t.horario_turno_id
       WHERE h.area_id = ? AND tt.estado = 'traspasada'
         AND NOT EXISTS (SELECT 1 FROM tarea_turno c WHERE c.origen_tarea_id = tt.id)`,
      [h.area_id],
    );
    const copias = traspasar(
      pendientes.map((p) => ({ id: p.id, plantillaId: p.plantilla_id, trabajadorId: p.trabajador_id, traspasos: p.traspasos })),
    );
    for (const c of copias)
      await ejecutar(
        'INSERT INTO tarea_turno (turno_id, plantilla_id, trabajador_id, traspasos, origen_tarea_id) VALUES (?, ?, ?, ?, ?)',
        [turnoId, c.plantillaId, c.trabajadorId, c.traspasos, c.origenTareaId],
      );
    return turnoId;
  });
  await auditar(usuarioId, 'abrir', 'turno', id, { horarioId, fecha });
  return id;
}

export const tareasDelTurno = (turnoId: number) =>
  consultar<TareaDelTurno>(
    `SELECT tt.id, tt.plantilla_id, p.nombre, p.dificultad, tt.trabajador_id, w.nombre AS trabajador,
            tt.estado, tt.traspasos, tt.puntos_otorgados
     FROM tarea_turno tt JOIN plantilla_tarea p ON p.id = tt.plantilla_id
     LEFT JOIN trabajador w ON w.id = tt.trabajador_id
     WHERE tt.turno_id = ? ORDER BY tt.traspasos DESC, w.nombre, p.nombre`,
    [turnoId],
  );

export async function completarTarea(tareaId: number, usuarioId: number) {
  const t = await uno<{ dificultad: number; traspasos: number; trabajador_id: number | null }>(
    `SELECT p.dificultad, tt.traspasos, tt.trabajador_id FROM tarea_turno tt
     JOIN plantilla_tarea p ON p.id = tt.plantilla_id WHERE tt.id = ? AND tt.estado = 'pendiente'`,
    [tareaId],
  );
  if (!t) return;
  if (t.trabajador_id === null) throw new Error('Asigna un trabajador antes de completar la tarea');
  const c = await leerConfig();
  const puntos = puntosTarea(t.dificultad, t.traspasos, c.bono_traspaso, c.tope_traspasos);
  await ejecutar(
    `UPDATE tarea_turno SET estado = 'completada', completada_por = ?, completada_en = datetime('now','localtime'),
     puntos_otorgados = ? WHERE id = ?`,
    [usuarioId, puntos, tareaId],
  );
}

export const deshacerTarea = (tareaId: number) =>
  ejecutar(
    `UPDATE tarea_turno SET estado = 'pendiente', completada_por = NULL, completada_en = NULL, puntos_otorgados = NULL
     WHERE id = ? AND estado = 'completada'`,
    [tareaId],
  );

export const reasignarTarea = (tareaId: number, trabajadorId: number | null) =>
  ejecutar(`UPDATE tarea_turno SET trabajador_id = ? WHERE id = ? AND estado = 'pendiente'`, [trabajadorId, tareaId]);

/** Trabajadores que deben evaluarse en un turno: activos del área con ese horario habitual o sin horario fijo. */
export async function trabajadoresDelTurno(turnoId: number) {
  return consultar<{ id: number; nombre: string }>(
    `SELECT w.id, w.nombre FROM trabajador w
     JOIN turno t ON t.id = ? JOIN horario_turno h ON h.id = t.horario_turno_id
     WHERE w.activo = 1 AND w.area_id = h.area_id AND (w.horario_turno_id IS NULL OR w.horario_turno_id = h.id)
     ORDER BY w.nombre`,
    [turnoId],
  );
}

export async function marcarAsistencia(turnoId: number, trabajadorId: number, estado: EstadoAsistencia) {
  await transaccion(async () => {
    await ejecutar(
      `INSERT INTO asistencia (turno_id, trabajador_id, estado) VALUES (?, ?, ?)
       ON CONFLICT(turno_id, trabajador_id) DO UPDATE SET estado = excluded.estado`,
      [turnoId, trabajadorId, estado],
    );
    if (estado !== 'presente')
      await ejecutar('DELETE FROM evaluacion WHERE turno_id = ? AND trabajador_id = ?', [turnoId, trabajadorId]);
  });
}

export const calificar = (turnoId: number, trabajadorId: number, criterioId: number, nota: number, usuarioId: number) =>
  ejecutar(
    `INSERT INTO evaluacion (turno_id, trabajador_id, criterio_id, nota, evaluado_por) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(turno_id, trabajador_id, criterio_id)
     DO UPDATE SET nota = excluded.nota, evaluado_por = excluded.evaluado_por, evaluado_en = datetime('now','localtime')`,
    [turnoId, trabajadorId, criterioId, nota, usuarioId],
  );

export interface FilaEvaluacion {
  id: number;
  nombre: string;
  asistencia: EstadoAsistencia | null;
  notas: Record<number, number>;
}

export async function evaluacionesDelTurno(turnoId: number): Promise<FilaEvaluacion[]> {
  const trabajadores = await trabajadoresDelTurno(turnoId);
  const asist = await consultar<{ trabajador_id: number; estado: EstadoAsistencia }>(
    'SELECT trabajador_id, estado FROM asistencia WHERE turno_id = ?',
    [turnoId],
  );
  const notas = await consultar<{ trabajador_id: number; criterio_id: number; nota: number }>(
    'SELECT trabajador_id, criterio_id, nota FROM evaluacion WHERE turno_id = ?',
    [turnoId],
  );
  return trabajadores.map((w) => ({
    id: w.id,
    nombre: w.nombre,
    asistencia: asist.find((a) => a.trabajador_id === w.id)?.estado ?? null,
    notas: Object.fromEntries(notas.filter((n) => n.trabajador_id === w.id).map((n) => [n.criterio_id, n.nota])),
  }));
}

export async function pendientesDelTurno(turnoId: number): Promise<{ ids: number[]; total: number }> {
  const [filas, criterios] = await Promise.all([evaluacionesDelTurno(turnoId), listarCriterios()]);
  const ids = criterios.map((c) => c.id);
  const estados: EstadoEvaluacion[] = filas.map((f) => ({
    trabajadorId: f.id,
    asistencia: f.asistencia,
    criteriosEvaluados: ids.filter((c) => f.notas[c] !== undefined).length,
  }));
  return { ids: pendientesDeEvaluacion(estados, ids.length), total: filas.length };
}

/** Cierra el turno si no hay evaluaciones pendientes; las tareas pendientes quedan traspasadas. */
export async function cerrarTurno(turnoId: number, usuarioId: number): Promise<{ traspasadas: number }> {
  const { ids } = await pendientesDelTurno(turnoId);
  if (ids.length) throw new Error(`Faltan ${ids.length} evaluaciones por completar`);
  const traspasadas = (
    await consultar<{ n: number }>(`SELECT COUNT(*) AS n FROM tarea_turno WHERE turno_id = ? AND estado = 'pendiente'`, [turnoId])
  )[0].n;
  await transaccion(async () => {
    await ejecutar(`UPDATE tarea_turno SET estado = 'traspasada' WHERE turno_id = ? AND estado = 'pendiente'`, [turnoId]);
    await ejecutar(
      `UPDATE turno SET estado = 'cerrado', cerrado_por = ?, cerrado_en = datetime('now','localtime') WHERE id = ?`,
      [usuarioId, turnoId],
    );
  });
  await auditar(usuarioId, 'cerrar', 'turno', turnoId, { traspasadas });
  return { traspasadas };
}

/** Solo admin. Devuelve a pendiente las tareas traspasadas que aún no se copiaron a otro turno. */
export async function reabrirTurno(turnoId: number, usuarioId: number) {
  const t = await obtenerTurno(turnoId);
  if (!t) return;
  if (await turnoAbierto(t.area_id)) throw new Error('Cierra primero el turno abierto del área');
  await transaccion(async () => {
    await ejecutar(
      `UPDATE tarea_turno SET estado = 'pendiente' WHERE turno_id = ? AND estado = 'traspasada'
       AND NOT EXISTS (SELECT 1 FROM tarea_turno c WHERE c.origen_tarea_id = tarea_turno.id)`,
      [turnoId],
    );
    await ejecutar(`UPDATE turno SET estado = 'abierto', cerrado_por = NULL, cerrado_en = NULL WHERE id = ?`, [turnoId]);
  });
  await auditar(usuarioId, 'reabrir', 'turno', turnoId);
}

export const turnosRecientes = (areaId: number, limite = 30) =>
  consultar<Turno>(`${SELECT_TURNO} WHERE h.area_id = ? ORDER BY t.fecha DESC, h.hora_inicio DESC LIMIT ?`, [areaId, limite]);
