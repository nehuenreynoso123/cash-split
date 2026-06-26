import { listTotalCajas } from "./store";

const getTotalCajas = async () => {
  const list = await listTotalCajas();
  return list;
};

export default { getTotalCajas };
