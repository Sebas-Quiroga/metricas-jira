// Personas asignadas extraídas de las métricas cargadas.
import { estado, filtros } from '../../nucleo/estado.js';
import { porId } from '../../nucleo/utilidades/dom.js';

export const personasDeMetricas = () => {
  const personas = new Map();
  estado.metricas.forEach(registro => {
    if (registro.estado !== 'ok') return;
    registro.issues.forEach(issue => {
      const asignado = issue.fields.assignee;
      if (asignado) personas.set(asignado.accountId, asignado.displayName);
    });
  });
  return personas;
};

// Incluye siempre al usuario del token para poder preseleccionarlo.
export const personasConUsuario = () => {
  const personas = personasDeMetricas();
  if (estado.usuario?.accountId && !personas.has(estado.usuario.accountId)) {
    personas.set(estado.usuario.accountId, estado.usuario.displayName);
  }
  return personas;
};

export const actualizarSelectorPersonas = () => {
  const selector = porId('filtroPersona');
  const actual = filtros.persona;
  const personas = personasConUsuario();
  selector.innerHTML = '';
  selector.append(new Option('Todas las personas', ''));
  [...personas.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))
    .forEach(([accountId, nombre]) => selector.append(new Option(nombre, accountId)));
  if (actual && personas.has(actual)) selector.value = actual;
  else filtros.persona = '';
};
