import { add, list, edit, remove } from "./store";

const addProducto = async (body) => {
  const { nombre, precio, stock } = body;
  await add({ nombre, precio, stock });
};

const editProducto = async (body) => {
  const { id, nombre, precio, stock } = body;
  await edit({ id, nombre, precio, stock });
};

const listProducto = async () => {
  const listProductos = await list();
  return listProductos;
};

const removeProducto = async (id) => {
  await remove({ id });
};

export default { addProducto, editProducto, listProducto, removeProducto };
