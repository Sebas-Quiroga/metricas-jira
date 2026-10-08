// Credenciales de Jira guardadas en el navegador (localStorage).
const CLAVE = 'metricas.jira.credenciales';
export const URL_JIRA_DEFECTO = 'https://itmerp.atlassian.net';

export const obtenerCredenciales = () => {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
};

export const guardarCredenciales = credenciales => {
  localStorage.setItem(CLAVE, JSON.stringify(credenciales));
};

export const limpiarCredenciales = () => localStorage.removeItem(CLAVE);

const base64 = texto => {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach(byte => {
    binario += String.fromCharCode(byte);
  });
  return btoa(binario);
};

// Encabezados que el proxy reenvía a Jira. Vacío = el proxy usa su config.json.
export const encabezadosJira = () => {
  const credenciales = obtenerCredenciales();
  if (!credenciales?.email || !credenciales?.token) return {};
  return {
    Authorization: `Basic ${base64(`${credenciales.email}:${credenciales.token}`)}`,
    'X-Jira-Base-Url': credenciales.baseUrl || URL_JIRA_DEFECTO,
  };
};
