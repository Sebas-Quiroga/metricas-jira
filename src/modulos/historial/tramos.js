// Lógica de tramos por estado a partir del historial de cada tarjeta.
import { CAMPO_ESTIMACION_PUNTOS, HORAS_POR_PUNTO, ESTADOS_ESTIMACION } from '../../nucleo/constantes.js';
import { estado } from '../../nucleo/estado.js';
import { milisegundosHabiles } from '../../nucleo/utilidades/tiempos.js';

export const nombrePorId = idStatus => estado.mapaEstados?.get(String(idStatus))?.name || '';

export const construirTramos = (issue, changelog) => {
  const transiciones = [];
  (changelog?.histories || []).forEach(historia => {
    (historia.items || []).forEach(item => {
      if (item.field !== 'status') return;
      transiciones.push({
        fecha: new Date(historia.created).getTime(),
        desde: nombrePorId(item.from) || item.fromString || '',
        hasta: nombrePorId(item.to) || item.toString || '',
      });
    });
  });
  transiciones.sort((a, b) => a.fecha - b.fecha);

  const inicio = new Date(issue.fields.created).getTime();
  const ahora = Date.now();
  if (!transiciones.length) {
    return [{ estado: issue.fields.status.name, desde: inicio, hasta: ahora }];
  }

  const tramos = [];
  const primera = transiciones[0];
  if (primera.desde) tramos.push({ estado: primera.desde, desde: inicio, hasta: primera.fecha });
  transiciones.forEach((transicion, indice) => {
    const fin = indice + 1 < transiciones.length ? transiciones[indice + 1].fecha : ahora;
    tramos.push({ estado: transicion.hasta, desde: transicion.fecha, hasta: fin });
  });
  return tramos;
};

export const consolidarTramos = tramos => {
  const registros = new Map();
  tramos.forEach(tramo => {
    const registro = registros.get(tramo.estado) || {
      estado: tramo.estado,
      veces: 0,
      milisegundos: 0,
      milisegundosCrudos: 0,
      ultimaEntrada: tramo.desde,
    };
    registro.veces += 1;
    registro.milisegundos += milisegundosHabiles(tramo.desde, tramo.hasta);
    registro.milisegundosCrudos += tramo.hasta - tramo.desde;
    registro.ultimaEntrada = tramo.desde;
    registros.set(tramo.estado, registro);
  });
  return [...registros.values()];
};

// Recorta los tramos a un rango de fechas para no contar tiempo fuera del periodo.
export const recortarTramos = (tramos, inicioMs, finMs) =>
  tramos
    .map(tramo => ({ ...tramo, desde: Math.max(tramo.desde, inicioMs), hasta: Math.min(tramo.hasta, finMs) }))
    .filter(tramo => tramo.hasta > tramo.desde);

export const obtenerTramoActual = issue => {
  const historial = estado.detalle?.historiales.get(issue.key);
  if (!historial) return null;
  const tramos = construirTramos(issue, historial);
  return tramos.length ? tramos[tramos.length - 1] : null;
};

export const normalizarNombreEstado = nombre =>
  String(nombre || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();

// Uso de la estimación: tiempo en estados DEV/DEVO/RT frente a los puntos (1 punto = 2 h).
export const calcularUsoEstimacion = (issue, tramos) => {
  const puntos = Number(issue.fields?.[CAMPO_ESTIMACION_PUNTOS]);
  if (!Number.isFinite(puntos) || puntos <= 0) return null;
  const estimadoMs = puntos * HORAS_POR_PUNTO * 3600000;
  let usadoMs = 0;
  tramos.forEach(tramo => {
    if (ESTADOS_ESTIMACION.includes(normalizarNombreEstado(tramo.estado))) {
      usadoMs += milisegundosHabiles(tramo.desde, tramo.hasta);
    }
  });
  return { puntos, estimadoMs, usadoMs, excesoMs: usadoMs - estimadoMs };
};

// Alerta solo cuando el uso supera la estimación.
export const calcularAlertaEstimacion = (issue, tramos) => {
  const uso = calcularUsoEstimacion(issue, tramos);
  return uso && uso.excesoMs > 0 ? uso : null;
};

export const obtenerAlertaEstimacion = issue => {
  const historial = estado.detalle?.historiales.get(issue.key);
  if (!historial) return null;
  return calcularAlertaEstimacion(issue, construirTramos(issue, historial));
};
