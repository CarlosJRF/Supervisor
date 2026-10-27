export const BONO_TRASPASO = 2;
export const TOPE_TRASPASOS = 3;

/** Puntos de una tarea completada: dificultad (1–5) + bono por cada traspaso, con tope. */
export function puntosTarea(
  dificultad: number,
  traspasos: number,
  bono = BONO_TRASPASO,
  tope = TOPE_TRASPASOS,
): number {
  const d = Math.min(5, Math.max(1, Math.round(dificultad)));
  return d + bono * Math.min(Math.max(0, traspasos), tope);
}
