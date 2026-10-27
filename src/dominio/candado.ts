export type EstadoAsistencia = 'presente' | 'ausente' | 'licencia';

export interface EstadoEvaluacion {
  trabajadorId: number;
  asistencia: EstadoAsistencia | null;
  criteriosEvaluados: number; // cantidad de criterios con nota
}

/** Trabajadores que aún bloquean el cierre del turno. Ver CLAUDE.md §6.5. */
export function pendientesDeEvaluacion(estados: EstadoEvaluacion[], totalCriterios: number): number[] {
  return estados
    .filter((e) => e.asistencia === null || (e.asistencia === 'presente' && e.criteriosEvaluados < totalCriterios))
    .map((e) => e.trabajadorId);
}

export function puedeCerrar(estados: EstadoEvaluacion[], totalCriterios: number): boolean {
  return pendientesDeEvaluacion(estados, totalCriterios).length === 0;
}
