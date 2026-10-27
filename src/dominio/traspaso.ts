export interface TareaPendiente {
  id: number;
  plantillaId: number;
  trabajadorId: number | null;
  traspasos: number;
}

export interface TareaTraspasada {
  plantillaId: number;
  trabajadorId: number | null;
  traspasos: number;
  origenTareaId: number;
}

/** Copias que se crean en el turno siguiente a partir de las tareas no completadas. */
export function traspasar(pendientes: TareaPendiente[]): TareaTraspasada[] {
  return pendientes.map((t) => ({
    plantillaId: t.plantillaId,
    trabajadorId: t.trabajadorId,
    traspasos: t.traspasos + 1,
    origenTareaId: t.id,
  }));
}
