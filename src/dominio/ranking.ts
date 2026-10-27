export type Medalla = 'oro' | 'plata' | 'bronce' | null;

export interface EntradaRanking {
  trabajadorId: number;
  nombre: string;
  puntosTareas: number;
  notas: number[]; // notas 1–7 del período
}

export interface FilaRanking extends EntradaRanking {
  posicion: number;
  tareasNorm: number; // 0–100
  habitosNorm: number | null; // 0–100, null sin notas
  promedioHabitos: number | null; // 1–7
  puntaje: number; // 0–100
  medalla: Medalla;
}

export interface Pesos {
  tareas: number;
  habitos: number;
}

const MEDALLAS: Medalla[] = ['oro', 'plata', 'bronce'];

export function promedio(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Ranking ponderado de un área en un período. Ver CLAUDE.md §6.4. */
export function calcularRanking(entradas: EntradaRanking[], pesos: Pesos): FilaRanking[] {
  const suma = pesos.tareas + pesos.habitos || 1;
  const wT = pesos.tareas / suma;
  const wH = pesos.habitos / suma;
  const max = Math.max(0, ...entradas.map((e) => e.puntosTareas));

  const filas = entradas.map((e) => {
    const tareasNorm = max > 0 ? (e.puntosTareas / max) * 100 : 0;
    const prom = promedio(e.notas);
    const habitosNorm = prom === null ? null : ((prom - 1) / 6) * 100;
    const puntaje = habitosNorm === null ? tareasNorm : wT * tareasNorm + wH * habitosNorm;
    return { ...e, tareasNorm, habitosNorm, promedioHabitos: prom, puntaje, posicion: 0, medalla: null as Medalla };
  });

  filas.sort(
    (a, b) =>
      b.puntaje - a.puntaje ||
      (b.promedioHabitos ?? 0) - (a.promedioHabitos ?? 0) ||
      a.nombre.localeCompare(b.nombre, 'es'),
  );

  filas.forEach((f, i) => {
    f.posicion = i + 1;
    // Sin actividad no hay medalla.
    f.medalla = i < 3 && (f.puntosTareas > 0 || f.promedioHabitos !== null) ? MEDALLAS[i] : null;
  });
  return filas;
}

export type Sugerencia = 'bono' | 'capacitacion' | null;

export function sugerencia(puntaje: number, umbralBono = 80, umbralCapacitacion = 40): Sugerencia {
  if (puntaje >= umbralBono) return 'bono';
  if (puntaje <= umbralCapacitacion) return 'capacitacion';
  return null;
}
