import { useEffect, useState } from 'preact/hooks';

export function rutaActual(): string {
  return location.hash.replace(/^#/, '') || '/';
}

export function useRuta(): string {
  const [ruta, setRuta] = useState(rutaActual());
  useEffect(() => {
    const f = () => setRuta(rutaActual());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return ruta;
}

export const ir = (ruta: string) => {
  location.hash = ruta;
};

/** Compara "/trabajador/:id" con "/trabajador/5" → { id: "5" }. */
export function coincide(patron: string, ruta: string): Record<string, string> | null {
  const a = patron.split('/');
  const b = ruta.split('/');
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
