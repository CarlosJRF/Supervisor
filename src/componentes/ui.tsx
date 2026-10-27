import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Medalla as TipoMedalla } from '../dominio/ranking';
import { useToast } from '../estado';

export function Pinza({ titulo, atras, children }: { titulo: string; atras?: boolean; children?: ComponentChildren }) {
  return (
    <header class="pinza">
      {atras && (
        <button aria-label="Volver" onClick={() => history.back()}>
          ←
        </button>
      )}
      <h1>{titulo}</h1>
      {children}
    </header>
  );
}

export function Hoja({ children, estrecha }: { children: ComponentChildren; estrecha?: boolean }) {
  return <main class={`hoja${estrecha ? ' estrecha' : ''}`}>{children}</main>;
}

export function Segmentos<T extends string | number>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T | null;
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div class="segmentos" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button type="button" aria-pressed={o.valor === valor} onClick={() => onCambio(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function Pestanas<T extends number | string>({
  items,
  valor,
  onCambio,
}: {
  items: { id: T; nombre: string }[];
  valor: T | null;
  onCambio: (id: T) => void;
}) {
  if (items.length < 2) return null;
  return (
    <nav class="pestanas" role="tablist">
      {items.map((i) => (
        <button role="tab" aria-selected={i.id === valor} onClick={() => onCambio(i.id)}>
          {i.nombre}
        </button>
      ))}
    </nav>
  );
}

const NUM: Record<NonNullable<TipoMedalla>, string> = { oro: '1', plata: '2', bronce: '3' };
const NOMBRE: Record<NonNullable<TipoMedalla>, string> = { oro: 'Oro', plata: 'Plata', bronce: 'Bronce' };

export function Medalla({ tipo, posicion }: { tipo: TipoMedalla; posicion: number }) {
  if (!tipo) return <span class="medalla nada">{posicion}</span>;
  return (
    <span class={`medalla ${tipo}`} title={`Medalla de ${NOMBRE[tipo]}`} aria-label={`Medalla de ${NOMBRE[tipo]}`}>
      <span>{NUM[tipo]}</span>
    </span>
  );
}

export function Dialogo({ titulo, children, onCerrar }: { titulo: string; children: ComponentChildren; onCerrar?: () => void }) {
  return (
    <div class="velo" onClick={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div class="dialogo" role="dialog" aria-modal="true" aria-label={titulo}>
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  );
}

export function Toast() {
  const t = useToast();
  if (!t) return null;
  return (
    <div class="toast" role="status">
      <span>{t.texto}</span>
      {t.accion && <button onClick={t.accion.fn}>{t.accion.texto}</button>}
    </div>
  );
}

export function TecladoPin({ onListo, texto = 'Entrar', deshabilitado }: { onListo: (pin: string) => void; texto?: string; deshabilitado?: boolean }) {
  const [pin, setPin] = useState('');
  const tecla = (d: string) => !deshabilitado && setPin((p) => (p.length < 6 ? p + d : p));
  return (
    <div>
      <div class="pin-puntos" aria-label={`${pin.length} dígitos`}>
        {Array.from({ length: 6 }, (_, i) => (
          <i class={i < pin.length ? 'lleno' : ''} />
        ))}
      </div>
      <div class="teclado">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button onClick={() => tecla(d)}>{d}</button>
        ))}
        <button onClick={() => setPin('')} aria-label="Borrar todo">
          C
        </button>
        <button onClick={() => tecla('0')}>0</button>
        <button onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Borrar">
          ⌫
        </button>
      </div>
      <div class="acciones">
        <button
          class="primario ancho"
          disabled={pin.length < 4 || deshabilitado}
          onClick={() => {
            onListo(pin);
            setPin('');
          }}
        >
          {texto}
        </button>
      </div>
    </div>
  );
}

/** Carga datos asíncronos y los recarga cuando cambian las dependencias. */
export function useDatos<T>(fn: () => Promise<T>, deps: unknown[]): [T | undefined, () => void] {
  const [datos, setDatos] = useState<T>();
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    fn().then((d) => vivo && setDatos(d));
    return () => {
      vivo = false;
    };
  }, [...deps, n]);
  return [datos, () => setN((x) => x + 1)];
}
