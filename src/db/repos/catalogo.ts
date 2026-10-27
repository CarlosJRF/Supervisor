import { consultar, ejecutar } from '../conexion';
import type { Horario } from '../../dominio/turnos';

export interface Area {
  id: number;
  nombre: string;
  orden: number;
  activo: number;
}
export interface Trabajador {
  id: number;
  nombre: string;
  area_id: number;
  horario_turno_id: number | null;
  activo: number;
}
export interface Plantilla {
  id: number;
  area_id: number;
  nombre: string;
  descripcion: string;
  dificultad: number;
  recurrencia: 'diaria' | 'semanal';
  dias_semana: string;
  horario_turno_id: number | null;
  trabajador_id: number | null;
  activo: number;
}
interface FilaHorario {
  id: number;
  area_id: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  dias_semana: string;
  activo: number;
}
export type HorarioConEstado = Horario & { activo: number };

// ---- Áreas ----
/** Áreas visibles: el admin ve todas; el supervisor solo las asignadas. */
export function listarAreas(usuario?: { id: number; rol: string }, incluirInactivas = false) {
  const filtroActivo = incluirInactivas ? '' : 'AND a.activo = 1';
  if (!usuario || usuario.rol === 'admin')
    return consultar<Area>(`SELECT a.* FROM area a WHERE 1=1 ${filtroActivo} ORDER BY a.orden, a.nombre`);
  return consultar<Area>(
    `SELECT a.* FROM area a JOIN usuario_area ua ON ua.area_id = a.id
     WHERE ua.usuario_id = ? ${filtroActivo} ORDER BY a.orden, a.nombre`,
    [usuario.id],
  );
}
export const guardarArea = (a: { id?: number; nombre: string; orden: number; activo: boolean }) =>
  a.id
    ? ejecutar('UPDATE area SET nombre = ?, orden = ?, activo = ? WHERE id = ?', [a.nombre.trim(), a.orden, a.activo ? 1 : 0, a.id])
    : ejecutar('INSERT INTO area (nombre, orden) VALUES (?, ?)', [a.nombre.trim(), a.orden]);

// ---- Horarios ----
const aHorario = (f: FilaHorario): HorarioConEstado => ({
  id: f.id,
  areaId: f.area_id,
  nombre: f.nombre,
  horaInicio: f.hora_inicio,
  horaFin: f.hora_fin,
  diasSemana: f.dias_semana,
  activo: f.activo,
});
export async function listarHorarios(areaId?: number, incluirInactivos = false): Promise<HorarioConEstado[]> {
  const cond = [areaId ? 'area_id = ?' : '1=1', incluirInactivos ? '1=1' : 'activo = 1'].join(' AND ');
  const filas = await consultar<FilaHorario>(`SELECT * FROM horario_turno WHERE ${cond} ORDER BY hora_inicio`, areaId ? [areaId] : []);
  return filas.map(aHorario);
}
export const guardarHorario = (h: Omit<Horario, 'id'> & { id?: number; activo: boolean }) =>
  h.id
    ? ejecutar('UPDATE horario_turno SET area_id=?, nombre=?, hora_inicio=?, hora_fin=?, dias_semana=?, activo=? WHERE id=?', [
        h.areaId, h.nombre.trim(), h.horaInicio, h.horaFin, h.diasSemana, h.activo ? 1 : 0, h.id,
      ])
    : ejecutar('INSERT INTO horario_turno (area_id, nombre, hora_inicio, hora_fin, dias_semana) VALUES (?,?,?,?,?)', [
        h.areaId, h.nombre.trim(), h.horaInicio, h.horaFin, h.diasSemana,
      ]);

// ---- Trabajadores ----
export const listarTrabajadores = (areaId?: number, incluirInactivos = false) =>
  consultar<Trabajador>(
    `SELECT * FROM trabajador WHERE ${areaId ? 'area_id = ?' : '1=1'} ${incluirInactivos ? '' : 'AND activo = 1'} ORDER BY nombre`,
    areaId ? [areaId] : [],
  );
export const guardarTrabajador = (t: Omit<Trabajador, 'id' | 'activo'> & { id?: number; activo: boolean }) =>
  t.id
    ? ejecutar('UPDATE trabajador SET nombre=?, area_id=?, horario_turno_id=?, activo=? WHERE id=?', [
        t.nombre.trim(), t.area_id, t.horario_turno_id, t.activo ? 1 : 0, t.id,
      ])
    : ejecutar('INSERT INTO trabajador (nombre, area_id, horario_turno_id) VALUES (?,?,?)', [t.nombre.trim(), t.area_id, t.horario_turno_id]);

// ---- Plantillas de tareas ----
export const listarPlantillas = (areaId?: number, incluirInactivas = false) =>
  consultar<Plantilla>(
    `SELECT * FROM plantilla_tarea WHERE ${areaId ? 'area_id = ?' : '1=1'} ${incluirInactivas ? '' : 'AND activo = 1'} ORDER BY nombre`,
    areaId ? [areaId] : [],
  );
export const guardarPlantilla = (p: Omit<Plantilla, 'id' | 'activo'> & { id?: number; activo: boolean }) => {
  const v = [p.area_id, p.nombre.trim(), p.descripcion, p.dificultad, p.recurrencia, p.dias_semana, p.horario_turno_id, p.trabajador_id];
  return p.id
    ? ejecutar(
        'UPDATE plantilla_tarea SET area_id=?, nombre=?, descripcion=?, dificultad=?, recurrencia=?, dias_semana=?, horario_turno_id=?, trabajador_id=?, activo=? WHERE id=?',
        [...v, p.activo ? 1 : 0, p.id],
      )
    : ejecutar(
        'INSERT INTO plantilla_tarea (area_id, nombre, descripcion, dificultad, recurrencia, dias_semana, horario_turno_id, trabajador_id) VALUES (?,?,?,?,?,?,?,?)',
        v,
      );
};

export const listarCriterios = () =>
  consultar<{ id: number; nombre: string }>('SELECT id, nombre FROM criterio_habito WHERE activo = 1 ORDER BY orden');
