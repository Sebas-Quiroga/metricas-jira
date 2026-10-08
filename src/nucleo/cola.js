// Cola de concurrencia simple para limitar llamadas simultáneas al proxy.
export const crearCola = limite => {
  let enEjecucion = 0;
  const espera = [];
  const lanzar = tarea => {
    enEjecucion += 1;
    tarea
      .funcion()
      .then(tarea.resolver)
      .catch(tarea.rechazar)
      .finally(() => {
        enEjecucion -= 1;
        const siguiente = espera.shift();
        if (siguiente) lanzar(siguiente);
      });
  };
  return funcion =>
    new Promise((resolver, rechazar) => {
      const tarea = { funcion, resolver, rechazar };
      if (enEjecucion < limite) {
        lanzar(tarea);
        return;
      }
      espera.push(tarea);
    });
};

export const colaMetricas = crearCola(3);
