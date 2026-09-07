import { listFlujoFondos, listVentasPorCobrarSemanas } from "./store.js";

const getFlujoFondos = async ({ desde, hasta } = {}) => {
  const list = await listFlujoFondos({ desde, hasta });
  return list;
};

const getVentasPorCobrarSemanas = async () => {
  const semanas = await listVentasPorCobrarSemanas();
  return semanas;
};

export default { getFlujoFondos, getVentasPorCobrarSemanas };
