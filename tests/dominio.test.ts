import { describe, expect, it } from 'vitest';
import { puntosTarea } from '../src/dominio/puntos';
import { calcularRanking, sugerencia } from '../src/dominio/ranking';
import { rangoPeriodo } from '../src/dominio/fechas';
import { formatoRestante, limitesTurno, turnoProgramado, type Horario } from '../src/dominio/turnos';
import { pendientesDeEvaluacion, puedeCerrar } from '../src/dominio/candado';
import { traspasar } from '../src/dominio/traspaso';

describe('puntosTarea', () => {
  it('usa la dificultad como puntos', () => expect(puntosTarea(3, 0)).toBe(3));
  it('suma +2 por traspaso', () => expect(puntosTarea(3, 2)).toBe(7));
  it('limita el bono a 3 traspasos', () => expect(puntosTarea(1, 10)).toBe(7));
  it('acota la dificultad a 1–5', () => {
    expect(puntosTarea(9, 0)).toBe(5);
    expect(puntosTarea(0, 0)).toBe(1);
  });
});

describe('calcularRanking', () => {
  const pesos = { tareas: 0.6, habitos: 0.4 };
  it('ordena por puntaje ponderado y asigna medallas', () => {
    const r = calcularRanking(
      [
        { trabajadorId: 1, nombre: 'Ana', puntosTareas: 10, notas: [7, 7] },
        { trabajadorId: 2, nombre: 'Beto', puntosTareas: 20, notas: [1] },
        { trabajadorId: 3, nombre: 'Caro', puntosTareas: 20, notas: [7] },
        { trabajadorId: 4, nombre: 'Dani', puntosTareas: 5, notas: [4] },
      ],
      pesos,
    );
    expect(r.map((f) => f.nombre)).toEqual(['Caro', 'Ana', 'Beto', 'Dani']);
    expect(r[0].puntaje).toBeCloseTo(100);
    expect(r[1].puntaje).toBeCloseTo(0.6 * 50 + 0.4 * 100);
    expect(r.map((f) => f.medalla)).toEqual(['oro', 'plata', 'bronce', null]);
  });
  it('sin notas usa solo tareas', () => {
    const [f] = calcularRanking([{ trabajadorId: 1, nombre: 'A', puntosTareas: 4, notas: [] }], pesos);
    expect(f.puntaje).toBe(100);
  });
  it('sin actividad no hay medalla', () => {
    const [f] = calcularRanking([{ trabajadorId: 1, nombre: 'A', puntosTareas: 0, notas: [] }], pesos);
    expect(f.medalla).toBeNull();
    expect(f.puntaje).toBe(0);
  });
  it('desempata por hábitos y luego por nombre', () => {
    const r = calcularRanking(
      [
        { trabajadorId: 1, nombre: 'Zoe', puntosTareas: 0, notas: [4] },
        { trabajadorId: 2, nombre: 'Ana', puntosTareas: 0, notas: [4] },
      ],
      { tareas: 1, habitos: 0 },
    );
    expect(r.map((f) => f.nombre)).toEqual(['Ana', 'Zoe']);
  });
  it('sugerencias por umbral', () => {
    expect(sugerencia(85)).toBe('bono');
    expect(sugerencia(30)).toBe('capacitacion');
    expect(sugerencia(60)).toBeNull();
  });
});

describe('fechas', () => {
  it('semana de lunes a domingo', () => {
    expect(rangoPeriodo('semana', new Date(2026, 9, 29))).toEqual({ desde: '2026-10-26', hasta: '2026-11-01' });
  });
  it('mes completo', () => {
    expect(rangoPeriodo('mes', new Date(2026, 1, 10))).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
  });
});

describe('turnos', () => {
  const manana: Horario = { id: 1, areaId: 1, nombre: 'Mañana', horaInicio: '08:00', horaFin: '16:00', diasSemana: '12345' };
  const noche: Horario = { id: 2, areaId: 1, nombre: 'Noche', horaInicio: '22:00', horaFin: '06:00', diasSemana: '1234567' };
  it('turno nocturno termina al día siguiente', () => {
    const { fin } = limitesTurno(noche, '2026-10-26');
    expect(fin.getDate()).toBe(27);
    expect(fin.getHours()).toBe(6);
  });
  it('detecta el turno en curso', () => {
    const t = turnoProgramado([manana, noche], new Date(2026, 9, 26, 10, 0));
    expect(t?.horario.nombre).toBe('Mañana');
    expect(t?.enCurso).toBe(true);
  });
  it('detecta un turno nocturno iniciado ayer', () => {
    const t = turnoProgramado([manana, noche], new Date(2026, 9, 27, 3, 0));
    expect(t?.horario.nombre).toBe('Noche');
    expect(t?.fecha).toBe('2026-10-26');
  });
  it('sugiere el próximo turno si no hay uno en curso', () => {
    const t = turnoProgramado([manana], new Date(2026, 9, 26, 18, 0));
    expect(t?.fecha).toBe('2026-10-27');
    expect(t?.enCurso).toBe(false);
  });
  it('formatea el tiempo restante', () => {
    expect(formatoRestante(3_725_000)).toBe('01:02:05');
    expect(formatoRestante(-60_000)).toBe('-00:01:00');
  });
});

describe('candado de cierre', () => {
  it('bloquea por asistencia sin marcar o notas incompletas', () => {
    const estados = [
      { trabajadorId: 1, asistencia: 'presente' as const, criteriosEvaluados: 3 },
      { trabajadorId: 2, asistencia: 'presente' as const, criteriosEvaluados: 1 },
      { trabajadorId: 3, asistencia: null, criteriosEvaluados: 0 },
      { trabajadorId: 4, asistencia: 'licencia' as const, criteriosEvaluados: 0 },
    ];
    expect(pendientesDeEvaluacion(estados, 3)).toEqual([2, 3]);
    expect(puedeCerrar(estados, 3)).toBe(false);
    expect(puedeCerrar(estados.filter((e) => e.trabajadorId !== 2 && e.trabajadorId !== 3), 3)).toBe(true);
  });
});

describe('traspaso', () => {
  it('incrementa traspasos y guarda el origen', () => {
    expect(traspasar([{ id: 9, plantillaId: 2, trabajadorId: 5, traspasos: 1 }])).toEqual([
      { plantillaId: 2, trabajadorId: 5, traspasos: 2, origenTareaId: 9 },
    ]);
  });
});
