import { useState } from 'preact/hooks';
import { Hoja, Pestanas, Pinza, useDatos } from '../../componentes/ui';
import { guardarHorario, listarAreas, listarHorarios, type HorarioConEstado } from '../../db/repos/catalogo';
import { intentar } from '../../estado';
import { Activo, Campo, Dias, Formulario, Inactivo, textoDias } from './comunes';

export function Horarios() {
  const [areas] = useDatos(() => listarAreas(), []);
  const [areaId, setAreaId] = useState<number | null>(null);
  const area = areaId ?? areas?.[0]?.id ?? null;
  const [horarios, recargar] = useDatos(() => (area ? listarHorarios(area, true) : Promise.resolve([])), [area]);
  const [edit, setEdit] = useState<Partial<HorarioConEstado> | null>(null);

  const guardar = async () => {
    if (!edit?.nombre?.trim() || !area) return;
    await intentar(() =>
      guardarHorario({
        id: edit.id,
        areaId: area,
        nombre: edit.nombre!,
        horaInicio: edit.horaInicio ?? '08:00',
        horaFin: edit.horaFin ?? '16:00',
        diasSemana: edit.diasSemana || '12345',
        activo: edit.activo !== 0,
      }),
    );
    setEdit(null);
    recargar();
  };

  return (
    <>
      <Pinza titulo="Horarios de turno" atras>
        <button disabled={!area} onClick={() => setEdit({ horaInicio: '08:00', horaFin: '16:00', diasSemana: '12345', activo: 1 })}>
          + Nuevo
        </button>
      </Pinza>
      <Hoja>
        <Pestanas items={areas ?? []} valor={area} onCambio={setAreaId} />
        {horarios?.length === 0 && <p class="vacio">Sin horarios. Crea uno para poder abrir turnos.</p>}
        <ul class="renglones">
          {horarios?.map((h) => (
            <li onClick={() => setEdit(h)} style="cursor:pointer">
              <span class="crece">
                <span class="titulo">{h.nombre}</span>
                <Inactivo activo={h.activo} />
                <div class="sec">{textoDias(h.diasSemana)}</div>
              </span>
              <span class="num">
                {h.horaInicio}–{h.horaFin}
              </span>
            </li>
          ))}
        </ul>
        <p class="sec">Si la hora de fin es menor que la de inicio, el turno termina al día siguiente.</p>
      </Hoja>
      {edit && (
        <Formulario titulo={edit.id ? 'Editar horario' : 'Nuevo horario'} onGuardar={guardar} onCerrar={() => setEdit(null)}>
          <Campo id="n" etiqueta="Nombre">
            <input id="n" required placeholder="Mañana" value={edit.nombre ?? ''} onInput={(e) => setEdit({ ...edit, nombre: e.currentTarget.value })} />
          </Campo>
          <div class="fila">
            <div class="crece">
              <Campo id="i" etiqueta="Inicio">
                <input id="i" type="time" required value={edit.horaInicio} onInput={(e) => setEdit({ ...edit, horaInicio: e.currentTarget.value })} />
              </Campo>
            </div>
            <div class="crece">
              <Campo id="f" etiqueta="Fin">
                <input id="f" type="time" required value={edit.horaFin} onInput={(e) => setEdit({ ...edit, horaFin: e.currentTarget.value })} />
              </Campo>
            </div>
          </div>
          <label>Días</label>
          <Dias valor={edit.diasSemana ?? ''} onCambio={(d) => setEdit({ ...edit, diasSemana: d })} />
          {edit.id && <Activo valor={edit.activo !== 0} onCambio={(v) => setEdit({ ...edit, activo: v ? 1 : 0 })} />}
        </Formulario>
      )}
    </>
  );
}
