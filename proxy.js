const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Configuración por variables de entorno (Docker) con respaldo en config.json (local).
const leerConfiguracion = () => {
  const rutaConfiguracion = path.join(__dirname, 'config.json');
  const deArchivo = fs.existsSync(rutaConfiguracion)
    ? JSON.parse(fs.readFileSync(rutaConfiguracion, 'utf8').trim())
    : {};
  return {
    baseUrl: process.env.JIRA_BASE_URL || deArchivo.baseUrl || '',
    email: process.env.JIRA_EMAIL || deArchivo.email || '',
    token: process.env.JIRA_TOKEN || deArchivo.token || '',
    puerto: Number(process.env.PORT || deArchivo.puerto || 8787),
    host: process.env.HOST || '127.0.0.1',
  };
};

const CONFIGURACION = leerConfiguracion();
const URL_JIRA = CONFIGURACION.baseUrl.replace(/\/+$/, '');
const PUERTO = CONFIGURACION.puerto;
const HOST = CONFIGURACION.host;

if (!URL_JIRA || !CONFIGURACION.email || !CONFIGURACION.token) {
  console.warn(
    'Sin config.json completo: se usarán las credenciales que envíe el navegador (Authorization y X-Jira-Base-Url).',
  );
}

const AUTORIZACION = `Basic ${Buffer.from(`${CONFIGURACION.email}:${CONFIGURACION.token}`).toString('base64')}`;

const aplicarCors = respuesta => {
  respuesta.setHeader('Access-Control-Allow-Origin', '*');
  respuesta.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  respuesta.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-Jira-Base-Url');
  respuesta.setHeader('Access-Control-Max-Age', '600');
};

const responderJson = (respuesta, estado, datos) => {
  const cuerpo = JSON.stringify(datos);
  respuesta.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
  respuesta.end(cuerpo);
};

const leerCuerpo = solicitud =>
  new Promise(resolve => {
    const trozos = [];
    solicitud.on('data', trozo => trozos.push(trozo));
    solicitud.on('end', () => resolve(Buffer.concat(trozos)));
  });

const construirOpcionesJira = async (solicitud, cuerpo, auth) => {
  const opciones = {
    method: solicitud.method,
    headers: {
      Authorization: auth,
      Accept: 'application/json',
      'User-Agent': 'metricas-jira-local',
    },
  };
  if (!cuerpo.length) return opciones;
  opciones.body = cuerpo;
  opciones.headers['Content-Type'] = solicitud.headers['content-type'] || 'application/json';
  return opciones;
};

// Cada petición puede traer sus propias credenciales; si no, se usa config.json.
const resolverBaseJira = solicitud =>
  String(solicitud.headers['x-jira-base-url'] || URL_JIRA).replace(/\/+$/, '');

const reenviarAJira = async (solicitud, respuesta, rutaJira) => {
  const cuerpo = await leerCuerpo(solicitud);
  const auth = solicitud.headers.authorization || AUTORIZACION;
  const opciones = await construirOpcionesJira(solicitud, cuerpo, auth);
  const respuestaJira = await fetch(`${resolverBaseJira(solicitud)}${rutaJira}`, opciones);
  const datos = await respuestaJira.arrayBuffer();
  respuesta.writeHead(respuestaJira.status, {
    'Content-Type': respuestaJira.headers.get('content-type') || 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  respuesta.end(Buffer.from(datos));
};

const atenderSolicitud = async (solicitud, respuesta) => {
  const url = new URL(solicitud.url, `http://${HOST}:${PUERTO}`);

  if (solicitud.method === 'OPTIONS') {
    respuesta.writeHead(204);
    respuesta.end();
    return;
  }

  if (url.pathname === '/salud') {
    responderJson(respuesta, 200, { ok: true, jira: URL_JIRA });
    return;
  }

  if (!url.pathname.startsWith('/jira/')) {
    responderJson(respuesta, 404, { error: 'Ruta no encontrada. Usa /jira/<ruta de Jira> o /salud' });
    return;
  }

  const rutaJira = `${url.pathname.slice('/jira'.length)}${url.search}`;
  try {
    await reenviarAJira(solicitud, respuesta, rutaJira);
  } catch (error) {
    responderJson(respuesta, 502, { error: 'No se pudo contactar con Jira', detalle: error.message });
  }
};

const servidor = http.createServer((solicitud, respuesta) => {
  aplicarCors(respuesta);
  atenderSolicitud(solicitud, respuesta).catch(error => {
    if (!respuesta.headersSent) responderJson(respuesta, 500, { error: error.message });
  });
});

servidor.listen(PUERTO, HOST, () => {
  console.log(`Proxy Jira corriendo en http://${HOST}:${PUERTO}`);
  console.log(`Apuntando a ${URL_JIRA}`);
});
