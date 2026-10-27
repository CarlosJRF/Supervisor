import { useEffect, useState } from 'preact/hooks';
import type { Usuario } from './db/repos/usuarios';
import type { Area } from './db/repos/catalogo';

export interface Estado {
  usuario: Usuario | null;
  areas: Area[];
  areaId: number | null;
  version: number; // se incrementa para forzar recargas de datos
}

let estado: Estado = { usuario: null, areas: [], areaId: null, version: 0 };
const oyentes = new Set<() => void>();

export const leerEstado = () => estado;

export function cambiar(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial };
  oyentes.forEach((f) => f());
}

export const refrescar = () => cambiar({ version: estado.version + 1 });

export function useEstado(): Estado {
  const [, forzar] = useState(0);
  useEffect(() => {
    const f = () => forzar((n) => n + 1);
    oyentes.add(f);
    return () => void oyentes.delete(f);
  }, []);
  return estado;
}

export const esAdmin = () => estado.usuario?.rol === 'admin';

// ---- Avisos breves (toast) ----
export interface Toast {
  texto: string;
  accion?: { texto: string; fn: () => void };
}
let toast: Toast | null = null;
let temporizador: ReturnType<typeof setTimeout> | undefined;
const oyentesToast = new Set<() => void>();

export function avisar(texto: string, accion?: Toast['accion'], ms = 4000) {
  toast = { texto, accion };
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    toast = null;
    oyentesToast.forEach((f) => f());
  }, ms);
  oyentesToast.forEach((f) => f());
}

export function useToast(): Toast | null {
  const [, forzar] = useState(0);
  useEffect(() => {
    const f = () => forzar((n) => n + 1);
    oyentesToast.add(f);
    return () => void oyentesToast.delete(f);
  }, []);
  return toast;
}

/** Ejecuta una acción asíncrona y muestra el error como aviso. */
export async function intentar<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    avisar(e instanceof Error ? e.message : String(e));
    return undefined;
  }
}
