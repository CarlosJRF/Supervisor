import { consultar } from '../conexion';
import { leerConfig } from './config';
import { calcularRanking, type EntradaRanking, type FilaRanking } from '../../dominio/ranking';

/** Ranking del área entre dos fechas ISO (inclusive), por fecha del turno. */
export async function rankingDeArea(areaId: number, desde: string, hasta: string): Promise<FilaRanking[]> {
  const trabajadores = await consultar<{ id: number; nombre: string }>(
    'SELECT id, nombre FROM trabajador WHERE area_id = ? AND activo = 1',
    [areaId],
  );
  const puntos = await consultar<{ trabajador_id: number; p: number }>(
    `SELECT tt.trabajador_id, SUM(tt.puntos_otorgados) AS p FROM tarea_turno tt JOIN turno t ON t.id = tt.turno_id
     WHERE tt.estado = 'completada' AND t.fecha BETWEEN ? AND ? GROUP BY tt.trabajador_id`,
    [desde, hasta],
  );
  const notas = await consultar<{ trabajador_id: number; nota: number }>(
    `SELECT e.trabajador_id, e.nota FROM evaluacion e JOIN turno t ON t.id = e.turno_id WHERE t.fecha BETWEEN ? AND ?`,
    [desde, hasta],
  );
  const entradas: EntradaRanking[] = trabajadores.map((w) => ({
    trabajadorId: w.id,
    nombre: w.nombre,
    puntosTareas: puntos.find((p) => p.trabajador_id === w.id)?.p ?? 0,
    notas: notas.filter((n) => n.trabajador_id === w.id).map((n) => n.nota),
  }));
  const c = await leerConfig();
  return calcularRanking(entradas, { tareas: c.peso_tareas, habitos: c.peso_habitos });
}

export interface HistorialTrabajador {
  fecha: string;
  turno: string;
  puntos: number;
  completadas: number;
  asistencia: string | null;
  promedio: number | null;
}

export const historialTrabajador = (trabajadorId: number, desde: string, hasta: string) =>
  consultar<HistorialTrabajador>(
    `SELECT t.fecha, h.nombre AS turno,
       COALESCE((SELECT SUM(puntos_otorgados) FROM tarea_turno WHERE turno_id = t.id AND trabajador_id = ? AND estado = 'completada'), 0) AS puntos,
       (SELECT COUNT(*) FROM tarea_turno WHERE turno_id = t.id AND trabajador_id = ? AND estado = 'completada') AS completadas,
       (SELECT estado FROM asistencia WHERE turno_id = t.id AND trabajador_id = ?) AS asistencia,
       (SELECT AVG(nota) FROM evaluacion WHERE turno_id = t.id AND trabajador_id = ?) AS promedio
     FROM turno t JOIN horario_turno h ON h.id = t.horario_turno_id
     JOIN trabajador w ON w.id = ? AND w.area_id = h.area_id
     WHERE t.fecha BETWEEN ? AND ? ORDER BY t.fecha DESC, h.hora_inicio DESC`,
    [trabajadorId, trabajadorId, trabajadorId, trabajadorId, trabajadorId, desde, hasta],
  );
