// Cálculo de tiempos en jornada laboral y formateo de duraciones.

// Horario hábil: lunes a jueves 7:30-12:00 y 14:00-18:00; viernes 8:00-12:00 y 14:00-18:00.
// Ventanas en minutos desde medianoche, por día de la semana (0 = domingo).
export const HORARIOS_HABILES = {
  1: [[450, 720], [840, 1080]],
  2: [[450, 720], [840, 1080]],
  3: [[450, 720], [840, 1080]],
  4: [[450, 720], [840, 1080]],
  5: [[480, 720], [840, 1080]],
};

// Promedio de jornada diaria: (8.5 h lun-jue * 4 + 8 h vie) / 5 = 8.4 h
export const JORNADA_PROMEDIO_MS = 8.4 * 3600000;

export const milisegundosHabiles = (desde, hasta) => {
  if (!(hasta > desde)) return 0;
  let total = 0;
  const dia = new Date(desde);
  dia.setHours(0, 0, 0, 0);
  while (dia.getTime() < hasta) {
    const ventanas = HORARIOS_HABILES[dia.getDay()];
    if (ventanas) {
      for (const [inicioMin, finMin] of ventanas) {
        const inicio = new Date(dia);
        inicio.setMinutes(inicioMin);
        const fin = new Date(dia);
        fin.setMinutes(finMin);
        const solapamiento = Math.min(hasta, fin.getTime()) - Math.max(desde, inicio.getTime());
        if (solapamiento > 0) total += solapamiento;
      }
    }
    dia.setDate(dia.getDate() + 1);
  }
  return total;
};

export const diasDesde = fecha => {
  const momento = new Date(fecha).getTime();
  if (Number.isNaN(momento)) return 0;
  return Math.floor(milisegundosHabiles(momento, Date.now()) / JORNADA_PROMEDIO_MS);
};

export const formatearDuracion = milisegundos => {
  const minutos = Math.max(1, Math.floor(milisegundos / 60000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const dias = milisegundos / JORNADA_PROMEDIO_MS;
  if (dias < 1) return `${horas} h`;
  if (dias < 5) return `${Math.floor(dias)} d`;
  if (dias < 22) return `${Math.floor(dias / 5)} sem`;
  const meses = Math.floor(dias / 22);
  return meses === 1 ? '1 mes' : `${meses} meses`;
};

// Duración en tiempo de calendario puro (24 h/día), sin jornada laboral.
export const formatearDuracionCalendario = milisegundos => {
  const minutos = Math.max(1, Math.floor(milisegundos / 60000));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `${dias} d`;
  if (dias < 30) return `${Math.floor(dias / 7)} sem`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? '1 mes' : `${meses} meses`;
};

export const claseTiempo = (milisegundos, calendario = false) => {
  const horas = milisegundos / 3600000;
  if (calendario) {
    if (horas < 24) return 'tiempo-fresco';
    if (horas < 168) return 'tiempo-medio';
    return 'tiempo-viejo';
  }
  if (horas < 8.4) return 'tiempo-fresco';
  if (horas < 42) return 'tiempo-medio';
  return 'tiempo-viejo';
};
