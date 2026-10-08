// Orden y categoría de los estados del tablero.
import { ORDEN_CATEGORIA } from '../../nucleo/constantes.js';
import { estado } from '../../nucleo/estado.js';

const posicionColumna = (nombre, columnasBoard) => {
  const normalizar = texto => String(texto || '').toLowerCase().trim();
  const buscado = normalizar(nombre);
  if (!buscado) return 999;
  const exacto = columnasBoard.findIndex(columna => normalizar(columna) === buscado);
  if (exacto !== -1) return exacto;
  const parcial = columnasBoard.findIndex(
    columna => normalizar(columna).includes(buscado) || buscado.includes(normalizar(columna)),
  );
  return parcial === -1 ? 999 : parcial;
};

const posicionEstado = (referencia, orden) => {
  const posicionPorId = orden?.posicionPorId;
  if (posicionPorId?.has(String(referencia.id))) return posicionPorId.get(String(referencia.id));
  return posicionColumna(referencia.nombre, orden?.nombres || []);
};

export const categoriaClave = idStatus => {
  const categoria = estado.mapaEstados?.get(String(idStatus))?.statusCategory;
  const clave = String(categoria?.key || categoria?.name || '').toLowerCase();
  if (clave.includes('done') || clave.includes('hecho')) return 'done';
  if (clave.includes('progress') || clave.includes('curso')) return 'indeterminate';
  if (clave.includes('new') || clave.includes('hacer')) return 'new';
  return '';
};

export const compararEstados = orden => (a, b) => {
  const posicionA = posicionEstado(a, orden);
  const posicionB = posicionEstado(b, orden);
  const ambosEnTablero = posicionA !== 999 && posicionB !== 999;
  if (ambosEnTablero && posicionA !== posicionB) return posicionA - posicionB;
  const categoriaA = ORDEN_CATEGORIA[categoriaClave(a.id)] ?? 9;
  const categoriaB = ORDEN_CATEGORIA[categoriaClave(b.id)] ?? 9;
  if (categoriaA !== categoriaB) return categoriaA - categoriaB;
  if (ambosEnTablero) return posicionA - posicionB;
  return a.nombre.localeCompare(b.nombre);
};

export const clasePuntoEstado = idStatus => {
  const categoria = categoriaClave(idStatus);
  if (categoria === 'done') return 'punto-hecho';
  if (categoria === 'indeterminate') return 'punto-curso';
  return 'punto-todo';
};
