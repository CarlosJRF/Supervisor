import writeXlsxFile from 'write-excel-file/browser';
import { MEDALLA_TEXTO, type DatosReporte } from './reporte';

const titulo = (cols: string[]) => cols.map((value) => ({ value, fontWeight: 'bold' as const }));
const v = (x: string | number | null | undefined) => (x === null || x === undefined ? null : x);

export async function generarXlsx(d: DatosReporte): Promise<Blob> {
  return writeXlsxFile([
    {
      sheet: 'Resumen',
      data: [
        [{ value: 'Supervisor – Reporte', fontWeight: 'bold' }],
        ['Área', d.area],
        ['Desde', d.desde],
        ['Hasta', d.hasta],
        ['Tareas completadas', d.tareas.filter((t) => t.estado === 'completada').length],
        ['Tareas traspasadas', d.tareas.filter((t) => t.estado === 'traspasada').length],
        ['Evaluaciones', d.evaluaciones.length],
      ],
      columns: [{ width: 22 }, { width: 24 }],
    },
    {
      sheet: 'Ranking',
      data: [
        titulo(['Posición', 'Medalla', 'Trabajador', 'Puntos tareas', 'Promedio hábitos', 'Puntaje']),
        ...d.ranking.map((f) => [
          f.posicion,
          f.medalla ? MEDALLA_TEXTO[f.medalla] : '',
          f.nombre,
          f.puntosTareas,
          v(f.promedioHabitos === null ? null : Math.round(f.promedioHabitos * 10) / 10),
          Math.round(f.puntaje * 10) / 10,
        ]),
      ],
      columns: [{ width: 10 }, { width: 10 }, { width: 26 }, { width: 14 }, { width: 16 }, { width: 10 }],
    },
    {
      sheet: 'Tareas',
      data: [
        titulo(['Fecha', 'Turno', 'Tarea', 'Trabajador', 'Dificultad', 'Estado', 'Traspasos', 'Puntos']),
        ...d.tareas.map((t) => [t.fecha, t.turno, t.tarea, v(t.trabajador), t.dificultad, t.estado, t.traspasos, v(t.puntos)]),
      ],
      columns: [{ width: 12 }, { width: 12 }, { width: 30 }, { width: 24 }, { width: 10 }, { width: 12 }, { width: 10 }, { width: 8 }],
    },
    {
      sheet: 'Evaluaciones',
      data: [titulo(['Fecha', 'Turno', 'Trabajador', 'Criterio', 'Nota']), ...d.evaluaciones.map((e) => [e.fecha, e.turno, e.trabajador, e.criterio, e.nota])],
      columns: [{ width: 12 }, { width: 12 }, { width: 24 }, { width: 22 }, { width: 6 }],
    },
    {
      sheet: 'Asistencia',
      data: [titulo(['Fecha', 'Turno', 'Trabajador', 'Estado']), ...d.asistencia.map((a) => [a.fecha, a.turno, a.trabajador, a.estado])],
      columns: [{ width: 12 }, { width: 12 }, { width: 24 }, { width: 12 }],
    },
  ]).toBlob();
}
