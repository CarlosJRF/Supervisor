import { useState } from 'preact/hooks';
import { Hoja, Pestanas, Pinza, Segmentos } from '../componentes/ui';
import { avisar, cambiar, intentar, useEstado } from '../estado';
import { rangoPeriodo, type Periodo } from '../dominio/fechas';
import { datosReporte, nombreArchivo } from '../servicios/reporte';
import { compartirArchivo } from '../servicios/compartir';

export function Reportes() {
  const { areas, areaId } = useEstado();
  const inicial = rangoPeriodo('semana', new Date());
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [ocupado, setOcupado] = useState(false);
  const area = areas.find((a) => a.id === areaId);

  const atajo = (p: Periodo) => {
    const r = rangoPeriodo(p, new Date());
    setDesde(r.desde);
    setHasta(r.hasta);
  };

  const exportar = async (formato: 'xlsx' | 'pdf') => {
    if (!area) return;
    if (desde > hasta) return avisar('La fecha inicial es posterior a la final.');
    setOcupado(true);
    await intentar(async () => {
      const d = await datosReporte(area.id, area.nombre, desde, hasta);
      // Las librerías se cargan solo al exportar para mantener liviano el inicio.
      const blob =
        formato === 'xlsx'
          ? await (await import('../servicios/exportar-xlsx')).generarXlsx(d)
          : (await import('../servicios/exportar-pdf')).generarPdf(d);
      await compartirArchivo(blob, nombreArchivo(d, formato), `Reporte ${area.nombre}`);
    });
    setOcupado(false);
  };

  return (
    <>
      <Pinza titulo="Reportes" atras />
      <Hoja estrecha>
        <Pestanas items={areas} valor={areaId} onCambio={(id) => cambiar({ areaId: id })} />
        <h2>Período · {area?.nombre}</h2>
        <Segmentos
          etiqueta="Atajos de período"
          opciones={[
            { valor: 'dia', texto: 'Hoy' },
            { valor: 'semana', texto: 'Semana' },
            { valor: 'mes', texto: 'Mes' },
          ]}
          valor={null}
          onCambio={atajo}
        />
        <div class="fila">
          <div class="crece">
            <label for="d">Desde</label>
            <input id="d" type="date" value={desde} onInput={(e) => setDesde(e.currentTarget.value)} />
          </div>
          <div class="crece">
            <label for="h">Hasta</label>
            <input id="h" type="date" value={hasta} onInput={(e) => setHasta(e.currentTarget.value)} />
          </div>
        </div>
        <p class="sec">El Excel incluye Resumen, Ranking, Tareas, Evaluaciones y Asistencia. Se abre directamente en Google Sheets.</p>
        <div class="acciones">
          <button class="primario crece" disabled={ocupado || !area} onClick={() => exportar('xlsx')}>
            Excel (.xlsx)
          </button>
          <button class="crece" disabled={ocupado || !area} onClick={() => exportar('pdf')}>
            PDF
          </button>
        </div>
      </Hoja>
    </>
  );
}
