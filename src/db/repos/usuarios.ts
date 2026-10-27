import { consultar, ejecutar, transaccion, uno } from '../conexion';
import { hashPin, verificarPin } from '../../servicios/auth';
import { auditar } from './auditoria';

export type Rol = 'admin' | 'supervisor';
export interface Usuario {
  id: number;
  nombre: string;
  rol: Rol;
  activo: number;
}

export const hayUsuarios = async () => ((await uno<{ n: number }>('SELECT COUNT(*) AS n FROM usuario'))?.n ?? 0) > 0;

export const listarUsuarios = (soloActivos = false) =>
  consultar<Usuario>(
    `SELECT id, nombre, rol, activo FROM usuario ${soloActivos ? 'WHERE activo = 1' : ''} ORDER BY rol, nombre`,
  );

export async function crearUsuario(nombre: string, rol: Rol, pin: string, areaIds: number[] = []): Promise<number> {
  const { hash, sal } = await hashPin(pin);
  return transaccion(async () => {
    const id = await ejecutar('INSERT INTO usuario (nombre, rol, pin_hash, pin_sal) VALUES (?, ?, ?, ?)', [
      nombre.trim(),
      rol,
      hash,
      sal,
    ]);
    for (const a of areaIds) await ejecutar('INSERT INTO usuario_area (usuario_id, area_id) VALUES (?, ?)', [id, a]);
    return id;
  });
}

export async function actualizarUsuario(id: number, datos: { nombre: string; activo: boolean; areaIds: number[]; pin?: string }) {
  const credenciales = datos.pin ? await hashPin(datos.pin) : null;
  await transaccion(async () => {
    await ejecutar('UPDATE usuario SET nombre = ?, activo = ? WHERE id = ?', [datos.nombre.trim(), datos.activo ? 1 : 0, id]);
    if (credenciales)
      await ejecutar('UPDATE usuario SET pin_hash = ?, pin_sal = ? WHERE id = ?', [credenciales.hash, credenciales.sal, id]);
    await ejecutar('DELETE FROM usuario_area WHERE usuario_id = ?', [id]);
    for (const a of datos.areaIds) await ejecutar('INSERT INTO usuario_area (usuario_id, area_id) VALUES (?, ?)', [id, a]);
  });
}

export async function areasDeUsuario(id: number): Promise<number[]> {
  return (await consultar<{ area_id: number }>('SELECT area_id FROM usuario_area WHERE usuario_id = ?', [id])).map(
    (r) => r.area_id,
  );
}

export async function ingresar(id: number, pin: string): Promise<Usuario | null> {
  const u = await uno<Usuario & { pin_hash: string; pin_sal: string }>(
    'SELECT * FROM usuario WHERE id = ? AND activo = 1',
    [id],
  );
  if (!u || !(await verificarPin(pin, u.pin_hash, u.pin_sal))) {
    await auditar(id, 'ingreso_fallido', 'usuario', id);
    return null;
  }
  await auditar(id, 'ingreso', 'usuario', id);
  return { id: u.id, nombre: u.nombre, rol: u.rol, activo: u.activo };
}
