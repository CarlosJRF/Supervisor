import { useState } from 'preact/hooks';
import { Hoja, Pinza, useDatos } from '../../componentes/ui';
import { actualizarUsuario, areasDeUsuario, crearUsuario, listarUsuarios, type Rol, type Usuario } from '../../db/repos/usuarios';
import { listarAreas } from '../../db/repos/catalogo';
import { avisar, intentar, leerEstado } from '../../estado';
import { pinValido } from '../../servicios/auth';
import { Activo, Campo, Formulario, Inactivo } from './comunes';

type Edicion = Partial<Usuario> & { pin?: string; areaIds: number[] };

export function Usuarios() {
  const [usuarios, recargar] = useDatos(() => listarUsuarios(), []);
  const [areas] = useDatos(() => listarAreas(), []);
  const [asignadas] = useDatos(
    async () => Object.fromEntries(await Promise.all((usuarios ?? []).map(async (u) => [u.id, await areasDeUsuario(u.id)] as const))),
    [usuarios],
  );
  const [edit, setEdit] = useState<Edicion | null>(null);

  const guardar = async () => {
    if (!edit?.nombre?.trim()) return;
    if ((!edit.id || edit.pin) && !pinValido(edit.pin ?? '')) return avisar('El PIN debe tener entre 4 y 6 dígitos.');
    if (edit.id === leerEstado().usuario?.id && edit.activo === 0) return avisar('No puedes desactivar tu propia cuenta.');
    await intentar(async () => {
      if (edit.id)
        await actualizarUsuario(edit.id, { nombre: edit.nombre!, activo: edit.activo !== 0, areaIds: edit.areaIds, pin: edit.pin || undefined });
      else await crearUsuario(edit.nombre!, edit.rol ?? 'supervisor', edit.pin!, edit.areaIds);
    });
    setEdit(null);
    recargar();
  };

  const alternarArea = (id: number) =>
    edit && setEdit({ ...edit, areaIds: edit.areaIds.includes(id) ? edit.areaIds.filter((a) => a !== id) : [...edit.areaIds, id] });

  return (
    <>
      <Pinza titulo="Supervisores" atras>
        <button onClick={() => setEdit({ rol: 'supervisor', activo: 1, areaIds: [] })}>+ Nuevo</button>
      </Pinza>
      <Hoja>
        <p class="sec">Cada supervisor solo ve y opera las áreas que le asignes. El administrador ve todas.</p>
        <ul class="renglones">
          {usuarios?.map((u) => (
            <li onClick={() => setEdit({ ...u, areaIds: asignadas?.[u.id] ?? [] })} style="cursor:pointer">
              <span class="crece">
                <span class="titulo">{u.nombre}</span>
                <Inactivo activo={u.activo} />
                <div class="sec">
                  {u.rol === 'admin'
                    ? 'Administrador · todas las áreas'
                    : (asignadas?.[u.id] ?? []).map((id) => areas?.find((a) => a.id === id)?.nombre).filter(Boolean).join(', ') || 'Sin áreas asignadas'}
                </div>
              </span>
            </li>
          ))}
        </ul>
      </Hoja>
      {edit && (
        <Formulario titulo={edit.id ? 'Editar usuario' : 'Nuevo usuario'} onGuardar={guardar} onCerrar={() => setEdit(null)}>
          <Campo id="n" etiqueta="Nombre">
            <input id="n" required value={edit.nombre ?? ''} onInput={(e) => setEdit({ ...edit, nombre: e.currentTarget.value })} />
          </Campo>
          {!edit.id && (
            <Campo id="r" etiqueta="Rol">
              <select id="r" value={edit.rol} onChange={(e) => setEdit({ ...edit, rol: e.currentTarget.value as Rol })}>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Administrador</option>
              </select>
            </Campo>
          )}
          <Campo id="p" etiqueta={edit.id ? 'Nuevo PIN (dejar vacío para mantener)' : 'PIN (4 a 6 dígitos)'}>
            <input id="p" type="password" inputMode="numeric" maxLength={6} value={edit.pin ?? ''} onInput={(e) => setEdit({ ...edit, pin: e.currentTarget.value })} />
          </Campo>
          {edit.rol !== 'admin' && (
            <>
              <label>Áreas asignadas</label>
              {areas?.map((a) => (
                <label class="check">
                  <input type="checkbox" class="casilla" checked={edit.areaIds.includes(a.id)} onChange={() => alternarArea(a.id)} />
                  {a.nombre}
                </label>
              ))}
            </>
          )}
          {edit.id && <Activo valor={edit.activo !== 0} onCambio={(v) => setEdit({ ...edit, activo: v ? 1 : 0 })} />}
        </Formulario>
      )}
    </>
  );
}
