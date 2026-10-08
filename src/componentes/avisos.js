// Avisos y estado de conexión en la interfaz.
import { porId } from '../nucleo/utilidades/dom.js';

export const pintarLuzConexion = (estado, titulo) => {
  const luz = porId('luzConexion');
  luz.className = `luz luz-${estado}`;
  luz.title = titulo;
  luz.setAttribute('aria-label', titulo);
};

export const mostrarMensaje = (texto, clase) => {
  const contenedor = porId('mensajeEstado');
  contenedor.textContent = texto;
  contenedor.className = `aviso ${clase}`;
};

export const ocultarMensaje = () => {
  porId('mensajeEstado').className = 'aviso oculto';
};
