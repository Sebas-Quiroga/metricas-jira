// Conexión inicial con Jira y carga de tableros habilitados.
import { TABLEROS_DESEADOS } from '../../nucleo/constantes.js';
import { estado, filtros } from '../../nucleo/estado.js';
import { porId } from '../../nucleo/utilidades/dom.js';
import { obtenerJira, obtenerMapaEstados } from '../../nucleo/servicioJira.js';
import { pintarLuzConexion, mostrarMensaje, ocultarMensaje } from '../../componentes/avisos.js';
import { pintarSelectorDeFiltros } from '../tableros/filtros.js';
import { pintarCuadricula, refrescarMetricas } from '../tableros/listado.js';
import { actualizarSelectorPersonas } from '../tableros/personas.js';

export const obtenerTablerosPermitidos = tableros =>
  TABLEROS_DESEADOS.map(deseado => {
    const tablero = tableros.find(item => item.id === deseado.id);
    return tablero ? { ...tablero, jqlMetricas: deseado.jql } : null;
  }).filter(Boolean);

export const conectar = async () => {
  const luz = porId('luzConexion');
  luz.disabled = true;
  pintarLuzConexion('cargando', 'Conectando con Jira…');
  try {
    const [usuario, tableros] = await Promise.all([
      obtenerJira('/rest/api/3/myself'),
      obtenerJira('/rest/agile/1.0/board?maxResults=100'),
    ]);
    estado.usuario = usuario;
    estado.conectado = true;
    estado.tableros = obtenerTablerosPermitidos(tableros.values || []);
    if (!filtros.persona) filtros.persona = usuario.accountId || '';
    pintarLuzConexion('ok', `Conectado como ${usuario.displayName}`);
    porId('usuarioConexion').textContent = usuario.emailAddress;
    porId('marcaSubtitulo').textContent = `${usuario.displayName} · itmerp.atlassian.net`;
    pintarSelectorDeFiltros();
    actualizarSelectorPersonas();
    pintarCuadricula();
    ocultarMensaje();
    estado.tableros.forEach(tablero => refrescarMetricas(tablero.id));
    obtenerMapaEstados().catch(() => {});
  } catch (error) {
    estado.conectado = false;
    pintarLuzConexion('error', 'Sin conexión — clic para reintentar');
    mostrarMensaje(
      `No se pudo conectar: ${error.message}. Revisa que el proxy esté corriendo (node proxy.js).`,
      'aviso-error',
    );
  } finally {
    luz.disabled = false;
  }
};
