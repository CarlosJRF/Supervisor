import { useEffect, useState } from 'preact/hooks';
import { App as CapApp } from '@capacitor/app';
import { abrirDb } from './db/conexion';
import { hayUsuarios } from './db/repos/usuarios';
import { cambiar, useEstado } from './estado';
import { coincide, ir, rutaActual, useRuta } from './router';
import { bloqueoDeSalida, cerrarSesion } from './servicios/sesion';
import { Dialogo, Hoja, Toast } from './componentes/ui';
import { PrimerArranque } from './pantallas/PrimerArranque';
import { Ingreso } from './pantallas/Ingreso';
import { Panel } from './pantallas/Panel';
import { Tareas } from './pantallas/Tareas';
import { Evaluar } from './pantallas/Evaluar';
import { CerrarTurno } from './pantallas/CerrarTurno';
import { Ranking } from './pantallas/Ranking';
import { FichaTrabajador } from './pantallas/FichaTrabajador';
import { Reportes } from './pantallas/Reportes';
import { Admin } from './pantallas/admin/Admin';

const MINUTOS_INACTIVIDAD = 10;

export function App() {
  const [listo, setListo] = useState<'cargando' | 'nuevo' | 'ok' | string>('cargando');
  const [bloqueo, setBloqueo] = useState<{ areaId: number; texto: string } | null>(null);
  const { usuario } = useEstado();
  const ruta = useRuta();

  useEffect(() => {
    abrirDb()
      .then(hayUsuarios)
      .then((hay) => setListo(hay ? 'ok' : 'nuevo'))
      .catch((e) => setListo(`Error al abrir la base de datos: ${e?.message ?? e}`));
  }, []);

  // Bloqueo por inactividad: cierra la sesión, nunca el turno.
  useEffect(() => {
    if (!usuario) return;
    let t: ReturnType<typeof setTimeout>;
    const reiniciar = () => {
      clearTimeout(t);
      t = setTimeout(() => cerrarSesion('inactividad'), MINUTOS_INACTIVIDAD * 60_000);
    };
    reiniciar();
    const eventos = ['pointerdown', 'keydown'];
    eventos.forEach((e) => addEventListener(e, reiniciar));
    return () => {
      clearTimeout(t);
      eventos.forEach((e) => removeEventListener(e, reiniciar));
    };
  }, [usuario]);

  // Botón atrás de Android: navega hacia atrás; en el inicio respeta el candado de cierre.
  useEffect(() => {
    const h = CapApp.addListener('backButton', async () => {
      if (rutaActual() !== '/') return history.back();
      const b = usuario ? await bloqueoDeSalida() : null;
      if (b) setBloqueo(b);
      else CapApp.minimizeApp();
    });
    return () => void h.then((x) => x.remove());
  }, [usuario]);

  if (listo === 'cargando') return <Hoja estrecha>Cargando…</Hoja>;
  if (listo !== 'ok' && listo !== 'nuevo') return <Hoja estrecha>{listo}</Hoja>;
  if (listo === 'nuevo') return <PrimerArranque onListo={() => setListo('ok')} />;
  if (!usuario) return <Ingreso />;

  let pantalla;
  let p: Record<string, string> | null;
  if (ruta === '/') pantalla = <Panel onBloqueo={setBloqueo} />;
  else if (ruta === '/tareas') pantalla = <Tareas />;
  else if (ruta === '/evaluar') pantalla = <Evaluar />;
  else if (ruta === '/cerrar') pantalla = <CerrarTurno />;
  else if (ruta === '/ranking') pantalla = <Ranking />;
  else if ((p = coincide('/trabajador/:id', ruta))) pantalla = <FichaTrabajador id={Number(p.id)} />;
  else if (ruta === '/reportes') pantalla = <Reportes />;
  else if (ruta.startsWith('/admin') && usuario.rol === 'admin') pantalla = <Admin ruta={ruta} />;
  else pantalla = <Panel onBloqueo={setBloqueo} />;

  return (
    <>
      {pantalla}
      {bloqueo && (
        <Dialogo titulo="No puedes salir todavía" onCerrar={() => setBloqueo(null)}>
          <p>{bloqueo.texto}.</p>
          <p class="sec">Completa las evaluaciones del personal para poder cerrar el turno o salir.</p>
          <div class="acciones">
            <button
              class="primario"
              onClick={() => {
                cambiar({ areaId: bloqueo.areaId });
                setBloqueo(null);
                ir('/evaluar');
              }}
            >
              Ir a evaluaciones
            </button>
            <button onClick={() => setBloqueo(null)}>Volver</button>
          </div>
        </Dialogo>
      )}
      <Toast />
    </>
  );
}

