import { useEffect, useState } from 'preact/hooks';
import { formatoRestante, limitesTurno } from '../dominio/turnos';
import type { Turno } from '../db/repos/turnos';
import { ir } from '../router';

/** Banner superior con cuenta regresiva y evaluaciones pendientes. Ver CLAUDE.md §6.5. */
export function BannerTurno({ turno, pendientes, minutosAviso }: { turno: Turno; pendientes: number; minutosAviso: number }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const { fin } = limitesTurno(
    { id: 0, areaId: 0, nombre: '', horaInicio: turno.hora_inicio, horaFin: turno.hora_fin, diasSemana: '' },
    turno.fecha,
  );
  const restante = fin.getTime() - ahora;
  const vencido = restante < 0;
  const clase = vencido ? 'vencido' : pendientes > 0 && restante < minutosAviso * 60_000 ? 'alerta' : '';
  return (
    <div class={`banner ${clase}`} role="status">
      <div>
        <div>
          {turno.nombre_horario} · {vencido ? 'TURNO VENCIDO' : 'cierra en'}
        </div>
        <div class="reloj">{formatoRestante(restante)}</div>
      </div>
      {pendientes > 0 ? (
        <button onClick={() => ir('/evaluar')}>
          {pendientes} evaluación{pendientes === 1 ? '' : 'es'} pendiente{pendientes === 1 ? '' : 's'}
        </button>
      ) : (
        <span>Evaluaciones completas ✓</span>
      )}
    </div>
  );
}
