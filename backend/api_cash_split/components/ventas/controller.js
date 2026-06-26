import { add, list, remove, update } from "./store";

const addVenta = async (body) => {
  const { nombre, precio, product_id, cantidad } = body;
  await add({ nombre, precio, product_id, cantidad });
};

const editVenta = async (body) => {
  const { id, nombre, precio, product_id } = body;
  await update({ id, nombre, precio, product_id });
};

const removeVenta = async (id) => {
  await remove({ id });
};

const listVenta = async () => {
  const listVentas = await list();
  return listVentas;
};

export default {
  addVenta,
  editVenta,
  removeVenta,
  listVenta,
};
