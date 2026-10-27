import { useState } from 'preact/hooks';
import { Dialogo, Hoja, Pinza, TecladoPin } from '../../componentes/ui';
import { exportarJson, importarJson } from '../../db/conexion';
import { ingresar } from '../../db/repos/usuarios';
import { avisar, intentar, leerEstado } from '../../estado';
import { fechaISO } from '../../dominio/fechas';
import { compartirArchivo, elegirArchivo } from '../../servicios/compartir';
import { cerrarSesion } from '../../servicios/sesion';

export function Respaldo() {
  const [archivo, setArchivo] = useState<File | null>(null);

  const exportar = () =>
    intentar(async () => {
      const json = await exportarJson();
      const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
      await compartirArchivo(blob, `supervisor-respaldo-${fechaISO(new Date()).replace(/-/g, '')}.json`, 'Respaldo de Supervisor');
    });

  const restaurar = async (pin: string) => {
    const u = leerEstado().usuario;
    if (!u || !archivo) return;
    if (!(await ingresar(u.id, pin))) return avisar('PIN incorrecto.');
    const ok = await intentar(async () => {
      const json = JSON.parse(await archivo.text());
      if (!json?.tables) throw new Error('El archivo no es un respaldo de Supervisor.');
      await importarJson(json);
      return true;
    });
    setArchivo(null);
    if (ok) {
      avisar('Respaldo restaurado. Vuelve a ingresar.');
      cerrarSesion('salir');
    }
  };

  return (
    <>
      <Pinza titulo="Respaldo" atras />
      <Hoja estrecha>
        <h2>Exportar</h2>
        <p class="sec">Guarda una copia completa de los datos y compártela (Drive, correo, WhatsApp). Recomendado una vez por semana.</p>
        <button class="primario ancho" onClick={exportar}>
          Crear respaldo
        </button>
        <h2>Restaurar</h2>
        <p class="sec">Reemplaza todos los datos actuales por los del archivo. No se puede deshacer.</p>
        <button class="ancho" onClick={async () => setArchivo(await elegirArchivo('application/json,.json'))}>
          Elegir archivo…
        </button>
      </Hoja>
      {archivo && (
        <Dialogo titulo="Confirmar restauración" onCerrar={() => setArchivo(null)}>
          <p>
            Se reemplazarán todos los datos por <strong>{archivo.name}</strong>. Ingresa tu PIN de administrador.
          </p>
          <TecladoPin texto="Restaurar" onListo={restaurar} />
        </Dialogo>
      )}
    </>
  );
}
