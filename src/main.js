// Punto de entrada: registra los eventos de la interfaz.
import { estado, filtros } from './nucleo/estado.js';
import { porId } from './nucleo/utilidades/dom.js';
import { conectar } from './modulos/conexion/conexion.js';
import {
  calcularSeleccionados,
  limpiarFiltros,
  alternarSeleccion,
  refrescarMetricas,
  pintarCuadricula,
} from './modulos/tableros/listado.js';
import {
  abrirDetalle,
  cerrarDetalle,
  limpiarFiltrosDetalle,
  actualizarFiltroDetalle,
  programarCargaHistorial,
  pintarDetalle,
  actualizarResumenEstados,
} from './modulos/detalle/detalle.js';
import { abrirRecorrido, cerrarRecorrido } from './modulos/recorrido/recorrido.js';
import { abrirInforme, cerrarInforme, generarInforme } from './modulos/informes/informes.js';
import { descargarExcelInforme, descargarPdfInforme } from './modulos/informes/exportador.js';
import { abrirConfig, cerrarConfig, guardarConfig, limpiarConfig } from './modulos/configuracion/configuracion.js';

const registrarEventos = () => {
  porId('luzConexion').addEventListener('click', conectar);
  porId('botonMetricas').addEventListener('click', calcularSeleccionados);
  porId('botonLimpiar').addEventListener('click', limpiarFiltros);

  porId('filtroPersona').addEventListener('change', evento => {
    filtros.persona = evento.target.value;
    pintarCuadricula();
  });
  porId('filtroProyecto').addEventListener('change', evento => {
    filtros.proyecto = evento.target.value;
    pintarCuadricula();
  });

  porId('cuadriculaTableros').addEventListener('change', evento => {
    const idBoard = Number(evento.target.dataset.seleccionar);
    if (idBoard) alternarSeleccion(idBoard);
  });
  porId('cuadriculaTableros').addEventListener('click', evento => {
    const idBoard = Number(evento.target.dataset.abrir);
    if (idBoard) {
      abrirDetalle(idBoard);
      return;
    }
    const idActualizacion = Number(evento.target.dataset.actualizar);
    if (idActualizacion) refrescarMetricas(idActualizacion);
  });

  porId('botonVolver').addEventListener('click', cerrarDetalle);
  porId('botonLimpiarDetalle').addEventListener('click', limpiarFiltrosDetalle);
  porId('detalleBusqueda').addEventListener('input', evento =>
    actualizarFiltroDetalle('busqueda', evento.target.value),
  );
  porId('detalleAsignado').addEventListener('change', evento =>
    actualizarFiltroDetalle('asignado', evento.target.value),
  );
  porId('detalleTipo').addEventListener('change', evento => actualizarFiltroDetalle('tipo', evento.target.value));
  porId('detalleEstadosPanel').addEventListener('change', evento => {
    const detalle = estado.detalle;
    if (!detalle || !evento.target.dataset.estadoSeleccion) return;
    if (evento.target.checked) detalle.estadosSeleccionados.add(evento.target.value);
    else detalle.estadosSeleccionados.delete(evento.target.value);
    actualizarResumenEstados();
    pintarDetalle();
    programarCargaHistorial();
  });
  porId('detalleColumnas').addEventListener('click', evento => {
    const tarjeta = evento.target.closest('[data-clave]');
    if (tarjeta) abrirRecorrido(tarjeta.dataset.clave);
  });

  porId('botonCerrarRecorrido').addEventListener('click', cerrarRecorrido);
  porId('modalRecorrido').addEventListener('click', evento => {
    if (evento.target.id === 'modalRecorrido') cerrarRecorrido();
  });

  porId('botonConfig').addEventListener('click', abrirConfig);
  porId('botonCerrarConfig').addEventListener('click', cerrarConfig);
  porId('botonGuardarConfig').addEventListener('click', guardarConfig);
  porId('botonLimpiarConfig').addEventListener('click', limpiarConfig);
  porId('modalConfig').addEventListener('click', evento => {
    if (evento.target.id === 'modalConfig') cerrarConfig();
  });

  porId('botonInforme').addEventListener('click', abrirInforme);
  porId('botonCerrarInforme').addEventListener('click', cerrarInforme);
  porId('botonGenerarInforme').addEventListener('click', generarInforme);
  porId('botonExportarExcel').addEventListener('click', descargarExcelInforme);
  porId('botonExportarPdf').addEventListener('click', descargarPdfInforme);
  porId('modalInforme').addEventListener('click', evento => {
    if (evento.target.id === 'modalInforme') cerrarInforme();
  });

  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') {
      cerrarRecorrido();
      cerrarInforme();
      cerrarConfig();
    }
  });
};

registrarEventos();
conectar();
