import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import initSqlJs, { type Database } from 'sql.js';

// Reemplaza la conexión de Capacitor por SQLite en memoria (sql.js) para probar el SQL real.
let db: Database;
vi.mock('../src/db/conexion', () => {
  const consultar = async (sql: string, params: unknown[] = []) => {
    const st = db.prepare(sql);
    st.bind(params as any);
    const filas: Record<string, unknown>[] = [];
    while (st.step()) filas.push(st.getAsObject());
    st.free();
    return filas;
  };
  return {
    consultar,
    uno: async (sql: string, params: unknown[] = []) => (await consultar(sql, params))[0] ?? null,
    ejecutar: async (sql: string, params: unknown[] = []) => {
      db.run(sql, params as any);
      return Number(db.exec('SELECT last_insert_rowid()')[0].values[0][0]);
    },
    transaccion: async <T>(fn: () => Promise<T>) => {
      db.run('BEGIN');
      try {
        const r = await fn();
        db.run('COMMIT');
        return r;
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      }
    },
  };
});

const turnos = await import('../src/db/repos/turnos');
const catalogo = await import('../src/db/repos/catalogo');
const { rankingDeArea } = await import('../src/db/repos/ranking');

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.exec(readFileSync('src/db/migraciones/001_inicial.sql', 'utf8'));
  db.run(`INSERT INTO usuario (id, nombre, rol, pin_hash, pin_sal) VALUES (1, 'Admin', 'admin', 'x', 'y')`);
});

describe('flujo completo de un turno', () => {
  let area: number, horario: number, ana: number, beto: number, t1: number;

  it('configura catálogo', async () => {
    area = await catalogo.guardarArea({ nombre: 'Cocina', orden: 0, activo: true });
    horario = await catalogo.guardarHorario({ areaId: area, nombre: 'Mañana', horaInicio: '08:00', horaFin: '16:00', diasSemana: '1234567', activo: true });
    ana = await catalogo.guardarTrabajador({ nombre: 'Ana', area_id: area, horario_turno_id: null, activo: true });
    beto = await catalogo.guardarTrabajador({ nombre: 'Beto', area_id: area, horario_turno_id: null, activo: true });
    for (const [nombre, dif, resp] of [['Limpiar campana', 4, ana], ['Picar verduras', 2, beto], ['Inventario', 3, null]] as const)
      await catalogo.guardarPlantilla({
        area_id: area, nombre, descripcion: '', dificultad: dif, recurrencia: 'diaria', dias_semana: '1234567',
        horario_turno_id: null, trabajador_id: resp, activo: true,
      });
    expect((await catalogo.listarPlantillas(area)).length).toBe(3);
  });

  it('abre el turno y genera tareas desde plantillas', async () => {
    t1 = await turnos.abrirTurno(horario, '2026-10-26', 1);
    const tareas = await turnos.tareasDelTurno(t1);
    expect(tareas).toHaveLength(3);
    await expect(turnos.abrirTurno(horario, '2026-10-27', 1)).rejects.toThrow(/Ya hay un turno abierto/);
  });

  it('no permite completar tareas sin responsable', async () => {
    const inv = (await turnos.tareasDelTurno(t1)).find((t) => t.nombre === 'Inventario')!;
    await expect(turnos.completarTarea(inv.id, 1)).rejects.toThrow(/Asigna un trabajador/);
  });

  it('completa una tarea otorgando puntos por dificultad', async () => {
    const campana = (await turnos.tareasDelTurno(t1)).find((t) => t.nombre === 'Limpiar campana')!;
    await turnos.completarTarea(campana.id, 1);
    const despues = (await turnos.tareasDelTurno(t1)).find((t) => t.id === campana.id)!;
    expect(despues.puntos_otorgados).toBe(4);
  });

  it('bloquea el cierre hasta evaluar a todos', async () => {
    await expect(turnos.cerrarTurno(t1, 1)).rejects.toThrow(/Faltan 2 evaluaciones/);
    await turnos.marcarAsistencia(t1, ana, 'presente');
    for (const c of [1, 2, 3]) await turnos.calificar(t1, ana, c, 7, 1);
    await turnos.marcarAsistencia(t1, beto, 'presente');
    await turnos.calificar(t1, beto, 1, 5, 1);
    expect((await turnos.pendientesDelTurno(t1)).ids).toEqual([beto]);
    await turnos.marcarAsistencia(t1, beto, 'licencia'); // borra sus notas y lo excluye
    expect((await turnos.pendientesDelTurno(t1)).ids).toEqual([]);
  });

  it('cierra y traspasa las tareas pendientes al siguiente turno con bono', async () => {
    const { traspasadas } = await turnos.cerrarTurno(t1, 1);
    expect(traspasadas).toBe(2);
    const t2 = await turnos.abrirTurno(horario, '2026-10-27', 1);
    const tareas = await turnos.tareasDelTurno(t2);
    expect(tareas).toHaveLength(5); // 3 del día + 2 traspasadas
    const picar = tareas.find((t) => t.nombre === 'Picar verduras' && t.traspasos === 1)!;
    expect(picar.trabajador_id).toBe(beto);
    await turnos.completarTarea(picar.id, 1);
    expect((await turnos.tareasDelTurno(t2)).find((t) => t.id === picar.id)!.puntos_otorgados).toBe(2 + 2);
  });

  it('calcula el ranking del período', async () => {
    const r = await rankingDeArea(area, '2026-10-26', '2026-11-01');
    expect(r.map((f) => [f.nombre, f.puntosTareas, f.medalla])).toEqual([
      ['Ana', 4, 'oro'],
      ['Beto', 4, 'plata'],
    ]);
    expect(r[0].puntaje).toBeCloseTo(100);
  });
});
