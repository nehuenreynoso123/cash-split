import { add, remove, list, update } from "./store.js";

export const addCajaGastos = async (body) => {
  const { descripcion, monto } = body;
  await add({ descripcion, monto });
};

export const editCajaGastos = async (body) => {
  const { descripcion, monto, id } = body;
  await update({ descripcion, monto, id });
};
export const removeCajaGastos = async (id) => {
  await remove({ id });
};
export const getCajaGastos = async () => {
  const listGastos = await list();
  return listGastos;
};

export default {
  addCajaGastos,
  editCajaGastos,
  removeCajaGastos,
  getCajaGastos,
};
