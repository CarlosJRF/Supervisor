import { useEffect, useState } from 'preact/hooks';
import { Hoja, Pinza, useDatos } from '../../componentes/ui';
import { guardarConfig, leerConfig, type Config } from '../../db/repos/config';
import { avisar, intentar, refrescar } from '../../estado';
import { Campo } from './comunes';

export function Configuracion() {
  const [config] = useDatos(leerConfig, []);
  const [c, setC] = useState<Config | null>(null);
  useEffect(() => void (config && setC(config)), [config]);
  if (!c) return <Pinza titulo="Ponderaciones" atras />;

  const pctTareas = Math.round(c.peso_tareas * 100);
  const num = (k: keyof Config, etiqueta: string, min = 0, max = 100) => (
    <Campo id={k} etiqueta={etiqueta}>
      <input id={k} type="number" min={min} max={max} value={c[k]} onInput={(e) => setC({ ...c, [k]: Number(e.currentTarget.value) })} />
    </Campo>
  );

  const guardar = async (e: Event) => {
    e.preventDefault();
    if (c.umbral_capacitacion >= c.umbral_bono) return avisar('El umbral de capacitación debe ser menor que el de bono.');
    await intentar(() => guardarConfig(c));
    refrescar();
    avisar('Configuración guardada.');
  };

  return (
    <>
      <Pinza titulo="Ponderaciones" atras />
      <Hoja estrecha>
        <form onSubmit={guardar}>
          <h2>Puntaje del ranking</h2>
          <label for="pt">
            Tareas {pctTareas}% · Hábitos {100 - pctTareas}%
          </label>
          <input
            id="pt"
            type="range"
            min={0}
            max={100}
            step={5}
            value={pctTareas}
            onInput={(e) => {
              const v = Number(e.currentTarget.value) / 100;
              setC({ ...c, peso_tareas: v, peso_habitos: Math.round((1 - v) * 100) / 100 });
            }}
          />
          <h2>Traspaso de tareas</h2>
          {num('bono_traspaso', 'Bono por traspaso (puntos)', 0, 10)}
          {num('tope_traspasos', 'Tope de traspasos con bono', 0, 10)}
          <h2>Cierre de turno</h2>
          {num('minutos_aviso', 'Primer aviso (minutos antes del cierre)', 1, 240)}
          {num('minutos_bloqueo', 'Último aviso (minutos antes del cierre)', 1, 240)}
          <h2>Sugerencias</h2>
          {num('umbral_bono', 'Apto para bono: puntaje mensual ≥')}
          {num('umbral_capacitacion', 'Requiere capacitación: puntaje mensual ≤')}
          <div class="acciones">
            <button class="primario ancho" type="submit">
              Guardar
            </button>
          </div>
        </form>
      </Hoja>
    </>
  );
}
