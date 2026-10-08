// Modal de recorrido: tiempo consolidado por estado y paso a paso.
import { CAMPO_ESTIMACION_PUNTOS, HORAS_POR_PUNTO } from '../../nucleo/constantes.js';
import { estado } from '../../nucleo/estado.js';
import { porId } from '../../nucleo/utilidades/dom.js';
import { mensajeMetricas, crearDato } from '../../componentes/base.js';
import { formatearFecha } from '../../nucleo/utilidades/fechas.js';
import { formatearDuracion, milisegundosHabiles, claseTiempo } from '../../nucleo/utilidades/tiempos.js';
import { construirTramos, calcularUsoEstimacion } from '../historial/tramos.js';
import { crearTablaConsolidado } from '../historial/tablaConsolidado.js';

const crearLineaRecorrido = tramos => {
  const linea = document.createElement('div');
  linea.className = 'linea-recorrido';
  tramos.forEach(tramo => {
    const paso = document.createElement('div');
    paso.className = 'paso';
    const fecha = document.createElement('span');
    fecha.className = 'paso-fecha';
    fecha.textContent = formatearFecha(tramo.desde);
    const nombre = document.createElement('span');
    nombre.className = 'paso-traslado';
    nombre.textContent = tramo.estado;
    const duracionMs = milisegundosHabiles(tramo.desde, tramo.hasta);
    const duracion = document.createElement('span');
    duracion.className = `paso-duracion ${claseTiempo(duracionMs)}`;
    duracion.textContent = formatearDuracion(duracionMs);
    paso.append(fecha, nombre, duracion);
    linea.append(paso);
  });
  return linea;
};

const crearContenidoRecorrido = (issue, tramos) => {
  const totales = document.createElement('div');
  totales.className = 'totales';

  const puntos = Number(issue.fields?.[CAMPO_ESTIMACION_PUNTOS]);
  if (Number.isFinite(puntos) && puntos > 0) {
    const uso = calcularUsoEstimacion(issue, tramos);
    let texto;
    if (uso.excesoMs > 0) {
      texto = `Estimación: ${puntos} pts (${puntos * HORAS_POR_PUNTO} h) · usado DEV/DEVO/RT: ${(uso.usadoMs / 3600000).toFixed(1)} h — +${formatearDuracion(uso.excesoMs)} de lo estimado`;
    } else {
      const restante = uso.estimadoMs - uso.usadoMs;
      texto = `Estimación: ${puntos} pts (${puntos * HORAS_POR_PUNTO} h) · quedan ${formatearDuracion(restante)} para excederse`;
    }
    totales.append(crearDato(texto, uso.excesoMs > 0));
  }

  const tituloConsolidado = document.createElement('div');
  tituloConsolidado.className = 'seccion-titulo';
  tituloConsolidado.textContent = 'Tiempo por estado (consolidado)';

  const tituloRecorrido = document.createElement('div');
  tituloRecorrido.className = 'seccion-titulo';
  tituloRecorrido.textContent = 'Recorrido paso a paso';

  const partes = [];
  if (totales.children.length) partes.push(totales);
  partes.push(tituloConsolidado, crearTablaConsolidado(tramos, issue), tituloRecorrido, crearLineaRecorrido(tramos));
  return partes;
};

const pintarCuerpoRecorrido = (issue, changelog) => {
  const cuerpo = porId('recorridoCuerpo');
  cuerpo.innerHTML = '';
  if (changelog) {
    cuerpo.append(...crearContenidoRecorrido(issue, construirTramos(issue, changelog)));
    return;
  }
  cuerpo.append(mensajeMetricas('Cargando historial de transiciones…', 'metricas-cargando'));
};

export const abrirRecorrido = clave => {
  const detalle = estado.detalle;
  const issue = detalle?.issues.find(item => item.key === clave);
  if (!issue) return;
  porId('recorridoClave').textContent = issue.key;
  porId('recorridoResumen').textContent = issue.fields.summary;
  pintarCuerpoRecorrido(issue, detalle.historiales.get(clave));
  porId('modalRecorrido').classList.remove('oculto');
};

export const cerrarRecorrido = () => {
  porId('modalRecorrido').classList.add('oculto');
};
