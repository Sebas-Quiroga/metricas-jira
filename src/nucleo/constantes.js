// Configuración global y valores constantes del módulo de métricas Jira.
// El proxy vive en el mismo host que sirve la app, en el puerto 8787.
export const URL_PROXY = `${window.location.protocol}//${window.location.hostname}:8787`;
export const LIMITE_PAGINAS = 3;
export const TIPOS_DEFECTO = ['bug', 'error', 'defecto', 'incidencia'];
export const CAMPOS_METRICAS = 'status,issuetype,assignee,created,resolution';
export const CAMPOS_DETALLE =
  'status,summary,assignee,issuetype,priority,created,updated,resolution,reporter,labels,components,duedate,customfield_10412';
export const CAMPOS_HISTORIAL = 'status';

// Estimación: 1 punto = 2 horas de trabajo del desarrollador.
export const CAMPO_ESTIMACION_PUNTOS = 'customfield_10412';
export const HORAS_POR_PUNTO = 2;

// Estados donde aplica el tiempo de estimación (normalizados en minúsculas y sin puntos).
export const ESTADOS_ESTIMACION = ['en curso dev', 'en curso devo', 'en curso rt'];

export const TAMANO_LOTE_HISTORIAL = 40;
export const LIMITE_TARJETAS_HISTORIAL = 200;
export const LIMITE_TARJETAS_PINTADAS = 400;
export const LIMITE_TARJETAS_INFORME = 300;

export const ORDEN_CATEGORIA = { new: 0, indeterminate: 1, done: 2 };

// Tableros habilitados con su JQL de métricas opcional.
export const TABLEROS_DESEADOS = [
  { id: 76, jql: 'assignee = currentUser()' },
  { id: 78, jql: '' },
  { id: 75, jql: '' },
  { id: 79, jql: 'assignee = currentUser()' },
  { id: 67, jql: 'assignee = currentUser()' },
];

export const ESTADOS_FINALIZADO = ['FINALIZADO', 'Finalizada'];
