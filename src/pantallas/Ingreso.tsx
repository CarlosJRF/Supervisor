import { useState } from 'preact/hooks';
import { Hoja, Pinza, TecladoPin, useDatos } from '../componentes/ui';
import { ingresar, listarUsuarios, type Usuario } from '../db/repos/usuarios';
import { iniciarSesion } from '../servicios/sesion';

export function Ingreso() {
  const [usuarios] = useDatos(() => listarUsuarios(true), []);
  const [elegido, setElegido] = useState<Usuario | null>(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const entrar = async (pin: string) => {
    if (!elegido) return;
    setOcupado(true);
    const u = await ingresar(elegido.id, pin);
    setOcupado(false);
    if (u) await iniciarSesion(u);
    else setError('PIN incorrecto.');
  };

  return (
    <>
      <Pinza titulo="Supervisor" />
      <Hoja estrecha>
        {!elegido ? (
          <>
            <h2>¿Quién eres?</h2>
            <ul class="renglones">
              {usuarios?.map((u) => (
                <li>
                  <button class="link crece" style="text-align:left;text-decoration:none;font-size:18px" onClick={() => setElegido(u)}>
                    {u.nombre}
                  </button>
                  <span class="sec">{u.rol === 'admin' ? 'Administrador' : 'Supervisor'}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2>{elegido.nombre}</h2>
            <p class="sec">Ingresa tu PIN</p>
            <TecladoPin onListo={entrar} deshabilitado={ocupado} />
            {error && <p class="aviso" role="alert">{error}</p>}
            <div class="acciones">
              <button
                class="link"
                onClick={() => {
                  setElegido(null);
                  setError('');
                }}
              >
                Cambiar de usuario
              </button>
            </div>
          </>
        )}
      </Hoja>
    </>
  );
}
