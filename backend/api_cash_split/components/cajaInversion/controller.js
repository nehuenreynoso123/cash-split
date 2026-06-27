import { add, remove, list, update } from "./store.js";

export const addCajaInversion = async (body) => {
  const { nombre, descripcion, monto } = body;
  await add({ nombre, descripcion, monto });
};

export const editCajaInversion = async (body) => {
  const { nombre, descripcion, monto, id } = body;
  await update({ nombre, descripcion, monto, id });
};

export const removeCajaInversion = async (id) => {
  await remove({ id });
};

export const listCajaInversion = async () => {
  const inversion = await list();
  return inversion;
};

export default {
  addCajaInversion,
  editCajaInversion,
  removeCajaInversion,
  listCajaInversion,
};
