import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';

const NOMBRE = 'supervisor';
const esWeb = Capacitor.getPlatform() === 'web';
const sqlite = new SQLiteConnection(CapacitorSQLite);
let db: SQLiteDBConnection | null = null;
let abriendo: Promise<SQLiteDBConnection> | null = null;

const migraciones = import.meta.glob('./migraciones/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

async function iniciarWeb() {
  const { defineCustomElements } = await import('jeep-sqlite/loader');
  await defineCustomElements(window);
  document.body.appendChild(document.createElement('jeep-sqlite'));
  await customElements.whenDefined('jeep-sqlite');
  await sqlite.initWebStore();
}

async function migrar(c: SQLiteDBConnection) {
  await c.execute('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);', false);
  const r = await c.query('SELECT COALESCE(MAX(version), 0) AS v FROM schema_version;');
  const actual = Number(r.values?.[0]?.v ?? 0);
  const pendientes = Object.keys(migraciones)
    .map((ruta) => ({ ruta, version: Number(ruta.match(/(\d+)_/)?.[1] ?? 0) }))
    .filter((m) => m.version > actual)
    .sort((a, b) => a.version - b.version);
  for (const m of pendientes) {
    await c.execute(migraciones[m.ruta], true);
    await c.run('INSERT INTO schema_version (version) VALUES (?);', [m.version], false);
  }
}

export async function abrirDb(): Promise<SQLiteDBConnection> {
  if (db) return db;
  abriendo ??= (async () => {
    if (esWeb) await iniciarWeb();
    const consistente = (await sqlite.checkConnectionsConsistency()).result;
    const existe = (await sqlite.isConnection(NOMBRE, false)).result;
    const c =
      consistente && existe
        ? await sqlite.retrieveConnection(NOMBRE, false)
        : await sqlite.createConnection(NOMBRE, false, 'no-encryption', 1, false);
    await c.open();
    await c.execute('PRAGMA foreign_keys = ON;', false);
    await migrar(c);
    await persistir();
    db = c;
    return c;
  })();
  return abriendo;
}

/** En el navegador la base vive en IndexedDB y hay que guardarla tras cada escritura. */
async function persistir() {
  if (esWeb) await sqlite.saveToStore(NOMBRE);
}

export async function consultar<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await (await abrirDb()).query(sql, params as any[]);
  return (r.values ?? []) as T[];
}

export async function uno<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await consultar<T>(sql, params))[0] ?? null;
}

/** Ejecuta una escritura y devuelve el último id insertado. */
export async function ejecutar(sql: string, params: unknown[] = []): Promise<number> {
  const r = await (await abrirDb()).run(sql, params as any[], false);
  if (!enTransaccion) await persistir();
  return r.changes?.lastId ?? 0;
}

let enTransaccion = false;

/** Agrupa varias escrituras de forma atómica. No anidar. */
export async function transaccion<T>(fn: () => Promise<T>): Promise<T> {
  const c = await abrirDb();
  await c.beginTransaction();
  enTransaccion = true;
  try {
    const r = await fn();
    await c.commitTransaction();
    return r;
  } catch (e) {
    await c.rollbackTransaction();
    throw e;
  } finally {
    enTransaccion = false;
    await persistir();
  }
}

/** Exporta todas las tablas como JSON (respaldo). */
export async function exportarJson(): Promise<unknown> {
  return (await (await abrirDb()).exportToJson('full')).export;
}

export async function importarJson(json: any): Promise<void> {
  const c = await abrirDb();
  await c.close();
  await sqlite.closeConnection(NOMBRE, false);
  db = null;
  abriendo = null;
  await sqlite.importFromJson(JSON.stringify({ ...json, database: NOMBRE, overwrite: true, mode: 'full' }));
  await abrirDb();
}
