import { listFlujoFondos, listGananciaPorCobrarSemanas } from "./store.js";

const getFlujoFondos = async ({ desde, hasta } = {}) => {
  const list = await listFlujoFondos({ desde, hasta });
  return list;
};

const getGananciaPorCobrarSemanas = async () => {
  const semanas = await listGananciaPorCobrarSemanas();
  return semanas;
};

export default { getFlujoFondos, getGananciaPorCobrarSemanas };
