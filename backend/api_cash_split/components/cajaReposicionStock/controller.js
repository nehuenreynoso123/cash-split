import { add, list, remove, update } from "./store";

export const addCajaReposicionStock = async (body) => {
  const { nombre, descripcion, monto } = body;
  await add({ nombre, descripcion, monto });
};

export const editCajaReposicionStock = async (body) => {
  const { id, nombre, descripcion, monto } = body;
  await update({ id, nombre, descripcion, monto });
};

export const removeCajaReposicionStock = async (id) => {
  await remove({ id });
};

export const listCajaReposicionStock = async () => {
  const listCajaReposicionStock = await list();
  return listCajaReposicionStock;
};

export default {
  addCajaReposicionStock,
  editCajaReposicionStock,
  removeCajaReposicionStock,
  listCajaReposicionStock,
};
