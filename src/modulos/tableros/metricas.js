// Cálculo y pintado de métricas de un tablero.
import { TIPOS_DEFECTO } from '../../nucleo/constantes.js';
import { estado, filtros } from '../../nucleo/estado.js';
import { diasDesde } from '../../nucleo/utilidades/tiempos.js';
import { mensajeMetricas, crearKpi, crearCategoria, crearDato } from '../../componentes/base.js';
import { obtenerIssuesDelTablero } from '../../nucleo/servicioJira.js';
import { actualizarSelectorPersonas } from './personas.js';

export const medirTablero = async idBoard => {
  const { issues, total } = await obtenerIssuesDelTablero(idBoard);
  estado.metricas.set(idBoard, {
    estado: 'ok',
    issues,
    muestraParcial: issues.length < total,
    totalReal: total,
  });
  actualizarSelectorPersonas();
};

export const calcularMetricas = issues => {
  const categorias = { todo: 0, curso: 0, hecho: 0 };
  const tipos = new Map();
  let abiertos = 0;
  let bugsAbiertos = 0;
  let sinAsignar = 0;
  let sumaDias = 0;

  issues.forEach(issue => {
    const campos = issue.fields;
    const clave = campos.status?.statusCategory?.key;
    if (clave === 'done') categorias.hecho += 1;
    if (clave === 'indeterminate') categorias.curso += 1;
    if (clave === 'new') categorias.todo += 1;

    const tipo = campos.issuetype?.name || 'Sin tipo';
    tipos.set(tipo, (tipos.get(tipo) || 0) + 1);

    const estaAbierto = !campos.resolution;
    if (estaAbierto) {
      abiertos += 1;
      sumaDias += diasDesde(campos.created);
      if (TIPOS_DEFECTO.some(palabra => tipo.toLowerCase().includes(palabra))) bugsAbiertos += 1;
    }
    if (!campos.assignee) sinAsignar += 1;
  });

  return {
    total: issues.length,
    abiertos,
    bugsAbiertos,
    sinAsignar,
    categorias,
    antiguedadPromedio: abiertos ? Math.round(sumaDias / abiertos) : 0,
    tiposOrdenados: [...tipos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
    avance: issues.length ? Math.round((categorias.hecho / issues.length) * 100) : 0,
  };
};

// Métricas del tablero aplicando el filtro global de persona asignada.
export const metricasFiltradas = registro => {
  const issues = filtros.persona
    ? registro.issues.filter(issue => issue.fields.assignee?.accountId === filtros.persona)
    : registro.issues;
  return {
    ...calcularMetricas(issues),
    muestraParcial: registro.muestraParcial,
    totalReal: registro.totalReal,
  };
};

export const pintarMetricas = datos => {
  const contenedor = document.createElement('div');

  const kpis = document.createElement('div');
  kpis.className = 'kpis';
  kpis.append(
    crearKpi(datos.total, 'Total'),
    crearKpi(datos.abiertos, 'Abiertos'),
    crearKpi(datos.categorias.hecho, 'Hechos'),
    crearKpi(datos.bugsAbiertos, 'Defectos abiertos'),
  );

  const barra = document.createElement('div');
  barra.className = 'barra';
  const relleno = document.createElement('div');
  relleno.className = 'barra-relleno';
  relleno.style.width = `${datos.avance}%`;
  barra.append(relleno);

  const categorias = document.createElement('div');
  categorias.className = 'categorias';
  categorias.append(
    crearCategoria('punto-todo', 'Por hacer', datos.categorias.todo),
    crearCategoria('punto-curso', 'En curso', datos.categorias.curso),
    crearCategoria('punto-hecho', 'Hecho', datos.categorias.hecho),
  );

  const extras = document.createElement('div');
  extras.className = 'extras';
  extras.append(
    crearDato(`Avance ${datos.avance}%`, false),
    crearDato(`Sin asignar: ${datos.sinAsignar}`, datos.sinAsignar > 0),
    crearDato(`Prom. abiertas: ${datos.antiguedadPromedio} d`, datos.antiguedadPromedio > 30),
  );
  if (datos.muestraParcial) {
    extras.append(crearDato(`Muestra parcial: ${datos.total} de ${datos.totalReal}`, true));
  }

  const tipos = document.createElement('div');
  tipos.className = 'tipos';
  datos.tiposOrdenados.forEach(([nombre, cantidad]) => {
    const chip = document.createElement('span');
    chip.className = 'tipo';
    chip.textContent = `${nombre} · ${cantidad}`;
    tipos.append(chip);
  });

  contenedor.append(kpis, barra, categorias, extras, tipos);
  return contenedor;
};

export const crearContenidoMetricas = idBoard => {
  const registro = estado.metricas.get(idBoard);
  if (!registro) return mensajeMetricas('Marca el tablero para calcular sus métricas.', 'metricas-vacias');
  if (registro.estado === 'cargando') {
    const contenedor = document.createElement('div');
    contenedor.className = 'metricas-cargando';
    const girador = document.createElement('span');
    girador.className = 'girar';
    contenedor.append(girador, document.createTextNode('Calculando métricas…'));
    return contenedor;
  }
  if (registro.estado === 'error') return mensajeMetricas(`Error: ${registro.error}`, 'metricas-error');
  const envoltura = document.createElement('div');
  const boton = document.createElement('button');
  boton.className = 'boton boton-actualizar';
  boton.type = 'button';
  boton.dataset.actualizar = idBoard;
  boton.textContent = 'Actualizar métricas';
  envoltura.append(pintarMetricas(metricasFiltradas(registro)), boton);
  return envoltura;
};
