const ITERACIONES = 120_000;

const aHex = (b: ArrayBuffer | Uint8Array) =>
  Array.from(b instanceof Uint8Array ? b : new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
const deHex = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));

async function derivar(pin: string, sal: Uint8Array): Promise<string> {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: ITERACIONES },
    clave,
    256,
  );
  return aHex(bits);
}

export async function hashPin(pin: string): Promise<{ hash: string; sal: string }> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return { hash: await derivar(pin, sal), sal: aHex(sal) };
}

export async function verificarPin(pin: string, hash: string, sal: string): Promise<boolean> {
  return (await derivar(pin, deHex(sal))) === hash;
}

export const pinValido = (pin: string) => /^\d{4,6}$/.test(pin);
