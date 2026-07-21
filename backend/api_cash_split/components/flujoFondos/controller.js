import { listFlujoFondos } from "./store.js";

const getFlujoFondos = async ({ desde, hasta } = {}) => {
  const list = await listFlujoFondos({ desde, hasta });
  return list;
};

export default { getFlujoFondos };
