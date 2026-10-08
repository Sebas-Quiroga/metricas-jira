// Vista de listado: cuadrícula de tableros, selección y disparo de métricas.
import { estado, filtros } from '../../nucleo/estado.js';
import { colaMetricas } from '../../nucleo/cola.js';
import { porId } from '../../nucleo/utilidades/dom.js';
import { mostrarMensaje } from '../../componentes/avisos.js';
import { obtenerTablerosFiltrados } from './filtros.js';
import { medirTablero, crearContenidoMetricas } from './metricas.js';

export const pintarCuadricula = () => {
  const cuadricula = porId('cuadriculaTableros');
  const tableros = obtenerTablerosFiltrados();
  porId('conteoVisibles').textContent = tableros.length;
  porId('conteoSeleccionados').textContent = estado.seleccionados.size;
  porId('botonMetricas').disabled = estado.seleccionados.size === 0;
  cuadricula.innerHTML = '';
  if (!estado.conectado) return;
  tableros.forEach(tablero => cuadricula.append(crearTarjeta(tablero)));
  if (!tableros.length) {
    const vacio = document.createElement('div');
    vacio.className = 'aviso';
    vacio.textContent = 'Ningún tablero coincide con los filtros.';
    cuadricula.append(vacio);
  }
};

export const crearTarjeta = tablero => {
  const estaSeleccionado = estado.seleccionados.has(tablero.id);
  const tarjeta = document.createElement('article');
  tarjeta.className = `tablero ${estaSeleccionado ? 'tablero-seleccionado' : ''}`.trim();
  tarjeta.dataset.id = tablero.id;

  const cabecera = document.createElement('div');
  cabecera.className = 'tablero-cabecera';
  cabecera.append(crearTitular(tablero, estaSeleccionado));
  const etiqueta = document.createElement('span');
  etiqueta.className = `etiqueta ${tablero.type === 'scrum' ? 'etiqueta-scrum' : ''}`.trim();
  etiqueta.textContent = tablero.type;
  cabecera.append(etiqueta);

  const meta = document.createElement('div');
  meta.className = 'tablero-meta';
  const proyecto = document.createElement('span');
  proyecto.className = 'proyecto';
  proyecto.textContent = tablero.location?.projectKey || '—';
  const referencia = document.createElement('span');
  referencia.textContent = `Tablero #${tablero.id}`;
  meta.append(proyecto, referencia);
  if (tablero.jqlMetricas) {
    const filtro = document.createElement('span');
    filtro.className = 'jql';
    filtro.textContent = tablero.jqlMetricas;
    meta.append(filtro);
  }

  const metricas = document.createElement('div');
  metricas.className = 'tablero-metricas';
  metricas.dataset.metricas = tablero.id;
  metricas.append(crearContenidoMetricas(tablero.id));

  tarjeta.append(cabecera, meta, metricas);
  return tarjeta;
};

const crearTitular = (tablero, estaSeleccionado) => {
  const contenedor = document.createElement('div');
  contenedor.className = 'tablero-titular';
  const casilla = document.createElement('input');
  casilla.type = 'checkbox';
  casilla.checked = estaSeleccionado;
  casilla.dataset.seleccionar = tablero.id;
  casilla.title = 'Incluir en las métricas';
  const enlace = document.createElement('button');
  enlace.type = 'button';
  enlace.className = 'enlace-tablero';
  enlace.dataset.abrir = tablero.id;
  enlace.title = 'Ver tarjetas del tablero';
  enlace.textContent = tablero.name;
  contenedor.append(casilla, enlace);
  return contenedor;
};

export const cargarMetricas = idBoard => {
  const previo = estado.metricas.get(idBoard);
  if (previo?.estado === 'cargando') return;
  if (previo?.estado === 'ok') {
    pintarCuadricula();
    return;
  }
  estado.metricas.set(idBoard, { estado: 'cargando' });
  pintarCuadricula();
  colaMetricas(() => medirTablero(idBoard))
    .catch(error => {
      estado.metricas.set(idBoard, { estado: 'error', error: error.message });
    })
    .finally(pintarCuadricula);
};

export const refrescarMetricas = idBoard => {
  estado.metricas.delete(idBoard);
  cargarMetricas(idBoard);
};

export const alternarSeleccion = idBoard => {
  if (estado.seleccionados.has(idBoard)) {
    estado.seleccionados.delete(idBoard);
    pintarCuadricula();
    return;
  }
  estado.seleccionados.add(idBoard);
  pintarCuadricula();
  cargarMetricas(idBoard);
};

export const calcularSeleccionados = () => {
  const pendientes = [...estado.seleccionados].filter(idBoard => estado.metricas.get(idBoard)?.estado !== 'ok');
  if (!pendientes.length) {
    mostrarMensaje('Las métricas de los tableros seleccionados ya están al día.', 'aviso-listo');
    pintarCuadricula();
    return;
  }
  mostrarMensaje(`Calculando métricas de ${pendientes.length} tablero(s)…`, 'aviso-listo');
  pendientes.forEach(idBoard => {
    estado.metricas.set(idBoard, { estado: 'cargando' });
  });
  pintarCuadricula();
  Promise.all(
    pendientes.map(idBoard =>
      colaMetricas(() => medirTablero(idBoard)).catch(error =>
        estado.metricas.set(idBoard, { estado: 'error', error: error.message }),
      ),
    ),
  ).then(() => {
    mostrarMensaje('Métricas actualizadas.', 'aviso-listo');
    pintarCuadricula();
  });
};

export const limpiarFiltros = () => {
  filtros.persona = '';
  filtros.proyecto = '';
  porId('filtroPersona').value = '';
  porId('filtroProyecto').value = '';
  pintarCuadricula();
};
