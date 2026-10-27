import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const nativo = Capacitor.isNativePlatform();

/** Programa avisos a N minutos del cierre del turno. Los ids derivan del id del turno. */
export async function programarAvisosTurno(turnoId: number, area: string, fin: Date, minutos: number[]) {
  if (!nativo) return;
  if ((await LocalNotifications.requestPermissions()).display !== 'granted') return;
  await cancelarAvisosTurno(turnoId, minutos.length);
  const ahora = Date.now();
  const notificaciones = minutos
    .map((m, i) => ({
      id: turnoId * 10 + i,
      title: `${area}: el turno cierra en ${m} min`,
      body: 'Completa las evaluaciones pendientes para poder cerrar el turno.',
      schedule: { at: new Date(fin.getTime() - m * 60_000), allowWhileIdle: true },
    }))
    .filter((n) => n.schedule.at.getTime() > ahora);
  if (notificaciones.length) await LocalNotifications.schedule({ notifications: notificaciones });
}

export async function cancelarAvisosTurno(turnoId: number, cantidad = 2) {
  if (!nativo) return;
  await LocalNotifications.cancel({ notifications: Array.from({ length: cantidad }, (_, i) => ({ id: turnoId * 10 + i })) });
}
