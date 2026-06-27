import { listTotalCajas } from "./store.js";

const getTotalCajas = async () => {
  const list = await listTotalCajas();
  return list;
};

export default { getTotalCajas };
