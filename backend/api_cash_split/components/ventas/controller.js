import { add, addFactura, list, listGrouped, remove, removeFactura, update, updateFactura } from "./store.js";

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

const updateFacturaVenta = async (body) => {
  const { items, factura_id, fecha_cobro } = body;
  if (!factura_id || typeof factura_id !== "string") {
    throw new Error("factura_id es obligatorio");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("items debe ser un array no vacío");
  }
  for (const item of items) {
    if (!Number.isInteger(item.product_id)) {
      throw new Error("Cada item debe tener un product_id entero");
    }
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      throw new Error("Cada item debe tener una cantidad entera mayor a cero");
    }
    if (typeof item.precio !== "number" || Number.isNaN(item.precio) || item.precio < 0) {
      throw new Error("Cada item debe tener un precio numérico mayor o igual a cero");
    }
    if (item.id != null && !Number.isInteger(item.id)) {
      throw new Error("El id de cada item debe ser un entero cuando está presente");
    }
  }
  return await updateFactura({ items, factura_id, fecha_cobro });
};

const editVenta = async (body) => {
  const { id, nombre, precio, product_id } = body;
  await update({ id, nombre, precio, product_id });
};

const removeVenta = async (id) => {
  await remove({ id });
};

const removeVentaFactura = async (factura_id) => {
  return await removeFactura({ factura_id });
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
  updateFacturaVenta,
  editVenta,
  removeVenta,
  removeVentaFactura,
  listVenta,
  listVentaGrouped,
};
