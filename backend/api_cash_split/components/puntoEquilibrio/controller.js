import { getPuntoEquilibrio as storeGetPuntoEquilibrio } from "./store.js";

// Arma el modelo de punto de equilibrio para un período. Sin paginación: la
// pantalla lee un solo objeto agregado, no una tabla.
export const getPuntoEquilibrio = async ({ desde, hasta } = {}) => {
  return await storeGetPuntoEquilibrio({ desde, hasta });
};

export default {
  getPuntoEquilibrio,
};
