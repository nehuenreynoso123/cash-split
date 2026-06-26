import { add, list, remove, update } from "./store";

export const addDeudores = async (body) => {
  const { nombre, descripcion, monto } = body;
  await add({ nombre, descripcion, monto });
};

export const editDeudores = async (body) => {
  const { nombre, descripcion, monto } = body;
  await update({ nombre, descripcion, monto });
};

export const removeDeudores = async (id) => {
  await remove({ id });
};

export const listDeudores = async () => {
  const deudoresList = await list();
  return deudoresList;
};

export default {
  addDeudores,
  editDeudores,
  removeDeudores,
  listDeudores,
};
