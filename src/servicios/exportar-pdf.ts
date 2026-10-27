import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { MEDALLA_TEXTO, type DatosReporte } from './reporte';

const ESTILO = {
  theme: 'plain' as const,
  styles: { fontSize: 9, textColor: 17, lineColor: 17, cellPadding: 1.5 },
  headStyles: { fontStyle: 'bold' as const, fillColor: 17, textColor: 255 },
  bodyStyles: { lineWidth: { bottom: 0.1 } },
  margin: { left: 14, right: 14 },
};

/** PDF en blanco y negro, tamaño carta. */
export function generarPdf(d: DatosReporte): Blob {
  const doc = new jsPDF({ format: 'letter' });
  doc.setFont('helvetica', 'bold').setFontSize(16).text('Supervisor', 14, 18);
  doc.setFont('helvetica', 'normal').setFontSize(10).text(`${d.area} · ${d.desde} a ${d.hasta}`, 14, 25);
  doc.setLineWidth(0.6).line(14, 28, 202, 28);

  const completadas = d.tareas.filter((t) => t.estado === 'completada').length;
  const traspasadas = d.tareas.filter((t) => t.estado === 'traspasada').length;
  doc.text(`Tareas completadas: ${completadas}   ·   Traspasadas: ${traspasadas}   ·   Evaluaciones: ${d.evaluaciones.length}`, 14, 35);

  autoTable(doc, {
    ...ESTILO,
    startY: 40,
    head: [['#', 'Medalla', 'Trabajador', 'Pts tareas', 'Hábitos', 'Puntaje']],
    body: d.ranking.map((f) => [
      f.posicion,
      f.medalla ? MEDALLA_TEXTO[f.medalla] : '',
      f.nombre,
      f.puntosTareas,
      f.promedioHabitos?.toFixed(1) ?? '—',
      f.puntaje.toFixed(0),
    ]),
  });

  const pendientes = d.tareas.filter((t) => t.estado !== 'completada');
  if (pendientes.length) {
    autoTable(doc, {
      ...ESTILO,
      head: [['Fecha', 'Turno', 'Tarea no completada', 'Trabajador', 'Traspasos']],
      body: pendientes.map((t) => [t.fecha, t.turno, t.tarea, t.trabajador ?? '—', t.traspasos]),
    });
  }

  const faltas = d.asistencia.filter((a) => a.estado !== 'presente');
  if (faltas.length) {
    autoTable(doc, {
      ...ESTILO,
      head: [['Fecha', 'Turno', 'Trabajador', 'Asistencia']],
      body: faltas.map((a) => [a.fecha, a.turno, a.trabajador, a.estado]),
    });
  }
  return doc.output('blob');
}
