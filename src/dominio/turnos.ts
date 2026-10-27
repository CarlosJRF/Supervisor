import { deFechaISO, diaSemana, fechaISO, minutosDeHora } from './fechas';

export interface Horario {
  id: number;
  areaId: number;
  nombre: string;
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM (si es menor que el inicio, termina al día siguiente)
  diasSemana: string; // "12345"
}

/** Inicio y fin reales de un turno para una fecha de inicio dada. */
export function limitesTurno(h: Horario, fecha: string): { inicio: Date; fin: Date } {
  const base = deFechaISO(fecha);
  const ini = minutosDeHora(h.horaInicio);
  let fin = minutosDeHora(h.horaFin);
  if (fin <= ini) fin += 24 * 60;
  const inicio = new Date(base.getTime());
  inicio.setMinutes(ini);
  const f = new Date(base.getTime());
  f.setMinutes(fin);
  return { inicio, fin: f };
}

/**
 * Turno programado que está en curso ahora, o si ninguno, el próximo en las siguientes 24 h.
 * Considera turnos nocturnos que empezaron ayer.
 */
export function turnoProgramado(
  horarios: Horario[],
  ahora: Date,
): { horario: Horario; fecha: string; inicio: Date; fin: Date; enCurso: boolean } | null {
  const candidatos: { horario: Horario; fecha: string; inicio: Date; fin: Date; enCurso: boolean }[] = [];
  for (const offset of [-1, 0, 1]) {
    const dia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + offset);
    const fecha = fechaISO(dia);
    for (const h of horarios) {
      if (!h.diasSemana.includes(String(diaSemana(dia)))) continue;
      const { inicio, fin } = limitesTurno(h, fecha);
      if (fin <= ahora) continue;
      candidatos.push({ horario: h, fecha, inicio, fin, enCurso: inicio <= ahora });
    }
  }
  candidatos.sort((a, b) => Number(b.enCurso) - Number(a.enCurso) || a.inicio.getTime() - b.inicio.getTime());
  const c = candidatos[0];
  if (!c) return null;
  if (!c.enCurso && c.inicio.getTime() - ahora.getTime() > 24 * 3600_000) return null;
  return c;
}

/** "02:15:09" o "-00:05:00" si ya venció. */
export function formatoRestante(ms: number): string {
  const neg = ms < 0;
  let s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${neg ? '-' : ''}${p(h)}:${p(m)}:${p(s)}`;
}
