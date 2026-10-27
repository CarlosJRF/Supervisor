import { useState } from 'preact/hooks';
import { Hoja, Pestanas, Pinza, useDatos } from '../../componentes/ui';
import { guardarTrabajador, listarAreas, listarHorarios, listarTrabajadores, type Trabajador } from '../../db/repos/catalogo';
import { intentar } from '../../estado';
import { ir } from '../../router';
import { Activo, Campo, Formulario, Inactivo } from './comunes';

export function Trabajadores() {
  const [areas] = useDatos(() => listarAreas(), []);
  const [areaId, setAreaId] = useState<number | null>(null);
  const area = areaId ?? areas?.[0]?.id ?? null;
  const [lista, recargar] = useDatos(() => (area ? listarTrabajadores(area, true) : Promise.resolve([])), [area]);
  const [horarios] = useDatos(() => (area ? listarHorarios(area) : Promise.resolve([])), [area]);
  const [edit, setEdit] = useState<Partial<Trabajador> | null>(null);

  const guardar = async () => {
    if (!edit?.nombre?.trim() || !area) return;
    await intentar(() =>
      guardarTrabajador({
        id: edit.id,
        nombre: edit.nombre!,
        area_id: edit.area_id ?? area,
        horario_turno_id: edit.horario_turno_id ?? null,
        activo: edit.activo !== 0,
      }),
    );
    setEdit(null);
    recargar();
  };

  return (
    <>
      <Pinza titulo="Trabajadores" atras>
        <button disabled={!area} onClick={() => setEdit({ activo: 1, area_id: area! })}>
          + Nuevo
        </button>
      </Pinza>
      <Hoja>
        <Pestanas items={areas ?? []} valor={area} onCambio={setAreaId} />
        {lista?.length === 0 && <p class="vacio">Sin trabajadores en esta área.</p>}
        <ul class="renglones">
          {lista?.map((t) => (
            <li>
              <span class="crece titulo" onClick={() => setEdit(t)} style="cursor:pointer">
                {t.nombre}
                <Inactivo activo={t.activo} />
                <div class="sec">{horarios?.find((h) => h.id === t.horario_turno_id)?.nombre ?? 'Todos los turnos'}</div>
              </span>
              <button class="chico" onClick={() => ir(`/trabajador/${t.id}`)}>
                Ficha
              </button>
            </li>
          ))}
        </ul>
      </Hoja>
      {edit && (
        <Formulario titulo={edit.id ? 'Editar trabajador' : 'Nuevo trabajador'} onGuardar={guardar} onCerrar={() => setEdit(null)}>
          <Campo id="n" etiqueta="Nombre">
            <input id="n" required value={edit.nombre ?? ''} onInput={(e) => setEdit({ ...edit, nombre: e.currentTarget.value })} />
          </Campo>
          <Campo id="a" etiqueta="Área">
            <select
              id="a"
              value={edit.area_id ?? area ?? ''}
              onChange={(e) => setEdit({ ...edit, area_id: Number(e.currentTarget.value), horario_turno_id: null })}
            >
              {areas?.map((a) => <option value={a.id}>{a.nombre}</option>)}
            </select>
          </Campo>
          <Campo id="h" etiqueta="Turno habitual">
            <select
              id="h"
              value={edit.horario_turno_id ?? ''}
              onChange={(e) => setEdit({ ...edit, horario_turno_id: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
            >
              <option value="">Todos los turnos del área</option>
              {(edit.area_id ?? area) === area && horarios?.map((h) => <option value={h.id}>{h.nombre}</option>)}
            </select>
          </Campo>
          <p class="sec">Solo se evalúa en los turnos que le corresponden.</p>
          {edit.id && <Activo valor={edit.activo !== 0} onCambio={(v) => setEdit({ ...edit, activo: v ? 1 : 0 })} />}
        </Formulario>
      )}
    </>
  );
}
