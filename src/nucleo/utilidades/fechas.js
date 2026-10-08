// Utilidades de formato y validación de fechas.
export const formatearFecha = fecha => {
  const esSoloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const fechaObj = new Date(esSoloFecha ? `${fecha}T00:00:00` : fecha);
  return fechaObj.toLocaleString(
    'es-CO',
    esSoloFecha
      ? { day: '2-digit', month: 'short', year: 'numeric' }
      : { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  );
};

// Valida una fecha ISO (aaaa-mm-dd) real y la devuelve normalizada, o null.
export const parsearFechaIso = texto => {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto || '').trim());
  if (!coincidencia) return null;
  const [, anio, mes, dia] = coincidencia.map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const esReal =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  if (!esReal) return null;
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};
