import { useState } from 'preact/hooks';
import { Hoja, Pinza } from '../componentes/ui';
import { crearUsuario, ingresar } from '../db/repos/usuarios';
import { guardarArea } from '../db/repos/catalogo';
import { transaccion } from '../db/conexion';
import { pinValido } from '../servicios/auth';
import { iniciarSesion } from '../servicios/sesion';
import { intentar } from '../estado';

export function PrimerArranque({ onListo }: { onListo: () => void }) {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [areas, setAreas] = useState('Cocina, Salón, Limpieza');
  const [error, setError] = useState('');

  const crear = async (e: Event) => {
    e.preventDefault();
    if (!nombre.trim()) return setError('Escribe tu nombre.');
    if (!pinValido(pin)) return setError('El PIN debe tener entre 4 y 6 dígitos.');
    if (pin !== pin2) return setError('Los PIN no coinciden.');
    await intentar(async () => {
      const lista = areas.split(',').map((a) => a.trim()).filter(Boolean);
      await transaccion(async () => {
        for (const [i, a] of lista.entries()) await guardarArea({ nombre: a, orden: i, activo: true });
      });
      const id = await crearUsuario(nombre, 'admin', pin);
      const u = await ingresar(id, pin);
      if (u) await iniciarSesion(u);
      onListo();
    });
  };

  return (
    <>
      <Pinza titulo="Supervisor · Configuración inicial" />
      <Hoja estrecha>
        <form onSubmit={crear}>
          <h2>Administrador</h2>
          <p class="sec">Esta cuenta podrá configurar áreas, turnos, personal y supervisores.</p>
          <label for="n">Nombre</label>
          <input id="n" value={nombre} onInput={(e) => setNombre(e.currentTarget.value)} autoComplete="off" />
          <label for="p">PIN (4 a 6 dígitos)</label>
          <input id="p" type="password" inputMode="numeric" maxLength={6} value={pin} onInput={(e) => setPin(e.currentTarget.value)} />
          <label for="p2">Repite el PIN</label>
          <input id="p2" type="password" inputMode="numeric" maxLength={6} value={pin2} onInput={(e) => setPin2(e.currentTarget.value)} />
          <h2>Áreas</h2>
          <label for="a">Separadas por coma</label>
          <input id="a" value={areas} onInput={(e) => setAreas(e.currentTarget.value)} />
          {error && <p class="aviso">{error}</p>}
          <div class="acciones">
            <button class="primario ancho" type="submit">
              Crear y entrar
            </button>
          </div>
        </form>
      </Hoja>
    </>
  );
}
