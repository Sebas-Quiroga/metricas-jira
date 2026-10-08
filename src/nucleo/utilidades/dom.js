// Utilidades de acceso al DOM.
export const porId = id => document.getElementById(id);

export const llenarSelector = (id, valores, textoVacio) => {
  const selector = porId(id);
  selector.innerHTML = '';
  selector.append(new Option(textoVacio, ''));
  valores.forEach(valor => selector.append(new Option(valor, valor)));
};
