# Supervisor

App Android (celular y tablet) para supervisar tareas, productividad y hábitos del personal. Funciona sin internet; los datos viven en SQLite en el dispositivo.

El plan completo y las decisiones de diseño están en [`CLAUDE.md`](CLAUDE.md).

## Instalar en un celular o tablet

1. Descarga `app-debug.apk` (desde *Actions → APK → Artifacts* en GitHub, o compílala localmente).
2. Cópiala al equipo y ábrela. Android pedirá permitir “instalar apps de origen desconocido”.
3. Al abrir por primera vez se crea la cuenta de administrador y las áreas.

## Primeros pasos en la app

1. **Administración → Horarios de turno**: crea los turnos de cada área (ej. Mañana 08:00–16:00).
2. **Trabajadores**: agrega al personal y su turno habitual.
3. **Plantillas de tareas**: tareas recurrentes con dificultad 1–5 (= puntos).
4. **Supervisores**: crea cuentas con PIN y asígnales sus áreas.
5. En el panel, **Abrir turno** → marcar tareas → **Evaluar** → **Cerrar turno**.

## Desarrollo

Requisitos: Node 22, JDK 21 y Android SDK (`platforms;android-36`, `build-tools;36.0.0`) con `ANDROID_HOME` definido.

```bash
npm install
npm run dev      # en el navegador, con SQLite en IndexedDB
npm test         # pruebas de dominio e integración (sql.js)
npm run apk      # → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
