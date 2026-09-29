import { add, remove, list, update } from "./store.js";

export const addCajaGastos = async (body) => {
  const { descripcion, monto, categoria, tipo } = body;
  await add({ descripcion, monto, categoria, tipo });
};

export const editCajaGastos = async (body) => {
  const { descripcion, monto, categoria, tipo, id } = body;
  await update({ descripcion, monto, categoria, tipo, id });
};
export const removeCajaGastos = async (id) => {
  await remove({ id });
};
export const getCajaGastos = async ({ desde, hasta, limit, offset, categoria } = {}) => {
  const listGastos = await list({ desde, hasta, limit, offset, categoria });
  return listGastos;
};

export default {
  addCajaGastos,
  editCajaGastos,
  removeCajaGastos,
  getCajaGastos,
};
