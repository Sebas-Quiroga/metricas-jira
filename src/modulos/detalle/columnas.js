// Columnas del tablero en la vista de detalle.
import { LIMITE_TARJETAS_PINTADAS } from '../../nucleo/constantes.js';
import { porId } from '../../nucleo/utilidades/dom.js';
import { mensajeMetricas } from '../../componentes/base.js';
import { compararEstados, clasePuntoEstado } from './ordenEstados.js';
import { crearTarjetaDetalle } from './tarjetas.js';

const agruparColumnas = (filtrados, detalle) => {
  const grupos = new Map();
  const seleccion = detalle.estadosSeleccionados;
  detalle.issues.forEach(issue => {
    const id = String(issue.fields.status.id);
    if (seleccion.size && !seleccion.has(id)) return;
    grupos.set(id, { id, nombre: issue.fields.status.name, tarjetas: [] });
  });
  filtrados.forEach(issue => {
    const id = String(issue.fields.status.id);
    if (!grupos.has(id)) grupos.set(id, { id, nombre: issue.fields.status.name, tarjetas: [] });
    grupos.get(id).tarjetas.push(issue);
  });
  const ordenado = compararEstados(detalle.ordenColumnas);
  return [...grupos.values()].sort(ordenado).map(grupo => ({
    ...grupo,
    tarjetas: grupo.tarjetas.sort((a, b) => a.key.localeCompare(b.key)),
  }));
};

const crearColumna = (grupo, visibles) => {
  const columna = document.createElement('div');
  columna.className = 'columna';
  const cabecera = document.createElement('div');
  cabecera.className = 'columna-cabecera';
  const punto = document.createElement('span');
  punto.className = `punto ${clasePuntoEstado(grupo.id)}`;
  const nombre = document.createElement('span');
  nombre.textContent = grupo.nombre;
  const contador = document.createElement('b');
  contador.textContent = grupo.tarjetas.length;
  cabecera.append(punto, nombre, contador);

  const cuerpo = document.createElement('div');
  cuerpo.className = 'columna-cuerpo';
  const tarjetasVisibles = grupo.tarjetas.filter(tarjeta => visibles.has(tarjeta));
  if (!tarjetasVisibles.length) {
    const vacia = document.createElement('div');
    vacia.className = 'columna-vacia';
    vacia.textContent = 'Sin tarjetas con el filtro actual';
    cuerpo.append(vacia);
  } else {
    tarjetasVisibles.forEach(issue => cuerpo.append(crearTarjetaDetalle(issue)));
  }
  columna.append(cabecera, cuerpo);
  return columna;
};

export const pintarColumnas = (detalle, filtrados) => {
  const contenedor = porId('detalleColumnas');
  porId('detalleConteo').textContent = filtrados.length;
  contenedor.innerHTML = '';
  const grupos = agruparColumnas(filtrados, detalle);
  if (!grupos.length) {
    contenedor.append(mensajeMetricas('El tablero no tiene tarjetas.', 'metricas-vacias'));
    return;
  }
  const visibles = new Set(filtrados.slice(0, LIMITE_TARJETAS_PINTADAS));
  grupos.forEach(grupo => contenedor.append(crearColumna(grupo, visibles)));
  if (filtrados.length > LIMITE_TARJETAS_PINTADAS) {
    contenedor.prepend(
      mensajeMetricas(
        `Mostrando ${LIMITE_TARJETAS_PINTADAS} de ${filtrados.length} tarjetas. Afina los filtros para ver el resto.`,
        'aviso',
      ),
    );
  }
};
