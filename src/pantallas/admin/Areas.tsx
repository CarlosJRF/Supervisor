import { useState } from 'preact/hooks';
import { Hoja, Pinza, useDatos } from '../../componentes/ui';
import { guardarArea, listarAreas, type Area } from '../../db/repos/catalogo';
import { intentar } from '../../estado';
import { recargarAreas } from '../../servicios/sesion';
import { Activo, Campo, Formulario, Inactivo } from './comunes';

export function Areas() {
  const [areas, recargar] = useDatos(() => listarAreas(undefined, true), []);
  const [edit, setEdit] = useState<Partial<Area> | null>(null);

  const guardar = async () => {
    if (!edit?.nombre?.trim()) return;
    await intentar(() =>
      guardarArea({ id: edit.id, nombre: edit.nombre!, orden: Number(edit.orden ?? areas?.length ?? 0), activo: edit.activo !== 0 }),
    );
    setEdit(null);
    recargar();
    recargarAreas();
  };

  return (
    <>
      <Pinza titulo="Áreas" atras>
        <button onClick={() => setEdit({ activo: 1 })}>+ Nueva</button>
      </Pinza>
      <Hoja>
        <ul class="renglones">
          {areas?.map((a) => (
            <li onClick={() => setEdit(a)} style="cursor:pointer">
              <span class="crece titulo">
                {a.nombre}
                <Inactivo activo={a.activo} />
              </span>
              <span class="sec num">orden {a.orden}</span>
            </li>
          ))}
        </ul>
      </Hoja>
      {edit && (
        <Formulario titulo={edit.id ? 'Editar área' : 'Nueva área'} onGuardar={guardar} onCerrar={() => setEdit(null)}>
          <Campo id="n" etiqueta="Nombre">
            <input id="n" required value={edit.nombre ?? ''} onInput={(e) => setEdit({ ...edit, nombre: e.currentTarget.value })} />
          </Campo>
          <Campo id="o" etiqueta="Orden de las pestañas">
            <input id="o" type="number" value={edit.orden ?? areas?.length ?? 0} onInput={(e) => setEdit({ ...edit, orden: Number(e.currentTarget.value) })} />
          </Campo>
          {edit.id && <Activo valor={edit.activo !== 0} onCambio={(v) => setEdit({ ...edit, activo: v ? 1 : 0 })} />}
        </Formulario>
      )}
    </>
  );
}
