import type { ComponentChildren } from 'preact';
import { Dialogo } from '../../componentes/ui';
import { NOMBRES_DIAS } from '../../dominio/fechas';

/** Diálogo de edición con Guardar/Cancelar. */
export function Formulario({
  titulo,
  children,
  onGuardar,
  onCerrar,
}: {
  titulo: string;
  children: ComponentChildren;
  onGuardar: () => void;
  onCerrar: () => void;
}) {
  return (
    <Dialogo titulo={titulo} onCerrar={onCerrar}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGuardar();
        }}
      >
        {children}
        <div class="acciones">
          <button class="primario" type="submit">
            Guardar
          </button>
          <button type="button" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

export function Campo({ id, etiqueta, children }: { id: string; etiqueta: string; children: ComponentChildren }) {
  return (
    <>
      <label for={id}>{etiqueta}</label>
      {children}
    </>
  );
}

export function Activo({ valor, onCambio }: { valor: boolean; onCambio: (v: boolean) => void }) {
  return (
    <label class="check">
      <input type="checkbox" class="casilla" checked={valor} onChange={(e) => onCambio(e.currentTarget.checked)} />
      Activo
    </label>
  );
}

/** Selector de días "1234567" (L a D). */
export function Dias({ valor, onCambio, uno }: { valor: string; onCambio: (v: string) => void; uno?: boolean }) {
  const alternar = (d: string) => {
    if (uno) return onCambio(d);
    onCambio(valor.includes(d) ? valor.replace(d, '') : [...valor + d].sort().join(''));
  };
  return (
    <div class="segmentos" role="group" aria-label="Días de la semana">
      {NOMBRES_DIAS.map((n, i) => (
        <button type="button" aria-pressed={valor.includes(String(i + 1))} onClick={() => alternar(String(i + 1))}>
          {n}
        </button>
      ))}
    </div>
  );
}

export const textoDias = (d: string) =>
  d === '1234567' ? 'Todos los días' : d === '12345' ? 'Lunes a viernes' : [...d].map((x) => NOMBRES_DIAS[Number(x) - 1]).join(' ');

export function Inactivo({ activo }: { activo: number }) {
  return activo ? null : <span class="sec"> (inactivo)</span>;
}
