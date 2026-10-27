/** Fechas locales en formato AAAA-MM-DD y horas HH:MM. */
export function fechaISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function deFechaISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function minutosDeHora(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export type Periodo = 'dia' | 'semana' | 'mes';

/** Rango [desde, hasta] inclusivo en fechas ISO. La semana empieza el lunes. */
export function rangoPeriodo(periodo: Periodo, ref: Date): { desde: string; hasta: string } {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  if (periodo === 'dia') return { desde: fechaISO(d), hasta: fechaISO(d) };
  if (periodo === 'semana') {
    const lunes = new Date(d);
    lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return { desde: fechaISO(lunes), hasta: fechaISO(domingo) };
  }
  return {
    desde: fechaISO(new Date(d.getFullYear(), d.getMonth(), 1)),
    hasta: fechaISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

/** Días de semana como cadena "1234567" (1 = lunes … 7 = domingo). */
export function diaSemana(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

export const NOMBRES_DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
