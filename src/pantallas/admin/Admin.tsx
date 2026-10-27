import { Hoja, Pinza } from '../../componentes/ui';
import { Areas } from './Areas';
import { Horarios } from './Horarios';
import { Trabajadores } from './Trabajadores';
import { Plantillas } from './Plantillas';
import { Usuarios } from './Usuarios';
import { Configuracion } from './Configuracion';
import { Respaldo } from './Respaldo';
import { Turnos } from './Turnos';

const SECCIONES = [
  ['areas', 'Áreas', 'Cocina, Salón, Limpieza…'],
  ['horarios', 'Horarios de turno', 'Mañana, tarde, noche por área'],
  ['trabajadores', 'Trabajadores', 'Personal por área y turno'],
  ['plantillas', 'Plantillas de tareas', 'Tareas recurrentes y dificultad'],
  ['usuarios', 'Supervisores', 'Cuentas, PIN y áreas asignadas'],
  ['turnos', 'Historial de turnos', 'Revisar y reabrir'],
  ['config', 'Ponderaciones', 'Pesos del ranking y umbrales'],
  ['respaldo', 'Respaldo', 'Exportar y restaurar datos'],
] as const;

export function Admin({ ruta }: { ruta: string }) {
  const sub = ruta.split('/')[2];
  switch (sub) {
    case 'areas': return <Areas />;
    case 'horarios': return <Horarios />;
    case 'trabajadores': return <Trabajadores />;
    case 'plantillas': return <Plantillas />;
    case 'usuarios': return <Usuarios />;
    case 'turnos': return <Turnos />;
    case 'config': return <Configuracion />;
    case 'respaldo': return <Respaldo />;
  }
  return (
    <>
      <Pinza titulo="Administración" atras />
      <Hoja>
        <ul class="renglones">
          {SECCIONES.map(([id, nombre, desc]) => (
            <li>
              <a href={`#/admin/${id}`} class="crece" style="color:inherit;text-decoration:none">
                <div class="titulo">{nombre}</div>
                <div class="sec">{desc}</div>
              </a>
              <span aria-hidden="true">→</span>
            </li>
          ))}
        </ul>
      </Hoja>
    </>
  );
}
