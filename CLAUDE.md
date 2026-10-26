# Supervisor — Plan de ejecución

App Android (celular y tablet) para supervisar tareas, productividad y hábitos del personal. Funciona **100 % offline** en **un solo dispositivo compartido** por uno o más supervisores. Toda la interfaz y el código de dominio en **español**.

Especificación original: `docs/especificacion.md`.

---

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Tecnología | **Capacitor 6 + Vite + TypeScript + Preact** → APK Android |
| Dispositivos | 1 dispositivo; varios supervisores con PIN |
| Datos | SQLite local (`@capacitor-community/sqlite`). Sin nube. Respaldo/restauración por archivo |
| Ranking | Puntaje ponderado configurable (por defecto 60 % tareas / 40 % hábitos) |
| Período del ranking | Selector Día / Semana / Mes (por defecto Semana) |
| Tareas | Plantillas recurrentes asignadas a un trabajador (o al área) |
| Dificultad | Escala fija 1–5 = 1–5 puntos |
| Tareas incumplidas | Pasan al turno siguiente con **+2 puntos** de recompensa; aviso al supervisor para reasignar |
| Turnos | Horarios fijos configurados por área |
| Evaluación de hábitos | Cada turno, todo el personal del turno; se puede marcar **Ausente / Licencia** |
| Exportación | `.xlsx` y `.pdf` generados en el equipo + menú Compartir de Android |
| Estética | Minimalista blanco y negro, “hoja en un portapapeles” |

---

## 2. Stack y dependencias

- **Vite + TypeScript (strict)**, **Preact** (~4 KB) con `preact/hooks`. Router propio por hash (sin librerías).
- **Capacitor 6**: `@capacitor/android`, `@capacitor/app` (botón atrás), `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/local-notifications`, `@capacitor/preferences`.
- **SQLite**: `@capacitor-community/sqlite` (nativo) + `jeep-sqlite` para desarrollo en navegador.
- **Exportación**: `write-excel-file` (xlsx liviano) y `jspdf` + `jspdf-autotable`. Ambos se cargan con `import()` dinámico solo al exportar.
- **Pruebas**: Vitest (lógica de dominio) y Playwright opcional para la versión web.
- **Sin** frameworks CSS, sin fuentes web, sin imágenes rasterizadas. Íconos en SVG inline mínimos.

Objetivo de rendimiento: bundle inicial < 80 KB gzip, primera pantalla < 1 s en un equipo de gama baja.

---

## 3. Diseño visual — “hoja en un portapapeles”

- Fondo de pantalla gris muy claro (`#e9e9e9`) que simula el portapapeles; el contenido va en una **hoja blanca** centrada (`#fff`) con borde negro de 1 px y sombra mínima.
- Barra superior negra (la “pinza”) con el nombre del área/turno en blanco.
- Texto negro `#111`; gris `#666` solo para datos secundarios. **Sin colores**. El estado de alerta se expresa con inversión (fondo negro, texto blanco) o trama rayada, nunca rojo.
- Tipografía del sistema (`system-ui`); números y contadores en `ui-monospace` con `font-variant-numeric: tabular-nums`.
- Listas con líneas horizontales finas, como renglones de un formulario. Casillas de verificación cuadradas dibujadas con CSS.
- Medallero monocromo:
  - **Oro (1.º)**: círculo negro relleno con “1”.
  - **Plata (2.º)**: círculo con trama de líneas con “2”.
  - **Bronce (3.º)**: círculo con contorno con “3”.
- Botones: rectángulo con borde negro 1.5 px; primario invertido (negro/blanco). Área táctil mínima 48 px.
- Responsive: en celular una columna; en tablet (≥ 768 px) dos columnas (lista + detalle).
- Respeta tamaño de fuente del sistema. Sin animaciones salvo transiciones de 100 ms.
- Variables CSS en `:root` en `src/styles/tokens.css`. Un único archivo `app.css` (< 10 KB).

---

## 4. Roles y acceso

- **Administrador**: todo lo del supervisor + configuración (áreas, turnos, trabajadores, plantillas de tareas, ponderaciones, supervisores, respaldo).
- **Supervisor**: abre/opera/cierra turnos, marca tareas, evalúa hábitos, ve ranking y exporta.
- Ingreso con selección de usuario + **PIN de 4–6 dígitos** (hash PBKDF2 con sal, Web Crypto). El primer arranque obliga a crear el administrador.
- Sesión se bloquea tras 10 min de inactividad (configurable); bloquear **no** cierra el turno.

---

## 5. Modelo de datos (SQLite)

```
usuario            (id, nombre, rol['admin'|'supervisor'], pin_hash, pin_sal, activo)
area               (id, nombre, orden, activo)                       -- Cocina, Salón, Limpieza…
trabajador         (id, nombre, area_id, activo, creado_en)
horario_turno      (id, area_id, nombre, hora_inicio, hora_fin, dias_semana)  -- ej. "Mañana" 08:00–16:00, L-V
plantilla_tarea    (id, area_id, nombre, descripcion, dificultad[1-5],
                    recurrencia['diaria'|'semanal'], dias_semana, horario_turno_id NULL,
                    trabajador_id NULL, activo)
turno              (id, horario_turno_id, fecha, abierto_por, abierto_en,
                    cerrado_por NULL, cerrado_en NULL, estado['abierto'|'cerrado'])
tarea_turno        (id, turno_id, plantilla_id, trabajador_id NULL,
                    estado['pendiente'|'completada'|'traspasada'],
                    traspasos INT DEFAULT 0, origen_tarea_id NULL,
                    completada_por NULL, completada_en NULL, puntos_otorgados NULL)
asistencia         (turno_id, trabajador_id, estado['presente'|'ausente'|'licencia'])
criterio_habito    (id, nombre, orden, activo)  -- Puntualidad, Respeto, Presentación personal
evaluacion         (id, turno_id, trabajador_id, criterio_id, nota[1-7], evaluado_por, evaluado_en)
config             (clave, valor)  -- peso_tareas=0.6, peso_habitos=0.4, bono_traspaso=2, minutos_aviso=30…
auditoria          (id, usuario_id, accion, entidad, entidad_id, detalle_json, en)
```

- Migraciones versionadas en `src/db/migraciones/NNN_nombre.sql`; tabla `schema_version`.
- Toda escritura pasa por repositorios en `src/db/repos/*.ts`; ningún componente ejecuta SQL directo.
- Los criterios de hábitos se guardan en tabla (no hardcode) para poder editarlos más adelante, aunque la v1 trae los tres fijos.

---

## 6. Reglas de negocio

### 6.1 Puntos de tareas
- Al completar: `puntos_otorgados = dificultad + bono_traspaso × traspasos` (bono por defecto 2).
- Puntaje de tareas del trabajador en un período: `Σ puntos_otorgados`.

### 6.2 Traspaso de tareas incumplidas
- Al **cerrar** un turno, cada `tarea_turno` pendiente pasa a `traspasada` y se crea una copia en el **siguiente turno del mismo horario/área** con `traspasos + 1` y `origen_tarea_id`.
- Al abrir ese turno aparece el aviso **“Tareas sin completar del turno anterior”** con la lista y la opción de **reasignar** cada una (mismo trabajador por defecto).
- El bono es acumulativo por cada traspaso (tope configurable, por defecto 3 traspasos = +6).
- Los reportes muestran las tareas traspasadas para detectar incumplimientos.

### 6.3 Evaluación de hábitos
- Por cada trabajador del área del turno: estado de asistencia + nota 1–7 por criterio (solo si está **presente**).
- Ausente/Licencia excluye al trabajador de la evaluación de ese turno y no afecta su promedio.

### 6.4 Puntaje ponderado y ranking
Por área y período (día/semana/mes):
```
T_norm = (puntos_tareas / max_puntos_tareas_del_área_en_el_período) × 100   (0 si max = 0)
H_norm = ((promedio_notas − 1) / 6) × 100                                   (sin notas → se omite y se usa solo T)
Puntaje = peso_tareas × T_norm + peso_habitos × H_norm                     (pesos suman 1, editables)
```
- Orden descendente; desempate por mayor promedio de hábitos, luego por nombre.
- Medallas a los tres primeros de cada área. La lógica vive en `src/dominio/ranking.ts` como funciones puras con pruebas unitarias.

### 6.5 Contador y candado de cierre
- **Banner superior** fijo durante el turno abierto: tiempo restante hasta `hora_fin` + “N evaluaciones pendientes”. Faltando `minutos_aviso` (30) se invierte (fondo negro); pasada la hora de fin muestra “TURNO VENCIDO — evaluaciones pendientes”.
- Notificaciones locales a los 30 y 10 min antes del cierre si hay pendientes.
- **Cerrar turno** solo se habilita si **todos** los trabajadores del área tienen asistencia marcada y, los presentes, todas sus notas.
- Intentar cerrar sesión, cambiar de usuario o salir con el botón atrás con turno abierto y pendientes muestra un diálogo de bloqueo que lleva a la lista de pendientes. (Android no permite impedir que se mate la app; si se cierra a la fuerza, al volver el turno sigue abierto y el banner reaparece.)
- Todo cierre y reapertura queda en `auditoria`. Solo el admin puede reabrir un turno cerrado.

---

## 7. Pantallas

1. **Primer arranque**: crear administrador + áreas iniciales.
2. **Ingreso**: lista de usuarios + teclado PIN.
3. **Panel** (inicio): pestañas por área, turno actual, banner, accesos a Tareas / Evaluar / Ranking.
4. **Turno – Tareas**: checklist de tareas del turno agrupadas por trabajador; tocar = completar (con deshacer 5 s). Aviso de traspasadas al inicio.
5. **Turno – Evaluación**: un trabajador por fila; asistencia (P/A/L) y botones 1–7 por criterio. Progreso “12/15”.
6. **Cerrar turno**: resumen (tareas completadas/traspasadas, puntos, promedio hábitos) + botón de cierre o lista de bloqueos.
7. **Ranking y medallero**: pestañas de área, selector Día/Semana/Mes, podio + tabla.
8. **Ficha del trabajador**: historial de puntos, notas y asistencia; sugerencia “apto para bono” / “requiere capacitación” según umbrales configurables.
9. **Reportes / Exportar**: rango de fechas y área → `.xlsx` o `.pdf` → Compartir.
10. **Administración**: áreas, horarios, trabajadores, plantillas de tareas, supervisores, ponderaciones y umbrales, respaldo/restauración.

---

## 8. Exportación y respaldo

- **Excel (.xlsx)**: hojas `Resumen`, `Ranking`, `Tareas`, `Evaluaciones`, `Asistencia`. Se abre directamente en Google Sheets desde Drive.
- **PDF**: resumen de turno o de período, en blanco y negro, tamaño carta.
- Archivos en `Directory.Cache` → `@capacitor/share`.
- **Respaldo**: exporta la base completa a `supervisor-respaldo-AAAAMMDD.json` (o copia del `.db`) y la comparte; **restaurar** reemplaza la base previa tras confirmar con PIN de admin. Recordatorio semanal de respaldo.

---

## 9. Estructura del proyecto

```
Supervisor/
├─ CLAUDE.md
├─ docs/especificacion.md
├─ index.html
├─ capacitor.config.ts           # appId: cl.supervisor.app, appName: Supervisor
├─ vite.config.ts
├─ src/
│  ├─ main.tsx
│  ├─ router.ts
│  ├─ styles/{tokens.css,app.css}
│  ├─ db/{conexion.ts,migraciones/,repos/}
│  ├─ dominio/{puntos.ts,ranking.ts,turnos.ts,traspaso.ts,candado.ts}   # lógica pura + tests
│  ├─ servicios/{auth.ts,exportar-xlsx.ts,exportar-pdf.ts,respaldo.ts,notificaciones.ts}
│  ├─ componentes/               # Banner, Medalla, TecladoPin, Nota17, Pestañas…
│  └─ pantallas/
├─ tests/
├─ android/                      # generado por `npx cap add android` (se versiona)
└─ .github/workflows/apk.yml     # build de APK en CI
```

---

## 10. Fases de ejecución

**Fase 0 — Entorno**
- Node 22 (ya instalado), JDK 21 (ya instalado). Instalar Android SDK command-line tools (`platform-tools`, `platforms;android-34`, `build-tools;34.0.0`) y definir `ANDROID_HOME`.
- Alternativa sin SDK local: workflow de GitHub Actions que compila y publica el APK como artefacto.

**Fase 1 — Esqueleto**
- `npm create vite` (preact-ts), Capacitor, SQLite, router, estilos base del portapapeles, `npx cap add android`. APK “hola mundo” instalado en un equipo.

**Fase 2 — Datos y acceso**
- Migraciones, repositorios, primer arranque, ingreso con PIN, roles, auditoría.

**Fase 3 — Administración**
- CRUD de áreas, horarios de turno, trabajadores, plantillas de tareas, supervisores y configuración.

**Fase 4 — Operación del turno**
- Apertura automática/manual según horario, generación de `tarea_turno` desde plantillas, checklist, asistencia y evaluación 1–7.

**Fase 5 — Traspaso, contador y candado**
- Cierre con validación, traspaso con bono, aviso de reasignación, banner con cuenta regresiva, notificaciones locales, intercepción del botón atrás.

**Fase 6 — Ranking y medallero**
- `ranking.ts` con pruebas, pantalla de podio por área y período, ficha del trabajador con sugerencias.

**Fase 7 — Reportes y respaldo**
- Exportación xlsx/pdf, compartir, respaldo y restauración.

**Fase 8 — Pulido y entrega**
- Prueba en celular y tablet, accesibilidad (tamaños, contraste), medición de tamaño del bundle, firma del APK de release (keystore fuera del repo), README de instalación.

Cada fase termina con: pruebas en verde, APK de debug instalable y commit en `main` (o PR si se trabaja en ramas).

---

## 11. Comandos

```bash
npm install
npm run dev              # desarrollo en navegador (jeep-sqlite)
npm test                 # Vitest
npm run build            # build web en dist/
npx cap sync android     # copia dist/ al proyecto Android
cd android && ./gradlew assembleDebug    # → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 12. Convenciones para Claude

- Código, nombres de dominio, textos de UI y commits en español; identificadores sin tildes (`evaluacion`, `area`).
- La lógica de negocio va en `src/dominio/` como funciones puras con pruebas; las pantallas solo orquestan.
- No agregar dependencias pesadas ni colores a la UI sin consultarlo. Mantener el presupuesto de tamaño del bundle.
- Nunca versionar keystores, respaldos de datos reales ni archivos `.db`.
- Actualizar este archivo cuando cambie una decisión de la sección 1.

---

## 13. Pendientes por confirmar

- Umbrales de “apto para bono” y “requiere capacitación” (propuesta: puntaje ≥ 80 y ≤ 40 en el mes).
- ¿El tope de traspasos (3) es correcto, o el bono debe crecer sin límite?
- ¿Un supervisor ve todas las áreas o solo las que tiene asignadas?
- Nombre del paquete Android (propuesto `cl.supervisor.app`) e ícono.
