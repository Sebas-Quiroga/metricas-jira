// Vista de detalle: carga de tarjetas, filtros, selectores y columnas por estado.
import { CAMPOS_DETALLE, LIMITE_TARJETAS_HISTORIAL, TAMANO_LOTE_HISTORIAL } from '../../nucleo/constantes.js';
import { estado } from '../../nucleo/estado.js';
import { colaMetricas } from '../../nucleo/cola.js';
import { porId } from '../../nucleo/utilidades/dom.js';
import {
  obtenerIssuesDelTablero,
  obtenerOrdenColumnas,
  obtenerMapaEstados,
  obtenerHistorialLote,
} from '../../nucleo/servicioJira.js';
import { mensajeMetricas } from '../../componentes/base.js';
import { compararEstados } from './ordenEstados.js';
import { pintarColumnas } from './columnas.js';

let temporizadorHistorial = null;

const mostrarVista = nombre => {
  porId('vistaListado').classList.toggle('oculto', nombre !== 'listado');
  porId('vistaDetalle').classList.toggle('oculto', nombre !== 'detalle');
  window.scrollTo({ top: 0 });
};

export const abrirDetalle = async idBoard => {
  const tablero = estado.tableros.find(item => item.id === idBoard);
  if (!tablero) return;
  estado.detalle = {
    tablero,
    issues: [],
    ordenColumnas: { nombres: [], posicionPorId: new Map() },
    historiales: new Map(),
    asignado: estado.usuario?.accountId || '',
    busqueda: '',
    tipo: '',
    estadosSeleccionados: new Set(),
    selectsPoblados: false,
    cargando: true,
    cargandoHistorial: false,
    error: '',
    aviso: '',
  };
  mostrarVista('detalle');
  pintarDetalle();
  try {
    const [resultado, ordenColumnas] = await Promise.all([
      obtenerIssuesDelTablero(idBoard, { campos: CAMPOS_DETALLE, jql: '' }),
      obtenerOrdenColumnas(idBoard),
      obtenerMapaEstados(),
    ]);
    estado.detalle.issues = resultado.issues;
    estado.detalle.total = resultado.total;
    estado.detalle.ordenColumnas = ordenColumnas;
    estado.detalle.cargando = false;
    estado.detalle.selectsPoblados = false;
    pintarDetalle();
    cargarHistorialesVisibles();
  } catch (error) {
    estado.detalle.cargando = false;
    estado.detalle.error = error.message;
    pintarDetalle();
  }
};

export const cerrarDetalle = () => {
  estado.detalle = null;
  mostrarVista('listado');
};

export const actualizarFiltroDetalle = (campo, valor) => {
  const detalle = estado.detalle;
  if (!detalle) return;
  detalle[campo] = valor;
  pintarDetalle();
  programarCargaHistorial();
};

export const limpiarFiltrosDetalle = () => {
  const detalle = estado.detalle;
  if (!detalle) return;
  detalle.asignado = '';
  detalle.busqueda = '';
  detalle.tipo = '';
  detalle.estadosSeleccionados = new Set();
  porId('detalleBusqueda').value = '';
  pintarDetalle();
  programarCargaHistorial();
};

export const obtenerIssuesFiltrados = () => {
  const detalle = estado.detalle;
  if (!detalle) return [];
  const texto = detalle.busqueda.toLowerCase().trim();
  return detalle.issues.filter(issue => {
    const campos = issue.fields;
    const coincideBusqueda = !texto || `${issue.key} ${campos.summary}`.toLowerCase().includes(texto);
    const idAsignado = campos.assignee?.accountId || 'sin-asignar';
    const coincideAsignado = !detalle.asignado || detalle.asignado === idAsignado;
    const coincideTipo = !detalle.tipo || campos.issuetype?.name === detalle.tipo;
    const seleccion = detalle.estadosSeleccionados;
    const coincideEstado = !seleccion.size || seleccion.has(String(campos.status.id));
    return coincideBusqueda && coincideAsignado && coincideTipo && coincideEstado;
  });
};

const pintarAvisoDetalle = () => {
  const detalle = estado.detalle;
  const contenedor = porId('detalleAviso');
  const avisos = [];
  const visibles = obtenerIssuesFiltrados().length;
  if (detalle.aviso) avisos.push(detalle.aviso);
  if (visibles > LIMITE_TARJETAS_HISTORIAL) {
    avisos.push(
      `El tiempo en estado se calcula para las primeras ${LIMITE_TARJETAS_HISTORIAL} tarjetas filtradas. Usa los filtros para reducir la lista.`,
    );
  }
  contenedor.textContent = avisos.join(' ');
  contenedor.classList.toggle('oculto', avisos.length === 0);
};

const pintarEstadoDetalle = (texto, clase) => {
  const contenedor = porId('detalleColumnas');
  contenedor.innerHTML = '';
  contenedor.append(mensajeMetricas(texto, clase));
};

export const actualizarResumenEstados = () => {
  const seleccion = estado.detalle?.estadosSeleccionados;
  const resumen = porId('detalleEstadoResumen');
  if (!seleccion || !seleccion.size) {
    resumen.textContent = 'Todos los estados';
    return;
  }
  resumen.textContent = seleccion.size === 1 ? '1 estado seleccionado' : `${seleccion.size} estados seleccionados`;
};

const restaurarSelectoresDetalle = () => {
  const detalle = estado.detalle;
  porId('detalleAsignado').value = detalle.asignado;
  porId('detalleTipo').value = detalle.tipo;
  porId('detalleEstadosPanel')
    .querySelectorAll('input[data-estado-seleccion]')
    .forEach(casilla => {
      casilla.checked = detalle.estadosSeleccionados.has(casilla.value);
    });
  actualizarResumenEstados();
};

const poblarSelectoresDetalle = () => {
  const detalle = estado.detalle;
  const personas = new Map();
  const tipos = new Set();
  const estados = new Map();
  detalle.issues.forEach(issue => {
    const campos = issue.fields;
    if (campos.assignee) personas.set(campos.assignee.accountId, campos.assignee.displayName);
    tipos.add(campos.issuetype?.name || 'Sin tipo');
    estados.set(String(campos.status.id), campos.status.name);
  });

  const selectorAsignado = porId('detalleAsignado');
  selectorAsignado.innerHTML = '';
  selectorAsignado.append(new Option('Todas las personas', ''), new Option('Sin asignar', 'sin-asignar'));
  [...personas.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([id, nombre]) => selectorAsignado.append(new Option(nombre, id)));
  if (estado.usuario?.accountId && !personas.has(estado.usuario.accountId)) {
    selectorAsignado.append(new Option(estado.usuario.displayName, estado.usuario.accountId));
  }

  const selectorTipo = porId('detalleTipo');
  selectorTipo.innerHTML = '';
  selectorTipo.append(new Option('Todos los tipos', ''));
  [...tipos].sort().forEach(nombre => selectorTipo.append(new Option(nombre, nombre)));

  const panelEstados = porId('detalleEstadosPanel');
  panelEstados.innerHTML = '';
  [...estados.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort(compararEstados(detalle.ordenColumnas))
    .forEach(({ id, nombre }) => {
      const opcion = document.createElement('label');
      opcion.className = 'multiselect-opcion';
      const casilla = document.createElement('input');
      casilla.type = 'checkbox';
      casilla.value = id;
      casilla.dataset.estadoSeleccion = id;
      const texto = document.createElement('span');
      texto.textContent = nombre;
      opcion.append(casilla, texto);
      panelEstados.append(opcion);
    });

  restaurarSelectoresDetalle();
};

export const pintarDetalle = () => {
  const detalle = estado.detalle;
  if (!detalle) return;
  porId('detalleTitulo').textContent = detalle.tablero.name;
  porId('detalleSubtitulo').textContent =
    `${detalle.tablero.location?.projectKey || ''} · Tablero #${detalle.tablero.id}` +
    `${detalle.tablero.jqlMetricas ? ` · ${detalle.tablero.jqlMetricas}` : ''}`;
  const chip = porId('detalleEstadoCarga');
  if (detalle.cargando) {
    chip.textContent = 'Cargando…';
    chip.className = 'chip';
  }
  if (detalle.cargandoHistorial) {
    chip.textContent = 'Calculando tiempos…';
    chip.className = 'chip';
  }
  if (!detalle.cargando && !detalle.cargandoHistorial) {
    chip.textContent = `${detalle.issues.length} tarjetas en el tablero`;
    chip.className = 'chip chip-ok';
  }
  pintarAvisoDetalle();
  if (detalle.selectsPoblados) restaurarSelectoresDetalle();
  if (detalle.cargando) {
    pintarEstadoDetalle('Cargando tarjetas del tablero…', 'metricas-cargando');
    return;
  }
  if (detalle.error) {
    pintarEstadoDetalle(`No se pudo abrir el tablero: ${detalle.error}`, 'metricas-error');
    return;
  }
  if (!detalle.selectsPoblados) {
    poblarSelectoresDetalle();
    detalle.selectsPoblados = true;
  }
  pintarColumnas(detalle, obtenerIssuesFiltrados());
};

export const programarCargaHistorial = () => {
  clearTimeout(temporizadorHistorial);
  temporizadorHistorial = setTimeout(cargarHistorialesVisibles, 400);
};

const cargarHistorialesVisibles = async () => {
  const detalle = estado.detalle;
  if (!detalle || detalle.cargando || detalle.cargandoHistorial) return;
  const pendientes = obtenerIssuesFiltrados()
    .slice(0, LIMITE_TARJETAS_HISTORIAL)
    .filter(issue => !detalle.historiales.has(issue.key))
    .map(issue => issue.key);
  if (!pendientes.length) {
    pintarColumnas(detalle, obtenerIssuesFiltrados());
    return;
  }

  detalle.cargandoHistorial = true;
  pintarDetalle();
  for (let indice = 0; indice < pendientes.length; indice += TAMANO_LOTE_HISTORIAL) {
    const lote = pendientes.slice(indice, indice + TAMANO_LOTE_HISTORIAL);
    try {
      const historiales = await colaMetricas(() => obtenerHistorialLote(lote));
      historiales.forEach(item => detalle.historiales.set(item.clave, item.changelog));
    } catch (error) {
      detalle.aviso = `No se pudo cargar el historial: ${error.message}`;
    }
    pintarColumnas(detalle, obtenerIssuesFiltrados());
  }
  detalle.cargandoHistorial = false;
  pintarDetalle();
  programarCargaHistorial();
};
