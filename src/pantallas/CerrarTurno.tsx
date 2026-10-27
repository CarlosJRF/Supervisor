import { Hoja, Pinza, useDatos } from '../componentes/ui';
import { useTurno } from '../componentes/useTurno';
import { avisar, intentar, refrescar, useEstado } from '../estado';
import { ir } from '../router';
import { cerrarTurno, evaluacionesDelTurno, tareasDelTurno } from '../db/repos/turnos';
import { cancelarAvisosTurno } from '../servicios/notificaciones';

export function CerrarTurno() {
  const { usuario } = useEstado();
  const [datos] = useTurno();
  const turno = datos?.turno;
  const [resumen] = useDatos(async () => {
    if (!turno) return null;
    const [tareas, evals] = await Promise.all([tareasDelTurno(turno.id), evaluacionesDelTurno(turno.id)]);
    const notas = evals.flatMap((e) => Object.values(e.notas));
    return {
      completadas: tareas.filter((t) => t.estado === 'completada').length,
      pendientes: tareas.filter((t) => t.estado === 'pendiente').length,
      puntos: tareas.reduce((s, t) => s + (t.puntos_otorgados ?? 0), 0),
      promedio: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
      presentes: evals.filter((e) => e.asistencia === 'presente').length,
      ausentes: evals.filter((e) => e.asistencia && e.asistencia !== 'presente').length,
      faltan: evals.filter((e) => datos!.pendientes.includes(e.id)).map((e) => e.nombre),
    };
  }, [turno?.id, datos?.pendientes.length]);

  if (!datos) return null;
  if (!turno)
    return (
      <>
        <Pinza titulo="Cerrar turno" atras />
        <Hoja>
          <p class="vacio">No hay un turno abierto en esta área.</p>
        </Hoja>
      </>
    );

  const cerrar = async () => {
    const r = await intentar(() => cerrarTurno(turno.id, usuario!.id));
    if (!r) return;
    await cancelarAvisosTurno(turno.id);
    refrescar();
    avisar(r.traspasadas ? `Turno cerrado. ${r.traspasadas} tareas pasan al siguiente turno.` : 'Turno cerrado.');
    ir('/');
  };

  const bloqueado = datos.pendientes.length > 0;

  return (
    <>
      <Pinza titulo={`Cerrar · ${turno.nombre_horario}`} atras />
      <Hoja>
        <h2>Resumen del turno</h2>
        {resumen && (
          <table>
            <tbody>
              <tr><td>Tareas completadas</td><td class="n">{resumen.completadas}</td></tr>
              <tr><td>Tareas que se traspasarán</td><td class="n">{resumen.pendientes}</td></tr>
              <tr><td>Puntos otorgados</td><td class="n">{resumen.puntos}</td></tr>
              <tr><td>Presentes / ausentes</td><td class="n">{resumen.presentes} / {resumen.ausentes}</td></tr>
              <tr><td>Promedio de hábitos</td><td class="n">{resumen.promedio?.toFixed(1) ?? '—'}</td></tr>
            </tbody>
          </table>
        )}
        {bloqueado ? (
          <div class="aviso invertido">
            <strong>Cierre bloqueado.</strong> Falta evaluar a: {resumen?.faltan.join(', ')}.
            <div class="acciones">
              <a class="boton" href="#/evaluar" style="background:#fff">
                Completar evaluaciones
              </a>
            </div>
          </div>
        ) : (
          <div class="acciones">
            <button class="primario ancho" onClick={cerrar}>
              Cerrar turno
            </button>
          </div>
        )}
      </Hoja>
    </>
  );
}
