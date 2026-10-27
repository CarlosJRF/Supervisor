import { Hoja, Medalla, Pinza, useDatos } from '../componentes/ui';
import { uno } from '../db/conexion';
import { historialTrabajador, rankingDeArea } from '../db/repos/ranking';
import { leerConfig } from '../db/repos/config';
import { rangoPeriodo } from '../dominio/fechas';
import { sugerencia } from '../dominio/ranking';

const ASIS: Record<string, string> = { presente: 'P', ausente: 'A', licencia: 'L' };

export function FichaTrabajador({ id }: { id: number }) {
  const [datos] = useDatos(async () => {
    const w = await uno<{ id: number; nombre: string; area_id: number; area: string }>(
      'SELECT w.id, w.nombre, w.area_id, a.nombre AS area FROM trabajador w JOIN area a ON a.id = w.area_id WHERE w.id = ?',
      [id],
    );
    if (!w) return null;
    const { desde, hasta } = rangoPeriodo('mes', new Date());
    const [ranking, historial, config] = await Promise.all([
      rankingDeArea(w.area_id, desde, hasta),
      historialTrabajador(id, desde, hasta),
      leerConfig(),
    ]);
    return { w, fila: ranking.find((f) => f.trabajadorId === id), historial, config };
  }, [id]);

  if (!datos) return <Pinza titulo="Trabajador" atras />;
  const { w, fila, historial, config } = datos;
  const sug = fila ? sugerencia(fila.puntaje, config.umbral_bono, config.umbral_capacitacion) : null;

  return (
    <>
      <Pinza titulo={w.nombre} atras />
      <Hoja>
        <p class="sec">{w.area} · mes en curso</p>
        {fila && (
          <div class="fila" style="margin:12px 0">
            <Medalla tipo={fila.medalla} posicion={fila.posicion} />
            <div class="crece">
              <div class="num" style="font-size:28px;font-weight:700">{fila.puntaje.toFixed(0)}</div>
              <div class="sec num">
                {fila.puntosTareas} pts tareas · hábitos {fila.promedioHabitos?.toFixed(1) ?? '—'}
              </div>
            </div>
          </div>
        )}
        {sug === 'bono' && <p class="aviso invertido">Apto para bono o beneficio (puntaje ≥ {config.umbral_bono}).</p>}
        {sug === 'capacitacion' && <p class="aviso">Requiere capacitación o seguimiento (puntaje ≤ {config.umbral_capacitacion}).</p>}

        <h2>Historial del mes</h2>
        {historial.length === 0 ? (
          <p class="vacio">Sin turnos registrados este mes.</p>
        ) : (
          <div class="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Turno</th>
                  <th class="n">Asist.</th>
                  <th class="n">Tareas</th>
                  <th class="n">Pts</th>
                  <th class="n">Hábitos</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr>
                    <td class="num">{h.fecha}</td>
                    <td>{h.turno}</td>
                    <td class="n">{h.asistencia ? ASIS[h.asistencia] : '—'}</td>
                    <td class="n">{h.completadas}</td>
                    <td class="n">{h.puntos}</td>
                    <td class="n">{h.promedio === null ? '—' : Number(h.promedio).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Hoja>
    </>
  );
}
