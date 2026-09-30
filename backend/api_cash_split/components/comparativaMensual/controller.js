import { listComparativaMensual as storeListComparativaMensual } from "./store.js";

// Una fila por mes, de la más reciente a la más antigua. Sin paginación: la
// pantalla lee una serie corta (por defecto 6 meses, tope 12) que tiene que
// entrar completa para que la comparación contra el mes anterior sea real.
export const listComparativaMensual = async ({ meses } = {}) => {
  return await storeListComparativaMensual({ meses });
};

export default {
  listComparativaMensual,
};
