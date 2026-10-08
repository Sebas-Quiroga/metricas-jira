// Punto único de comunicación con Jira a través del proxy local.
import { URL_PROXY, LIMITE_PAGINAS, CAMPOS_METRICAS, CAMPOS_HISTORIAL, TAMANO_LOTE_HISTORIAL } from './constantes.js';
import { estado } from './estado.js';
import { encabezadosJira } from './credenciales.js';

export const obtenerJira = async ruta => {
  const respuesta = await fetch(`${URL_PROXY}/jira${ruta}`, { headers: encabezadosJira() });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const detalle = datos.errorMessages?.join(' · ') || datos.error || `HTTP ${respuesta.status}`;
    throw new Error(detalle);
  }
  return datos;
};

export const obtenerIssuesDelTablero = async (idBoard, opciones = {}) => {
  const { campos = CAMPOS_METRICAS, jql = null, conHistorial = false } = opciones;
  const tableroActual = estado.tableros.find(tablero => tablero.id === idBoard);
  const jqlBusqueda = jql === null ? tableroActual?.jqlMetricas || '' : jql;
  const issues = [];
  let total = 0;
  for (let pagina = 0; pagina < LIMITE_PAGINAS; pagina += 1) {
    const parametros = new URLSearchParams({
      maxResults: '1000',
      startAt: String(pagina * 1000),
      fields: campos,
    });
    if (jqlBusqueda) parametros.set('jql', jqlBusqueda);
    if (conHistorial) parametros.set('expand', 'changelog');
    const respuesta = await obtenerJira(`/rest/agile/1.0/board/${idBoard}/issue?${parametros}`);
    total = respuesta.total;
    issues.push(...(respuesta.issues || []));
    if (issues.length >= total) break;
  }
  return { issues, total };
};

export const obtenerMapaEstados = async () => {
  if (estado.mapaEstados) return estado.mapaEstados;
  const statuses = await obtenerJira('/rest/api/3/status');
  estado.mapaEstados = new Map(statuses.map(item => [String(item.id), item]));
  return estado.mapaEstados;
};

export const obtenerOrdenColumnas = async idBoard => {
  try {
    const configuracion = await obtenerJira(`/rest/agile/1.0/board/${idBoard}/configuration`);
    const columnas = configuracion?.columnConfig?.columns || [];
    const posicionPorId = new Map();
    const nombres = [];
    columnas.forEach((columna, indice) => {
      nombres.push(columna.name);
      (columna.statusIds || []).forEach(idStatus => posicionPorId.set(String(idStatus), indice));
    });
    return { nombres, posicionPorId };
  } catch {
    return { nombres: [], posicionPorId: new Map() };
  }
};

export const obtenerHistorialLote = async claves => {
  const parametros = new URLSearchParams({
    jql: `key in (${claves.join(', ')})`,
    fields: CAMPOS_HISTORIAL,
    expand: 'changelog',
    maxResults: String(TAMANO_LOTE_HISTORIAL),
  });
  const respuesta = await obtenerJira(`/rest/api/3/search/jql?${parametros}`);
  return (respuesta.issues || []).map(issue => ({ clave: issue.key, changelog: issue.changelog }));
};

export const buscarIssuesInforme = async (jql, campos, limite = 500) => {
  const issues = [];
  let token = null;
  do {
    const parametros = new URLSearchParams({ jql, fields: campos, maxResults: '100' });
    if (token) parametros.set('pageToken', token);
    const respuesta = await obtenerJira(`/rest/api/3/search/jql?${parametros}`);
    issues.push(...(respuesta.issues || []));
    token = respuesta.isLast ? null : respuesta.nextPageToken;
  } while (token && issues.length < limite);
  return issues.slice(0, limite);
};
