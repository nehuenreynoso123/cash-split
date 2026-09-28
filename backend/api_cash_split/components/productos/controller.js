import { add, list, edit, remove, listVentasPorProducto } from "./store.js";

const addProducto = async (body) => {
  const { nombre, precio, stock } = body;
  await add({ nombre, precio, stock });
};

const editProducto = async (body) => {
  const { id, nombre, precio, stock, fecha_carga } = body;
  await edit({ id, nombre, precio, stock, fecha_carga });
};

const listProducto = async () => {
  const listProductos = await list();
  return listProductos;
};

// Route propia en vez de ampliar GET /producto: el shape de la respuesta
// cambia por completo (una fila por producto con sus ventas agregadas, no la
// lista de productos). Mezclarlas rompería al cliente actual.
const listVentasProducto = async (query) => {
  return await listVentasPorProducto({ desde: query.desde, hasta: query.hasta });
};

const removeProducto = async (id) => {
  await remove({ id });
};

export default { addProducto, editProducto, listProducto, listVentasProducto, removeProducto };
