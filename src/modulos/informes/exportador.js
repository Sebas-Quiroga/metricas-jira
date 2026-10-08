// Exportación de informes a Excel (.xlsx) y PDF (.pdf) cargando librerías bajo demanda.
import { estado } from '../../nucleo/estado.js';
import { mostrarAvisoInforme } from './informes.js';

const LIBRERIAS = {
  xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',
};

const promesas = new Map();

const cargarScript = (clave, url, estaLista) =>
  new Promise((resolver, rechazar) => {
    if (estaLista()) {
      resolver();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => (estaLista() ? resolver() : rechazar(new Error(`No cargó ${clave}`)));
    script.onerror = () => rechazar(new Error(`No se pudo descargar ${clave}`));
    document.head.append(script);
  });

const cargarLibreria = (clave, url, estaLista) => {
  if (!promesas.has(clave)) promesas.set(clave, cargarScript(clave, url, estaLista));
  return promesas.get(clave);
};

const cargarXlsx = () => cargarLibreria('xlsx', LIBRERIAS.xlsx, () => typeof window.XLSX !== 'undefined');

const obtenerJsPdf = () => window.jspdf?.jsPDF || window.jsPDF;

const cargarJsPdf = () =>
  cargarLibreria('jspdf', LIBRERIAS.jspdf, () => typeof obtenerJsPdf() === 'function').then(() => {
    const Autotable = obtenerJsPdf();
    return cargarLibreria('autotable', LIBRERIAS.autotable, () => typeof Autotable?.prototype?.autoTable === 'function');
  });

const nombreArchivo = (informe, extension) => `${informe.archivo}.${extension}`;

export const descargarExcelInforme = async () => {
  const informe = estado.informe;
  if (!informe) return;
  const boton = document.getElementById('botonExportarExcel');
  boton.disabled = true;
  mostrarAvisoInforme('Generando Excel…', 'aviso-listo');
  try {
    await cargarXlsx();
    const { XLSX } = window;
    const datos = [[informe.titulo], [informe.periodo], [], informe.columnas, ...informe.filas];
    const hoja = XLSX.utils.aoa_to_sheet(datos);
    hoja['!cols'] = informe.columnas.map((columna, indice) => ({
      wch: Math.max(
        columna.length + 2,
        ...informe.filas.slice(0, 80).map(fila => String(fila[indice] ?? '').length + 2),
      ),
    }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Informe');
    XLSX.writeFile(libro, nombreArchivo(informe, 'xlsx'));
    mostrarAvisoInforme('Excel descargado.', 'aviso-listo');
  } catch (error) {
    mostrarAvisoInforme(`No se pudo generar el Excel: ${error.message}`, 'aviso-error');
  } finally {
    boton.disabled = false;
  }
};

export const descargarPdfInforme = async () => {
  const informe = estado.informe;
  if (!informe) return;
  const boton = document.getElementById('botonExportarPdf');
  boton.disabled = true;
  mostrarAvisoInforme('Generando PDF…', 'aviso-listo');
  try {
    await cargarJsPdf();
    const { jsPDF } = window.jspdf;
    const apaisado = informe.columnas.length > 6;
    const documento = new jsPDF({ orientation: apaisado ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    documento.setFontSize(13);
    documento.text(informe.titulo, 12, 14);
    documento.setFontSize(10);
    documento.text(informe.periodo, 12, 20);
    documento.autoTable({
      startY: 26,
      head: [informe.columnas],
      body: informe.filas,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [38, 132, 255], textColor: 255 },
      margin: { left: 10, right: 10 },
    });
    documento.save(nombreArchivo(informe, 'pdf'));
    mostrarAvisoInforme('PDF descargado.', 'aviso-listo');
  } catch (error) {
    mostrarAvisoInforme(`No se pudo generar el PDF: ${error.message}`, 'aviso-error');
  } finally {
    boton.disabled = false;
  }
};
