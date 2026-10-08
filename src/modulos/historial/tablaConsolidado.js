// Tabla consolidada de tiempo por estado, compartida por recorrido e informes.
import { consolidarTramos } from './tramos.js';
import { formatearDuracion, formatearDuracionCalendario } from '../../nucleo/utilidades/tiempos.js';

export const crearTablaConsolidado = (tramos, issue) => {
  const consolidado = consolidarTramos(tramos);
  const total = consolidado.reduce((suma, registro) => suma + registro.milisegundos, 0) || 1;
  const estadoActual = issue.fields.status.name;

  const tabla = document.createElement('table');
  tabla.className = 'tabla-recorrido';
  tabla.innerHTML =
    '<thead><tr><th>Estado</th><th class="num">Veces</th><th class="num">Tiempo total</th><th class="num">Crudo (calendario)</th><th class="num">% del ciclo</th></tr></thead>';
  const cuerpo = document.createElement('tbody');
  consolidado.forEach(registro => {
    const fila = document.createElement('tr');
    if (registro.estado === estadoActual) fila.className = 'fila-actual';
    const nombre = document.createElement('td');
    nombre.textContent = registro.estado;
    const veces = document.createElement('td');
    veces.className = 'num';
    veces.textContent = registro.veces;
    const duracion = document.createElement('td');
    duracion.className = 'num';
    duracion.textContent = formatearDuracion(registro.milisegundos);
    const crudo = document.createElement('td');
    crudo.className = 'num';
    crudo.textContent = formatearDuracionCalendario(registro.milisegundosCrudos);
    crudo.title = `Tiempo total de calendario sin descontar la jornada laboral: ${(registro.milisegundosCrudos / 3600000).toFixed(1)} h`;
    const porcentaje = document.createElement('td');
    porcentaje.className = 'num';
    porcentaje.textContent = `${Math.round((registro.milisegundos / total) * 100)}%`;
    fila.append(nombre, veces, duracion, crudo, porcentaje);
    cuerpo.append(fila);
  });
  tabla.append(cuerpo);
  return tabla;
};
