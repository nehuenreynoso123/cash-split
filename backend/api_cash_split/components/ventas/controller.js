import { add, addFactura, list, listGrouped, remove, update } from "./store.js";

const addVenta = async (body) => {
  const { nombre, precio, product_id, cantidad, fecha_cobro } = body;
  await add({ nombre, precio, product_id, cantidad, fecha_cobro });
};

const addFacturaVenta = async (body) => {
  const { items, factura_id, fecha_cobro } = body;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items must be a non-empty array");
  }
  if (!factura_id) {
    throw new Error("factura_id is required");
  }
  return await addFactura({ items, factura_id, fecha_cobro });
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

const listVentaGrouped = async () => {
  return await listGrouped();
};

export default {
  addVenta,
  addFacturaVenta,
  editVenta,
  removeVenta,
  listVenta,
  listVentaGrouped,
};
