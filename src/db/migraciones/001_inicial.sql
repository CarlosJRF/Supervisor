CREATE TABLE IF NOT EXISTS usuario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin','supervisor')),
  pin_hash TEXT NOT NULL,
  pin_sal TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS area (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS usuario_area (
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  area_id INTEGER NOT NULL REFERENCES area(id),
  PRIMARY KEY (usuario_id, area_id)
);
CREATE TABLE IF NOT EXISTS horario_turno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER NOT NULL REFERENCES area(id),
  nombre TEXT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  dias_semana TEXT NOT NULL DEFAULT '12345',
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS trabajador (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  area_id INTEGER NOT NULL REFERENCES area(id),
  horario_turno_id INTEGER REFERENCES horario_turno(id),
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS plantilla_tarea (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER NOT NULL REFERENCES area(id),
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  dificultad INTEGER NOT NULL CHECK (dificultad BETWEEN 1 AND 5),
  recurrencia TEXT NOT NULL DEFAULT 'diaria' CHECK (recurrencia IN ('diaria','semanal')),
  dias_semana TEXT NOT NULL DEFAULT '1234567',
  horario_turno_id INTEGER REFERENCES horario_turno(id),
  trabajador_id INTEGER REFERENCES trabajador(id),
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS turno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  horario_turno_id INTEGER NOT NULL REFERENCES horario_turno(id),
  fecha TEXT NOT NULL,
  abierto_por INTEGER NOT NULL REFERENCES usuario(id),
  abierto_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  cerrado_por INTEGER REFERENCES usuario(id),
  cerrado_en TEXT,
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','cerrado')),
  UNIQUE (horario_turno_id, fecha)
);
CREATE TABLE IF NOT EXISTS tarea_turno (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turno_id INTEGER NOT NULL REFERENCES turno(id),
  plantilla_id INTEGER NOT NULL REFERENCES plantilla_tarea(id),
  trabajador_id INTEGER REFERENCES trabajador(id),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completada','traspasada')),
  traspasos INTEGER NOT NULL DEFAULT 0,
  origen_tarea_id INTEGER REFERENCES tarea_turno(id),
  completada_por INTEGER REFERENCES usuario(id),
  completada_en TEXT,
  puntos_otorgados INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tarea_turno_turno ON tarea_turno(turno_id);
CREATE INDEX IF NOT EXISTS idx_tarea_turno_trab ON tarea_turno(trabajador_id, estado);
CREATE TABLE IF NOT EXISTS asistencia (
  turno_id INTEGER NOT NULL REFERENCES turno(id),
  trabajador_id INTEGER NOT NULL REFERENCES trabajador(id),
  estado TEXT NOT NULL CHECK (estado IN ('presente','ausente','licencia')),
  PRIMARY KEY (turno_id, trabajador_id)
);
CREATE TABLE IF NOT EXISTS criterio_habito (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS evaluacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  turno_id INTEGER NOT NULL REFERENCES turno(id),
  trabajador_id INTEGER NOT NULL REFERENCES trabajador(id),
  criterio_id INTEGER NOT NULL REFERENCES criterio_habito(id),
  nota INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 7),
  evaluado_por INTEGER NOT NULL REFERENCES usuario(id),
  evaluado_en TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (turno_id, trabajador_id, criterio_id)
);
CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id INTEGER,
  detalle_json TEXT,
  en TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

INSERT OR IGNORE INTO criterio_habito (id, nombre, orden) VALUES
  (1, 'Puntualidad', 1), (2, 'Respeto', 2), (3, 'Presentación personal', 3);
INSERT OR IGNORE INTO config (clave, valor) VALUES
  ('peso_tareas', '0.6'), ('peso_habitos', '0.4'),
  ('bono_traspaso', '2'), ('tope_traspasos', '3'),
  ('minutos_aviso', '30'), ('minutos_bloqueo', '10'),
  ('umbral_bono', '80'), ('umbral_capacitacion', '40');
