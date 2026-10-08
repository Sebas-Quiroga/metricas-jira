// Componentes de UI reutilizables sin lógica de negocio.

export const mensajeMetricas = (texto, clase) => {
  const contenedor = document.createElement('div');
  contenedor.className = clase;
  contenedor.textContent = texto;
  return contenedor;
};

export const crearKpi = (valor, etiqueta) => {
  const kpi = document.createElement('div');
  kpi.className = 'kpi';
  const numero = document.createElement('b');
  numero.textContent = valor;
  const texto = document.createElement('span');
  texto.textContent = etiqueta;
  kpi.append(numero, texto);
  return kpi;
};

export const crearCategoria = (clase, nombre, cantidad) => {
  const item = document.createElement('span');
  const punto = document.createElement('i');
  punto.className = `punto ${clase}`;
  item.append(punto, document.createTextNode(`${nombre} `));
  const fuerte = document.createElement('b');
  fuerte.textContent = cantidad;
  item.append(fuerte);
  return item;
};

export const crearDato = (texto, alerta) => {
  const dato = document.createElement('span');
  dato.className = `dato ${alerta ? 'dato-alerta' : ''}`.trim();
  dato.textContent = texto;
  return dato;
};

export const crearEtiqueta = texto => {
  if (!texto) return document.createTextNode('');
  const etiqueta = document.createElement('span');
  etiqueta.className = 'etiqueta-mini';
  etiqueta.textContent = texto;
  return etiqueta;
};

export const colorAvatar = texto => {
  const paleta = ['#2684ff', '#36b37e', '#ffab00', '#ff5630', '#6554c0', '#00b8d9', '#ff7452', '#8777d9'];
  let suma = 0;
  [...String(texto)].forEach(caracter => {
    suma = (suma + caracter.charCodeAt(0)) % paleta.length;
  });
  return paleta[suma];
};

export const crearAvatar = asignado => {
  const avatar = document.createElement('span');
  if (!asignado) {
    avatar.className = 'avatar avatar-sin-asignar';
    avatar.title = 'Sin asignar';
    avatar.textContent = '?';
    return avatar;
  }
  const iniciales = (asignado.displayName || '?')
    .split(' ')
    .slice(0, 2)
    .map(palabra => palabra.charAt(0))
    .join('')
    .toUpperCase();
  avatar.className = 'avatar';
  avatar.style.background = colorAvatar(asignado.accountId);
  avatar.title = asignado.displayName;
  avatar.textContent = iniciales;
  return avatar;
};
