import { listTotalCajas } from "./store.js";

const getTotalCajas = async ({ desde, hasta } = {}) => {
  const list = await listTotalCajas({ desde, hasta });
  return list;
};

export default { getTotalCajas };
