// Modal para pegar las credenciales de Jira desde la pantalla.
import { porId } from '../../nucleo/utilidades/dom.js';
import { obtenerCredenciales, guardarCredenciales, limpiarCredenciales, URL_JIRA_DEFECTO } from '../../nucleo/credenciales.js';
import { conectar } from '../conexion/conexion.js';

const mostrarAvisoConfig = (texto, clase) => {
  const aviso = porId('configAviso');
  aviso.textContent = texto;
  aviso.className = clase ? `aviso ${clase}` : 'aviso oculto';
};

export const abrirConfig = () => {
  const credenciales = obtenerCredenciales() || {};
  porId('configUrl').value = credenciales.baseUrl || URL_JIRA_DEFECTO;
  porId('configEmail').value = credenciales.email || '';
  porId('configToken').value = credenciales.token || '';
  mostrarAvisoConfig(
    'Se guardan solo en este navegador. Si las dejas vacías, el proxy usa su config.json.',
    '',
  );
  porId('modalConfig').classList.remove('oculto');
};

export const cerrarConfig = () => porId('modalConfig').classList.add('oculto');

export const guardarConfig = () => {
  const baseUrl = porId('configUrl').value.trim();
  const email = porId('configEmail').value.trim();
  const token = porId('configToken').value.trim();
  if (!email || !token) {
    mostrarAvisoConfig('El correo y el token son obligatorios.', 'aviso-error');
    return;
  }
  guardarCredenciales({ baseUrl: baseUrl || URL_JIRA_DEFECTO, email, token });
  cerrarConfig();
  conectar();
};

export const limpiarConfig = () => {
  limpiarCredenciales();
  cerrarConfig();
  conectar();
};
