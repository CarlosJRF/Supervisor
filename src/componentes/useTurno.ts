import { useEstado } from '../estado';
import { useDatos } from './ui';
import { pendientesDelTurno, turnoAbierto, type Turno } from '../db/repos/turnos';
import { leerConfig, type Config } from '../db/repos/config';

export interface DatosTurno {
  turno: Turno | null;
  pendientes: number[];
  total: number;
  config: Config;
}

/** Turno abierto del área seleccionada con sus evaluaciones pendientes. */
export function useTurno(): [DatosTurno | undefined, () => void] {
  const { areaId, version } = useEstado();
  return useDatos(async () => {
    const config = await leerConfig();
    const turno = areaId ? await turnoAbierto(areaId) : null;
    const { ids, total } = turno ? await pendientesDelTurno(turno.id) : { ids: [], total: 0 };
    return { turno, pendientes: ids, total, config };
  }, [areaId, version]);
}
