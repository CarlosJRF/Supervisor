import { useState } from 'preact/hooks';
import { Hoja, Medalla, Pestanas, Pinza, Segmentos, useDatos } from '../componentes/ui';
import { cambiar, useEstado } from '../estado';
import { ir } from '../router';
import { rankingDeArea } from '../db/repos/ranking';
import { rangoPeriodo, type Periodo } from '../dominio/fechas';
import type { FilaRanking } from '../dominio/ranking';

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: 'dia', texto: 'Día' },
  { valor: 'semana', texto: 'Semana' },
  { valor: 'mes', texto: 'Mes' },
];

function mover(ref: Date, periodo: Periodo, delta: number): Date {
  const d = new Date(ref);
  if (periodo === 'dia') d.setDate(d.getDate() + delta);
  else if (periodo === 'semana') d.setDate(d.getDate() + 7 * delta);
  else d.setMonth(d.getMonth() + delta, 1);
  return d;
}

export function Ranking() {
  const { areas, areaId, version } = useEstado();
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [ref, setRef] = useState(new Date());
  const { desde, hasta } = rangoPeriodo(periodo, ref);
  const [filas] = useDatos(() => (areaId ? rankingDeArea(areaId, desde, hasta) : Promise.resolve([])), [areaId, desde, hasta, version]);
  const podio = (filas ?? []).filter((f) => f.medalla);

  const peldano = (f: FilaRanking | undefined, clase: string) =>
    f ? (
      <button class={`peldano ${clase}`} onClick={() => ir(`/trabajador/${f.trabajadorId}`)}>
        <Medalla tipo={f.medalla} posicion={f.posicion} />
        <span class="nombre">{f.nombre}</span>
        <span class="num">{f.puntaje.toFixed(0)}</span>
      </button>
    ) : (
      <div />
    );

  return (
    <>
      <Pinza titulo="Ranking y medallero" atras />
      <Hoja>
        <Pestanas items={areas} valor={areaId} onCambio={(id) => cambiar({ areaId: id })} />
        <div class="fila">
          <Segmentos etiqueta="Período" opciones={PERIODOS} valor={periodo} onCambio={setPeriodo} />
          <span class="crece" />
          <button class="chico" aria-label="Período anterior" onClick={() => setRef(mover(ref, periodo, -1))}>
            ←
          </button>
          <span class="num sec">{desde === hasta ? desde : `${desde} → ${hasta}`}</span>
          <button class="chico" aria-label="Período siguiente" onClick={() => setRef(mover(ref, periodo, 1))}>
            →
          </button>
        </div>

        {podio.length > 0 && (
          <div class="podio" aria-label="Podio">
            {peldano(podio[1], 'p2')}
            {peldano(podio[0], 'p1')}
            {peldano(podio[2], 'p3')}
          </div>
        )}

        {filas?.length === 0 ? (
          <p class="vacio">Sin trabajadores en esta área.</p>
        ) : (
          <div class="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th class="n">Pts tareas</th>
                  <th class="n">Hábitos</th>
                  <th class="n">Puntaje</th>
                </tr>
              </thead>
              <tbody>
                {filas?.map((f) => (
                  <tr onClick={() => ir(`/trabajador/${f.trabajadorId}`)} style="cursor:pointer">
                    <td>
                      <Medalla tipo={f.medalla} posicion={f.posicion} />
                    </td>
                    <td>{f.nombre}</td>
                    <td class="n">{f.puntosTareas}</td>
                    <td class="n">{f.promedioHabitos?.toFixed(1) ?? '—'}</td>
                    <td class="n">
                      <strong>{f.puntaje.toFixed(0)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p class="sec">Puntaje 0–100 = tareas (normalizadas al mejor del área) y hábitos (1–7), según los pesos configurados.</p>
      </Hoja>
    </>
  );
}
