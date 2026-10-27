import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function aBase64(blob: Blob): Promise<string> {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = () => mal(r.error);
    r.readAsDataURL(blob);
  });
}

/** Guarda el archivo en caché y abre el menú Compartir de Android; en el navegador lo descarga. */
export async function compartirArchivo(blob: Blob, nombre: string, titulo: string) {
  if (!Capacitor.isNativePlatform()) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return;
  }
  const { uri } = await Filesystem.writeFile({ path: nombre, data: await aBase64(blob), directory: Directory.Cache });
  await Share.share({ title: titulo, files: [uri], dialogTitle: titulo });
}

/** Lee un archivo elegido por el usuario (para restaurar respaldos). */
export function elegirArchivo(accept: string): Promise<File | null> {
  return new Promise((ok) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => ok(input.files?.[0] ?? null);
    input.click();
  });
}
