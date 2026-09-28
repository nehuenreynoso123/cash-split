import { add, remove, list, update } from "./store.js";

export const addCajaGastos = async (body) => {
  const { descripcion, monto, categoria } = body;
  await add({ descripcion, monto, categoria });
};

export const editCajaGastos = async (body) => {
  const { descripcion, monto, categoria, id } = body;
  await update({ descripcion, monto, categoria, id });
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
