import { useState } from 'preact/hooks';
import { Hoja, Pestanas, Pinza, useDatos } from '../../componentes/ui';
import { listarAreas } from '../../db/repos/catalogo';
import { reabrirTurno, turnosRecientes } from '../../db/repos/turnos';
import { avisar, intentar, refrescar, useEstado } from '../../estado';

export function Turnos() {
  const { usuario } = useEstado();
  const [areas] = useDatos(() => listarAreas(), []);
  const [areaId, setAreaId] = useState<number | null>(null);
  const area = areaId ?? areas?.[0]?.id ?? null;
  const [turnos, recargar] = useDatos(() => (area ? turnosRecientes(area) : Promise.resolve([])), [area]);

  const reabrir = async (id: number) => {
    if (!confirm('¿Reabrir este turno? Las tareas traspasadas que aún no se copiaron vuelven a quedar pendientes.')) return;
    const ok = await intentar(async () => {
      await reabrirTurno(id, usuario!.id);
      return true;
    });
    if (ok) {
      avisar('Turno reabierto.');
      recargar();
      refrescar();
    }
  };

  return (
    <>
      <Pinza titulo="Historial de turnos" atras />
      <Hoja>
        <Pestanas items={areas ?? []} valor={area} onCambio={setAreaId} />
        {turnos?.length === 0 && <p class="vacio">Sin turnos registrados.</p>}
        <ul class="renglones">
          {turnos?.map((t) => (
            <li>
              <span class="crece">
                <span class="titulo num">{t.fecha}</span> · {t.nombre_horario}
                <div class="sec">
                  {t.estado === 'abierto' ? 'Abierto' : `Cerrado ${t.cerrado_en ?? ''}`}
                </div>
              </span>
              {t.estado === 'cerrado' && (
                <button class="chico" onClick={() => reabrir(t.id)}>
                  Reabrir
                </button>
              )}
            </li>
          ))}
        </ul>
      </Hoja>
    </>
  );
}
