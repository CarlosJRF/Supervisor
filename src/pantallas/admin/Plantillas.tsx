import { useState } from 'preact/hooks';
import { Hoja, Pestanas, Pinza, Segmentos, useDatos } from '../../componentes/ui';
import { guardarPlantilla, listarAreas, listarHorarios, listarPlantillas, listarTrabajadores, type Plantilla } from '../../db/repos/catalogo';
import { intentar } from '../../estado';
import { Activo, Campo, Dias, Formulario, Inactivo, textoDias } from './comunes';

const DIFICULTAD = [1, 2, 3, 4, 5].map((n) => ({ valor: n, texto: String(n) }));

export function Plantillas() {
  const [areas] = useDatos(() => listarAreas(), []);
  const [areaId, setAreaId] = useState<number | null>(null);
  const area = areaId ?? areas?.[0]?.id ?? null;
  const [lista, recargar] = useDatos(() => (area ? listarPlantillas(area, true) : Promise.resolve([])), [area]);
  const [horarios] = useDatos(() => (area ? listarHorarios(area) : Promise.resolve([])), [area]);
  const [personal] = useDatos(() => (area ? listarTrabajadores(area) : Promise.resolve([])), [area]);
  const [edit, setEdit] = useState<Partial<Plantilla> | null>(null);

  const guardar = async () => {
    if (!edit?.nombre?.trim() || !area) return;
    await intentar(() =>
      guardarPlantilla({
        id: edit.id,
        area_id: area,
        nombre: edit.nombre!,
        descripcion: edit.descripcion ?? '',
        dificultad: edit.dificultad ?? 1,
        recurrencia: edit.recurrencia ?? 'diaria',
        dias_semana: edit.dias_semana || '1234567',
        horario_turno_id: edit.horario_turno_id ?? null,
        trabajador_id: edit.trabajador_id ?? null,
        activo: edit.activo !== 0,
      }),
    );
    setEdit(null);
    recargar();
  };

  return (
    <>
      <Pinza titulo="Plantillas de tareas" atras>
        <button disabled={!area} onClick={() => setEdit({ dificultad: 1, recurrencia: 'diaria', dias_semana: '1234567', activo: 1 })}>
          + Nueva
        </button>
      </Pinza>
      <Hoja>
        <Pestanas items={areas ?? []} valor={area} onCambio={setAreaId} />
        {lista?.length === 0 && <p class="vacio">Sin tareas. Se generan automáticamente al abrir cada turno.</p>}
        <ul class="renglones">
          {lista?.map((p) => (
            <li onClick={() => setEdit(p)} style="cursor:pointer">
              <span class="crece">
                <span class="titulo">{p.nombre}</span>
                <Inactivo activo={p.activo} />
                <div class="sec">
                  {textoDias(p.dias_semana)} · {horarios?.find((h) => h.id === p.horario_turno_id)?.nombre ?? 'todo turno'} ·{' '}
                  {personal?.find((w) => w.id === p.trabajador_id)?.nombre ?? 'sin asignar'}
                </div>
              </span>
              <span class="num" title="Dificultad">
                {'■'.repeat(p.dificultad)}
                {'□'.repeat(5 - p.dificultad)}
              </span>
            </li>
          ))}
        </ul>
      </Hoja>
      {edit && (
        <Formulario titulo={edit.id ? 'Editar tarea' : 'Nueva tarea'} onGuardar={guardar} onCerrar={() => setEdit(null)}>
          <Campo id="n" etiqueta="Nombre">
            <input id="n" required value={edit.nombre ?? ''} onInput={(e) => setEdit({ ...edit, nombre: e.currentTarget.value })} />
          </Campo>
          <Campo id="d" etiqueta="Descripción">
            <input id="d" value={edit.descripcion ?? ''} onInput={(e) => setEdit({ ...edit, descripcion: e.currentTarget.value })} />
          </Campo>
          <label>Dificultad (= puntos)</label>
          <Segmentos etiqueta="Dificultad" opciones={DIFICULTAD} valor={edit.dificultad ?? 1} onCambio={(v) => setEdit({ ...edit, dificultad: v })} />
          <label>Recurrencia</label>
          <Segmentos
            etiqueta="Recurrencia"
            opciones={[
              { valor: 'diaria', texto: 'Diaria' },
              { valor: 'semanal', texto: 'Semanal' },
            ]}
            valor={edit.recurrencia ?? 'diaria'}
            onCambio={(v) => setEdit({ ...edit, recurrencia: v, dias_semana: v === 'semanal' ? '1' : '1234567' })}
          />
          <label>{edit.recurrencia === 'semanal' ? 'Día de la semana' : 'Días'}</label>
          <Dias uno={edit.recurrencia === 'semanal'} valor={edit.dias_semana ?? ''} onCambio={(d) => setEdit({ ...edit, dias_semana: d })} />
          <Campo id="h" etiqueta="Turno">
            <select
              id="h"
              value={edit.horario_turno_id ?? ''}
              onChange={(e) => setEdit({ ...edit, horario_turno_id: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
            >
              <option value="">Todos los turnos</option>
              {horarios?.map((h) => <option value={h.id}>{h.nombre}</option>)}
            </select>
          </Campo>
          <Campo id="t" etiqueta="Responsable">
            <select
              id="t"
              value={edit.trabajador_id ?? ''}
              onChange={(e) => setEdit({ ...edit, trabajador_id: e.currentTarget.value ? Number(e.currentTarget.value) : null })}
            >
              <option value="">Se asigna en el turno</option>
              {personal?.map((w) => <option value={w.id}>{w.nombre}</option>)}
            </select>
          </Campo>
          {edit.id && <Activo valor={edit.activo !== 0} onCambio={(v) => setEdit({ ...edit, activo: v ? 1 : 0 })} />}
        </Formulario>
      )}
    </>
  );
}
