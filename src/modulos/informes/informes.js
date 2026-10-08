// Modal de informes: finalizadas por tablero y tiempo por tarjeta.
import { ESTADOS_FINALIZADO, LIMITE_TARJETAS_INFORME, TAMANO_LOTE_HISTORIAL } from '../../nucleo/constantes.js';
import { estado } from '../../nucleo/estado.js';
import { colaMetricas } from '../../nucleo/cola.js';
import { porId } from '../../nucleo/utilidades/dom.js';
import { buscarIssuesInforme, obtenerHistorialLote } from '../../nucleo/servicioJira.js';
import { formatearFecha, parsearFechaIso } from '../../nucleo/utilidades/fechas.js';
import { formatearDuracion, formatearDuracionCalendario } from '../../nucleo/utilidades/tiempos.js';
import { construirTramos, consolidarTramos, recortarTramos } from '../historial/tramos.js';
import { crearTablaConsolidado } from '../historial/tablaConsolidado.js';
import { personasConUsuario } from '../tableros/personas.js';

const COLUMNAS_FINALIZADAS = ['Tablero', 'Clave', 'Resumen', 'Tipo', 'Persona', 'Finalizada el'];
const COLUMNAS_TIEMPO = [
  'Tablero',
  'Clave',
  'Resumen',
  'Persona',
  'Estado',
  'Veces',
  'Tiempo jornada',
  'Crudo (calendario)',
  '% del ciclo',
];

export const mostrarAvisoInforme = (texto, clase) => {
  const aviso = porId('informeAviso');
  aviso.textContent = texto;
  aviso.className = clase ? `aviso ${clase}` : 'aviso oculto';
};

const habilitarExportacion = activa => {
  porId('botonExportarExcel').disabled = !activa;
  porId('botonExportarPdf').disabled = !activa;
};

export const abrirInforme = () => {
  const selector = porId('informePersona');
  const actual = selector.value || estado.usuario?.accountId || '';
  selector.innerHTML = '';
  selector.append(new Option('Todas las personas', ''));
  [...personasConUsuario().entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))
    .forEach(([accountId, nombre]) => selector.append(new Option(nombre, accountId)));
  selector.value = actual;
  porId('informeResultado').innerHTML = '';
  estado.informe = null;
  habilitarExportacion(false);
  mostrarAvisoInforme('', '');
  porId('modalInforme').classList.remove('oculto');
};

export const cerrarInforme = () => porId('modalInforme').classList.add('oculto');

const jqlConPersona = (base, accountId) => (accountId ? `${base} AND assignee = "${accountId}"` : base);

const proyectosHabilitados = () =>
  [...new Set(estado.tableros.map(tablero => tablero.location?.projectKey).filter(Boolean))];

const crearResumenInforme = texto => {
  const resumen = document.createElement('div');
  resumen.className = 'informe-resumen';
  resumen.textContent = texto;
  return resumen;
};

const crearSeccionesInforme = (tituloTablero, issues, creador) => {
  const seccion = document.createElement('div');
  const titulo = document.createElement('div');
  titulo.className = 'seccion-titulo';
  titulo.textContent = `${tituloTablero} · ${issues.length} tarjeta(s)`;
  seccion.append(titulo);
  if (!issues.length) {
    seccion.append(crearResumenInforme('Sin tarjetas en este tablero para el periodo.'));
    return [seccion];
  }
  seccion.append(...creador(issues));
  return [seccion];
};

const tablaFinalizadas = issues => {
  const tabla = document.createElement('table');
  tabla.className = 'tabla-recorrido';
  tabla.innerHTML =
    '<thead><tr><th>Clave</th><th>Resumen</th><th>Tipo</th><th>Persona</th><th class="num">Finalizada el</th></tr></thead>';
  const cuerpo = document.createElement('tbody');
  issues.forEach(issue => {
    const campos = issue.fields;
    const fila = document.createElement('tr');
    const celdas = [
      issue.key,
      campos.summary,
      campos.issuetype?.name || '—',
      campos.assignee?.displayName || 'Sin asignar',
      campos.resolutiondate ? formatearFecha(campos.resolutiondate) : '—',
    ];
    celdas.forEach((valor, indice) => {
      const celda = document.createElement('td');
      if (indice === 4) celda.className = 'num';
      celda.textContent = valor;
      fila.append(celda);
    });
    cuerpo.append(fila);
  });
  tabla.append(cuerpo);
  return tabla;
};

const informeFinalizadas = async ({ inicio, fin, persona }) => {
  const nombres = ESTADOS_FINALIZADO.map(nombre => `"${nombre}"`).join(',');
  const jql = jqlConPersona(
    `project in (${proyectosHabilitados().join(',')}) AND status CHANGED TO (${nombres}) DURING ("${inicio}","${fin}")`,
    persona,
  );
  const issues = await buscarIssuesInforme(jql, 'summary,status,assignee,issuetype,resolutiondate,created');
  const contenedor = porId('informeResultado');
  contenedor.append(
    crearResumenInforme(`${issues.length} tarjeta(s) finalizada(s) del ${formatearFecha(inicio)} al ${formatearFecha(fin)}.`),
  );

  const filas = [];
  estado.tableros.forEach(tablero => {
    const delTablero = issues.filter(issue => issue.key.startsWith(`${tablero.location?.projectKey}-`));
    delTablero.forEach(issue =>
      filas.push([
        tablero.name,
        issue.key,
        issue.fields.summary,
        issue.fields.issuetype?.name || '',
        issue.fields.assignee?.displayName || 'Sin asignar',
        issue.fields.resolutiondate ? formatearFecha(issue.fields.resolutiondate) : '',
      ]),
    );
    contenedor.append(
      ...crearSeccionesInforme(tablero.name, delTablero, lista => {
        const envoltura = document.createElement('div');
        envoltura.className = 'informe-tabla';
        envoltura.append(tablaFinalizadas(lista));
        return [envoltura];
      }),
    );
  });

  estado.informe = {
    titulo: 'Finalizadas por tablero',
    periodo: `${formatearFecha(inicio)} al ${formatearFecha(fin)}`,
    archivo: `informe-finalizadas-${inicio}_${fin}`,
    columnas: COLUMNAS_FINALIZADAS,
    filas,
  };
};

const cargarHistorialesInforme = async issues => {
  for (let indice = 0; indice < issues.length; indice += TAMANO_LOTE_HISTORIAL) {
    const lote = issues.slice(indice, indice + TAMANO_LOTE_HISTORIAL);
    mostrarAvisoInforme(`Calculando tiempos… ${indice}/${issues.length}`, 'aviso-listo');
    try {
      const historiales = await colaMetricas(() => obtenerHistorialLote(lote.map(issue => issue.key)));
      const porClave = new Map(historiales.map(item => [item.clave, item.changelog]));
      lote.forEach(issue => {
        issue._changelog = porClave.get(issue.key);
      });
    } catch (error) {
      mostrarAvisoInforme(`No se pudo cargar el historial: ${error.message}`, 'aviso-error');
    }
  }
  mostrarAvisoInforme('', '');
};

const acumularFilasTiempo = (filas, tablero, issue, tramos) => {
  const consolidado = consolidarTramos(tramos);
  const total = consolidado.reduce((suma, registro) => suma + registro.milisegundos, 0) || 1;
  consolidado.forEach(registro => {
    filas.push([
      tablero,
      issue.key,
      issue.fields.summary,
      issue.fields.assignee?.displayName || 'Sin asignar',
      registro.estado,
      registro.veces,
      formatearDuracion(registro.milisegundos),
      formatearDuracionCalendario(registro.milisegundosCrudos),
      `${Math.round((registro.milisegundos / total) * 100)}%`,
    ]);
  });
};

const crearBloqueTiempo = (issue, tramos) => {
  const cabecera = document.createElement('div');
  cabecera.className = 'informe-tarjeta-titulo';
  const clave = document.createElement('b');
  clave.textContent = issue.key;
  const resumen = document.createElement('span');
  resumen.textContent = issue.fields.summary;
  const asignado = document.createElement('span');
  asignado.textContent = issue.fields.assignee?.displayName || 'Sin asignar';
  cabecera.append(clave, resumen, asignado);

  const bloque = document.createElement('div');
  bloque.className = 'informe-tarjeta';
  bloque.append(cabecera, crearTablaConsolidado(tramos, issue));
  return bloque;
};

const informeTiempo = async ({ inicio, fin, persona }) => {
  const jql = jqlConPersona(
    `project in (${proyectosHabilitados().join(',')}) AND status CHANGED DURING ("${inicio}","${fin}")`,
    persona,
  );
  const issues = await buscarIssuesInforme(jql, 'summary,status,assignee,issuetype,created', LIMITE_TARJETAS_INFORME);
  const contenedor = porId('informeResultado');
  contenedor.append(
    crearResumenInforme(
      `${issues.length} tarjeta(s) con cambios de estado del ${formatearFecha(inicio)} al ${formatearFecha(fin)} (máx. ${LIMITE_TARJETAS_INFORME}).`,
    ),
  );
  await cargarHistorialesInforme(issues);

  const inicioMs = new Date(`${inicio}T00:00:00`).getTime();
  const finMs = new Date(`${fin}T23:59:59`).getTime();
  const filas = [];
  estado.tableros.forEach(tablero => {
    const delTablero = issues.filter(issue => issue.key.startsWith(`${tablero.location?.projectKey}-`));
    contenedor.append(
      ...crearSeccionesInforme(tablero.name, delTablero, lista =>
        lista.flatMap(issue => {
          const tramos = recortarTramos(construirTramos(issue, issue._changelog), inicioMs, finMs);
          acumularFilasTiempo(filas, tablero.name, issue, tramos);
          return [crearBloqueTiempo(issue, tramos)];
        }),
      ),
    );
  });

  estado.informe = {
    titulo: 'Tiempo por tarjeta',
    periodo: `${formatearFecha(inicio)} al ${formatearFecha(fin)}`,
    archivo: `informe-tiempo-${inicio}_${fin}`,
    columnas: COLUMNAS_TIEMPO,
    filas,
  };
};

export const generarInforme = async () => {
  const inicio = parsearFechaIso(porId('informeInicio').value);
  const fin = parsearFechaIso(porId('informeFin').value);
  if (!inicio || !fin) {
    mostrarAvisoInforme('Selecciona la fecha de inicio y de fin en el calendario.', 'aviso-error');
    return;
  }
  if (inicio > fin) {
    mostrarAvisoInforme('La fecha de inicio no puede ser posterior a la de fin.', 'aviso-error');
    return;
  }
  if (!estado.conectado) {
    mostrarAvisoInforme('Conecta primero para generar el informe.', 'aviso-error');
    return;
  }

  const datos = { inicio, fin, persona: porId('informePersona').value };
  const boton = porId('botonGenerarInforme');
  boton.disabled = true;
  estado.informe = null;
  habilitarExportacion(false);
  porId('informeResultado').innerHTML = '';
  mostrarAvisoInforme('Generando informe…', 'aviso-listo');
  try {
    const tipo = porId('informeTipo').value;
    if (tipo === 'tiempo') await informeTiempo(datos);
    else await informeFinalizadas(datos);
    mostrarAvisoInforme('', '');
    habilitarExportacion(Boolean(estado.informe));
  } catch (error) {
    mostrarAvisoInforme(`No se pudo generar el informe: ${error.message}`, 'aviso-error');
  } finally {
    boton.disabled = false;
  }
};
