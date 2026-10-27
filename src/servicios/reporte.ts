import { consultar } from '../db/conexion';
import { rankingDeArea } from '../db/repos/ranking';
import type { FilaRanking } from '../dominio/ranking';

export interface DatosReporte {
  area: string;
  desde: string;
  hasta: string;
  ranking: FilaRanking[];
  tareas: { fecha: string; turno: string; tarea: string; trabajador: string | null; dificultad: number; estado: string; traspasos: number; puntos: number | null }[];
  evaluaciones: { fecha: string; turno: string; trabajador: string; criterio: string; nota: number }[];
  asistencia: { fecha: string; turno: string; trabajador: string; estado: string }[];
}


export async function datosReporte(areaId: number, area: string, desde: string, hasta: string): Promise<DatosReporte> {
  const p = [areaId, desde, hasta];
  const [ranking, tareas, evaluaciones, asistencia] = await Promise.all([
    rankingDeArea(areaId, desde, hasta),
    consultar<DatosReporte['tareas'][number]>(
      `SELECT t.fecha, h.nombre AS turno, p.nombre AS tarea, w.nombre AS trabajador, p.dificultad, tt.estado, tt.traspasos,
              tt.puntos_otorgados AS puntos
       FROM tarea_turno tt JOIN plantilla_tarea p ON p.id = tt.plantilla_id LEFT JOIN trabajador w ON w.id = tt.trabajador_id
       JOIN turno t ON t.id = tt.turno_id JOIN horario_turno h ON h.id = t.horario_turno_id
       WHERE h.area_id = ? AND t.fecha BETWEEN ? AND ? ORDER BY t.fecha, h.hora_inicio, w.nombre`,
      p,
    ),
    consultar<DatosReporte['evaluaciones'][number]>(
      `SELECT t.fecha, h.nombre AS turno, w.nombre AS trabajador, c.nombre AS criterio, e.nota
       FROM evaluacion e JOIN trabajador w ON w.id = e.trabajador_id JOIN criterio_habito c ON c.id = e.criterio_id
       JOIN turno t ON t.id = e.turno_id JOIN horario_turno h ON h.id = t.horario_turno_id
       WHERE h.area_id = ? AND t.fecha BETWEEN ? AND ? ORDER BY t.fecha, h.hora_inicio, w.nombre, c.orden`,
      p,
    ),
    consultar<DatosReporte['asistencia'][number]>(
      `SELECT t.fecha, h.nombre AS turno, w.nombre AS trabajador, a.estado
       FROM asistencia a JOIN trabajador w ON w.id = a.trabajador_id
       JOIN turno t ON t.id = a.turno_id JOIN horario_turno h ON h.id = t.horario_turno_id
       WHERE h.area_id = ? AND t.fecha BETWEEN ? AND ? ORDER BY t.fecha, h.hora_inicio, w.nombre`,
      p,
    ),
  ]);
  return { area, desde, hasta, ranking, tareas, evaluaciones, asistencia };
}

export const MEDALLA_TEXTO: Record<string, string> = { oro: 'Oro', plata: 'Plata', bronce: 'Bronce' };

export const nombreArchivo = (d: DatosReporte, ext: string) =>
  `supervisor-${d.area.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}-${d.desde}_${d.hasta}.${ext}`;

