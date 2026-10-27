import { consultar, ejecutar } from '../conexion';

export interface Config {
  peso_tareas: number;
  peso_habitos: number;
  bono_traspaso: number;
  tope_traspasos: number;
  minutos_aviso: number;
  minutos_bloqueo: number;
  umbral_bono: number;
  umbral_capacitacion: number;
}

export async function leerConfig(): Promise<Config> {
  const filas = await consultar<{ clave: string; valor: string }>('SELECT clave, valor FROM config');
  return Object.fromEntries(filas.map((f) => [f.clave, Number(f.valor)])) as unknown as Config;
}

export async function guardarConfig(c: Partial<Config>) {
  for (const [k, v] of Object.entries(c))
    await ejecutar('INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor', [
      k,
      String(v),
    ]);
}
