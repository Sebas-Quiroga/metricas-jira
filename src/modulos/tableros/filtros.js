// Filtros globales de la vista de listado.
import { estado, filtros } from '../../nucleo/estado.js';
import { llenarSelector } from '../../nucleo/utilidades/dom.js';

export const pintarSelectorDeFiltros = () => {
  const proyectos = [...new Set(estado.tableros.map(tablero => tablero.location?.projectKey).filter(Boolean))].sort();
  llenarSelector('filtroProyecto', proyectos, 'Todos los proyectos');
};

export const obtenerTablerosFiltrados = () =>
  estado.tableros.filter(tablero => !filtros.proyecto || tablero.location?.projectKey === filtros.proyecto);
