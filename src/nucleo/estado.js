// Estado global compartido de la aplicación (fuente única de verdad).
export const estado = {
  conectado: false,
  usuario: null,
  tableros: [],
  seleccionados: new Set(),
  metricas: new Map(),
  mapaEstados: null,
  detalle: null,
  informe: null,
};

// Filtros activos de la vista de listado.
export const filtros = { persona: '', proyecto: '' };
