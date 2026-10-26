# Documento de Especificación y Concepto: "Supervisor"

## 1. Concepto Inicial y Propósito
**"Supervisor"** es una aplicación móvil y de tablets diseñada para optimizar la gestión operativa diaria de equipos de trabajo. Su enfoque principal en esta etapa inicial es **centralizar el control en la vista de administración**, permitiendo supervisar la ejecución de tareas recurrentes, medir la productividad real mediante ponderaciones de dificultad y evaluar el desempeño integral del personal.

### Características Generales de la Arquitectura:
* **Plataforma:** Diseñada para smartphones y tablets.
* **Modo Offline-First:** Almacenamiento local (SQLite) para garantizar operatividad sin interrupciones ante fallas de conectividad en zonas de trabajo (como cocinas o bodegas).
* **Reportes y Exportación:** Visualización de resúmenes en pantalla al finalizar turnos o listas, con opciones de exportación directa a hojas de cálculo (Excel / Google Sheets) y formatos PDF.

---

## 2. Módulos y Funcionalidades Principales (Vista Admin)

### A. Gestión de Tareas y Ponderación por Dificultad
* **Creación Dinámica:** Desde la vista de administración, los supervisores pueden crear nuevas tareas y asignarles un nivel de dificultad configurable.
* **Cálculo de Carga Laboral:** Cada tarea otorga un valor en puntos proporcional a su nivel de dificultad. Cuando una tarea es completada, acumula puntos automáticamente para el trabajador responsable, reflejando su esfuerzo operativo real (por ejemplo, tareas de mayor esfuerzo físico o técnico otorgan más peso).
  $$Puntaje \text{ de Tareas} = \sum (\text{Tareas Completadas} \times \text{Peso de Dificultad})$$

### B. Módulo de Evaluación de Desempeño y Hábitos
* **Calificación Cualitativa (Escala 1 a 7):** Además de las tareas ejecutadas, se evalúan elementos clave de la cultura laboral diaria:
  * Puntualidad.
  * Respeto con los compañeros.
  * Presentación personal (uniforme impecable).
* **Propósito del Módulo:** Identificar perfiles aptos para bonos de productividad, días libres extras o beneficios de vacaciones, así como detectar necesidades de capacitación en colaboradores con menor rendimiento.

### C. Panel de Comando Operativo y Medallero
* **Filtros por Departamento / Áreas:** El panel permite navegar rápidamente entre distintas áreas de trabajo (ej. Cocina, Salón, Limpieza) mediante pestañas intuitivas.
* **Ranking y Podio con Medallero:** 
  * El sistema ordena automáticamente a los trabajadores de cada área según su puntaje ponderado total.
  * Se incluye un distintivo visual de podio para los líderes del ranking:
    * 🥇 **Medalla de Oro:** 1.er lugar en desempeño y productividad.
    * 🥈 **Medalla de Plata:** 2.º lugar.
    * 🥉 **Medalla de Bronce:** 3.er lugar.

### D. Seguridad Operativa: Bloqueo de Cierre de Turno
* **Recordatorios Activos:** Un banner superior con contador regresivo advierte al supervisor sobre las evaluaciones de hábitos pendientes durante su jornada.
* **Candado de Cierre Obligatorio:** Para garantizar la trazabilidad de los datos, **el sistema prohíbe finalizar o cerrar el turno** si el administrador intenta salir sin haber completado las evaluaciones diarias de todo el personal activo.