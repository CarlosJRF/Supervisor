import { BannerTurno } from '../componentes/BannerTurno';
import { Hoja, Pinza, Segmentos, useDatos } from '../componentes/ui';
import { useTurno } from '../componentes/useTurno';
import { refrescar, useEstado } from '../estado';
import { calificar, evaluacionesDelTurno, marcarAsistencia } from '../db/repos/turnos';
import { listarCriterios } from '../db/repos/catalogo';
import type { EstadoAsistencia } from '../dominio/candado';

const ASISTENCIA: { valor: EstadoAsistencia; texto: string }[] = [
  { valor: 'presente', texto: 'Presente' },
  { valor: 'ausente', texto: 'Ausente' },
  { valor: 'licencia', texto: 'Licencia' },
];
const NOTAS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ valor: n, texto: String(n) }));

export function Evaluar() {
  const { usuario } = useEstado();
  const [datos] = useTurno();
  const turno = datos?.turno;
  const [filas, recargar] = useDatos(() => (turno ? evaluacionesDelTurno(turno.id) : Promise.resolve([])), [turno?.id]);
  const [criterios] = useDatos(listarCriterios, []);

  if (!datos) return null;
  if (!turno)
    return (
      <>
        <Pinza titulo="Evaluar" atras />
        <Hoja>
          <p class="vacio">No hay un turno abierto en esta área.</p>
        </Hoja>
      </>
    );

  const despues = () => {
    recargar();
    refrescar(); // actualiza el banner
  };

  return (
    <>
      <Pinza titulo={`Evaluar · ${turno.nombre_horario}`} atras>
        <span class="num">
          {datos.total - datos.pendientes.length}/{datos.total}
        </span>
      </Pinza>
      <BannerTurno turno={turno} pendientes={datos.pendientes.length} minutosAviso={datos.config.minutos_aviso} />
      <Hoja>
        <p class="sec">Escala 1 a 7. Marca Ausente o Licencia para excluir a alguien de la evaluación de este turno.</p>
        {filas?.length === 0 && <p class="vacio">No hay personal asignado a este turno.</p>}
        <ul class="renglones">
          {filas?.map((f) => {
            const pendiente = datos.pendientes.includes(f.id);
            return (
              <li style="display:block;padding:12px 0">
                <div class="fila">
                  <strong class="crece">
                    {pendiente ? '○ ' : '● '}
                    {f.nombre}
                  </strong>
                  <Segmentos
                    etiqueta={`Asistencia de ${f.nombre}`}
                    opciones={ASISTENCIA}
                    valor={f.asistencia}
                    onCambio={(v) => marcarAsistencia(turno.id, f.id, v).then(despues)}
                  />
                </div>
                {f.asistencia === 'presente' &&
                  criterios?.map((c) => (
                    <div class="fila" style="margin-top:8px">
                      <span class="crece sec">{c.nombre}</span>
                      <Segmentos
                        etiqueta={`${c.nombre} de ${f.nombre}`}
                        opciones={NOTAS}
                        valor={f.notas[c.id] ?? null}
                        onCambio={(n) => calificar(turno.id, f.id, c.id, n, usuario!.id).then(despues)}
                      />
                    </div>
                  ))}
              </li>
            );
          })}
        </ul>
      </Hoja>
    </>
  );
}
