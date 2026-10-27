import { useEffect, useState } from 'preact/hooks';
import { BannerTurno } from '../componentes/BannerTurno';
import { Dialogo, Hoja, Pestanas, Pinza, useDatos } from '../componentes/ui';
import { useTurno } from '../componentes/useTurno';
import { avisar, cambiar, intentar, refrescar, useEstado } from '../estado';
import { ir } from '../router';
import { listarHorarios } from '../db/repos/catalogo';
import { abrirTurno, tareasDelTurno, turnoDeFecha } from '../db/repos/turnos';
import { fechaISO } from '../dominio/fechas';
import { limitesTurno, turnoProgramado, type Horario } from '../dominio/turnos';
import { bloqueoDeSalida, cerrarSesion } from '../servicios/sesion';
import { programarAvisosTurno } from '../servicios/notificaciones';

const hora = (d: Date) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
const dia = (d: Date) => d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });

export function Panel({ onBloqueo }: { onBloqueo: (b: { areaId: number; texto: string }) => void }) {
  const { usuario, areas, areaId, version } = useEstado();
  const [datos] = useTurno();
  const [horarios] = useDatos(() => (areaId ? listarHorarios(areaId) : Promise.resolve([])), [areaId, version]);
  const [eligiendo, setEligiendo] = useState(false);
  const area = areas.find((a) => a.id === areaId);

  // Mantener programados los avisos del turno abierto.
  useEffect(() => {
    const t = datos?.turno;
    if (!t || !area) return;
    const { fin } = limitesTurno({ id: 0, areaId: 0, nombre: '', horaInicio: t.hora_inicio, horaFin: t.hora_fin, diasSemana: '' }, t.fecha);
    programarAvisosTurno(t.id, area.nombre, fin, [datos.config.minutos_aviso, datos.config.minutos_bloqueo]);
  }, [datos?.turno?.id]);

  const salir = async () => {
    const b = await bloqueoDeSalida();
    if (b) onBloqueo(b);
    else cerrarSesion('salir');
  };

  const abrir = async (h: Horario, fecha: string) => {
    if (!usuario) return;
    await intentar(async () => {
      if (await turnoDeFecha(h.id, fecha)) throw new Error(`El turno ${h.nombre} del ${fecha} ya fue registrado`);
      const id = await abrirTurno(h.id, fecha, usuario.id);
      const traspasadas = (await tareasDelTurno(id)).filter((t) => t.traspasos > 0).length;
      setEligiendo(false);
      refrescar();
      if (traspasadas) {
        avisar(`${traspasadas} tareas sin completar del turno anterior`);
        ir('/tareas');
      }
    });
  };

  const programado = horarios ? turnoProgramado(horarios, new Date()) : null;
  const turno = datos?.turno;

  return (
    <>
      <Pinza titulo={area ? `${area.nombre}` : 'Supervisor'}>
        <span class="sec" style="color:#bbb;font-size:13px">{usuario?.nombre}</span>
        <button onClick={salir}>Salir</button>
      </Pinza>
      {turno && datos && <BannerTurno turno={turno} pendientes={datos.pendientes.length} minutosAviso={datos.config.minutos_aviso} />}
      <Hoja>
        <Pestanas items={areas} valor={areaId} onCambio={(id) => cambiar({ areaId: id })} />

        {!areas.length && (
          <p class="aviso">
            No tienes áreas asignadas. {usuario?.rol === 'admin' ? 'Créalas en Administración.' : 'Pide al administrador que te asigne una.'}
          </p>
        )}

        {area && datos && (
          <>
            <h2>Turno</h2>
            {turno ? (
              <p>
                <strong>{turno.nombre_horario}</strong> abierto · {turno.fecha} · {turno.hora_inicio}–{turno.hora_fin}
              </p>
            ) : programado ? (
              <div class="fila">
                <p class="crece">
                  {programado.enCurso ? 'En curso: ' : 'Próximo: '}
                  <strong>{programado.horario.nombre}</strong> · {dia(programado.inicio)} · {hora(programado.inicio)}–{hora(programado.fin)}
                </p>
                <button class="primario" onClick={() => abrir(programado.horario, programado.fecha)}>
                  Abrir turno
                </button>
              </div>
            ) : (
              <p class="sec">{horarios?.length ? 'No hay turnos programados en las próximas 24 h.' : 'Esta área no tiene horarios de turno.'}</p>
            )}
            {!turno && !!horarios?.length && (
              <button class="link" onClick={() => setEligiendo(true)}>
                Abrir otro turno…
              </button>
            )}

            <div class="menu" style="margin-top:16px">
              {turno && (
                <>
                  <a class="boton" href="#/tareas">
                    Tareas<small>checklist del turno</small>
                  </a>
                  <a class={`boton${datos.pendientes.length ? ' primario' : ''}`} href="#/evaluar">
                    Evaluar
                    <small>
                      {datos.total - datos.pendientes.length}/{datos.total} listos
                    </small>
                  </a>
                  <a class="boton" href="#/cerrar">
                    Cerrar turno<small>{datos.pendientes.length ? 'bloqueado' : 'disponible'}</small>
                  </a>
                </>
              )}
              <a class="boton" href="#/ranking">
                Ranking<small>medallero</small>
              </a>
              <a class="boton" href="#/reportes">
                Reportes<small>Excel · PDF</small>
              </a>
              {usuario?.rol === 'admin' && (
                <a class="boton" href="#/admin">
                  Administración<small>configurar</small>
                </a>
              )}
            </div>
          </>
        )}
        {!area && usuario?.rol === 'admin' && (
          <div class="acciones">
            <a class="boton primario" href="#/admin">
              Administración
            </a>
          </div>
        )}
      </Hoja>

      {eligiendo && horarios && (
        <ElegirTurno horarios={horarios} onElegir={abrir} onCerrar={() => setEligiendo(false)} />
      )}
    </>
  );
}

function ElegirTurno({
  horarios,
  onElegir,
  onCerrar,
}: {
  horarios: Horario[];
  onElegir: (h: Horario, fecha: string) => void;
  onCerrar: () => void;
}) {
  const [horarioId, setHorarioId] = useState(horarios[0].id);
  const [fecha, setFecha] = useState(fechaISO(new Date()));
  return (
    <Dialogo titulo="Abrir turno" onCerrar={onCerrar}>
      <label for="h">Horario</label>
      <select id="h" value={horarioId} onChange={(e) => setHorarioId(Number(e.currentTarget.value))}>
        {horarios.map((h) => (
          <option value={h.id}>
            {h.nombre} ({h.horaInicio}–{h.horaFin})
          </option>
        ))}
      </select>
      <label for="f">Fecha de inicio</label>
      <input id="f" type="date" value={fecha} onInput={(e) => setFecha(e.currentTarget.value)} />
      <div class="acciones">
        <button class="primario" onClick={() => onElegir(horarios.find((h) => h.id === horarioId)!, fecha)}>
          Abrir
        </button>
        <button onClick={onCerrar}>Cancelar</button>
      </div>
    </Dialogo>
  );
}
