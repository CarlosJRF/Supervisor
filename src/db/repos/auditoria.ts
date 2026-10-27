import { ejecutar } from '../conexion';

export const auditar = (usuarioId: number | null, accion: string, entidad: string, entidadId?: number, detalle?: unknown) =>
  ejecutar('INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle_json) VALUES (?, ?, ?, ?, ?)', [
    usuarioId,
    accion,
    entidad,
    entidadId ?? null,
    detalle === undefined ? null : JSON.stringify(detalle),
  ]);
