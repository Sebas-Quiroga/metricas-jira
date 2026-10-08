// Tarjetas de la vista de detalle (columnas por estado).
import { HORAS_POR_PUNTO } from '../../nucleo/constantes.js';
import { crearEtiqueta, crearAvatar } from '../../componentes/base.js';
import { formatearFecha } from '../../nucleo/utilidades/fechas.js';
import {
  formatearDuracion,
  formatearDuracionCalendario,
  claseTiempo,
} from '../../nucleo/utilidades/tiempos.js';
import { obtenerTramoActual, obtenerAlertaEstimacion } from '../historial/tramos.js';

const crearEtiquetaTiempo = issue => {
  const etiqueta = document.createElement('span');
  const tramo = obtenerTramoActual(issue);
  if (!tramo) {
    etiqueta.className = 'tiempo tiempo-pendiente';
    etiqueta.textContent = 'calculando…';
    return etiqueta;
  }
  // Tiempo transcurrido en el estado actual en calendario puro (sin jornada laboral).
  const duracion = tramo.hasta - tramo.desde;
  etiqueta.className = `tiempo ${claseTiempo(duracion, true)}`;
  etiqueta.title = `${tramo.estado} desde ${formatearFecha(tramo.desde)}`;
  etiqueta.textContent = formatearDuracionCalendario(duracion);
  return etiqueta;
};

const crearPieTarjeta = campos => {
  const pie = document.createElement('div');
  pie.className = 'tarjeta-pie';
  pie.append(
    crearAvatar(campos.assignee),
    crearEtiqueta(campos.issuetype?.name || 'Sin tipo'),
    crearEtiqueta(campos.priority?.name || ''),
    crearEtiqueta(campos.assignee?.displayName || 'Sin asignar'),
  );
  return pie;
};

const crearDatosTarjeta = campos => {
  const datos = document.createElement('div');
  datos.className = 'tarjeta-datos';
  const lineas = [
    campos.created ? `Creada: ${formatearFecha(campos.created)}` : '',
    campos.updated ? `Actualizada: ${formatearFecha(campos.updated)}` : '',
    campos.duedate ? `Vence: ${formatearFecha(campos.duedate)}` : '',
    campos.reporter?.displayName ? `Reporta: ${campos.reporter.displayName}` : '',
    campos.resolution?.name ? `Resolución: ${campos.resolution.name}` : '',
    campos.labels?.length ? `Labels: ${campos.labels.join(', ')}` : '',
    campos.components?.length ? `Componentes: ${campos.components.map(componente => componente.name).join(', ')}` : '',
  ].filter(Boolean);
  lineas.forEach(texto => {
    const linea = document.createElement('span');
    linea.textContent = texto;
    datos.append(linea);
  });
  return datos;
};

export const crearTarjetaDetalle = issue => {
  const campos = issue.fields;
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta-detalle';
  tarjeta.dataset.clave = issue.key;
  tarjeta.title = 'Ver recorrido por estados y todos los campos';

  const cabecera = document.createElement('div');
  cabecera.className = 'tarjeta-cabecera';
  const clave = document.createElement('span');
  clave.className = 'clave';
  clave.textContent = issue.key;
  cabecera.append(clave, crearEtiquetaTiempo(issue));

  const alerta = obtenerAlertaEstimacion(issue);
  if (alerta) {
    const chip = document.createElement('span');
    chip.className = 'tiempo tiempo-alerta';
    chip.textContent = `⚠ +${formatearDuracion(alerta.excesoMs)}`;
    chip.title = `Estimación superada: ${alerta.puntos} pts = ${alerta.puntos * HORAS_POR_PUNTO} h · usado en DEV/DEVO/RT: ${(alerta.usadoMs / 3600000).toFixed(1)} h · excede ${formatearDuracion(alerta.excesoMs)}`;
    cabecera.append(chip);
  }

  tarjeta.append(cabecera, crearPieTarjeta(campos), crearDatosTarjeta(campos));
  return tarjeta;
};
