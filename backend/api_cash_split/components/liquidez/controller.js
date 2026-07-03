import { add, remove, list, update } from "./store.js";

export const addLiquidez = async (body) => {
  const { descripcion, monto, tipo } = body;
  await add({ descripcion, monto, tipo });
};

export const editLiquidez = async (body) => {
  const { descripcion, monto, tipo, id } = body;
  await update({ descripcion, monto, tipo, id });
};

export const removeLiquidez = async (id) => {
  await remove({ id });
};

export const getLiquidez = async () => {
  const items = await list();
  return items;
};

export default {
  addLiquidez,
  editLiquidez,
  removeLiquidez,
  getLiquidez,
};
