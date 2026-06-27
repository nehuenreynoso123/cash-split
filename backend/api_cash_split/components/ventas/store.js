import sql from "../../../store/database.js";

export async function add({ nombre, precio, product_id, cantidad }) {
  return await sql.begin(async (sql) => {
    // 0. Obtener el costo del producto
    const [producto] = await sql`
            SELECT precio FROM productos WHERE id = ${product_id}
        `;

    const costo_total = Number(producto.precio) * Number(cantidad);
    const ganancia = Number(precio) - costo_total;

    // 1. Registrar la venta
    const [venta] = await sql`
            INSERT INTO ventas (nombre,precio,producto_id, cantidad, ganancia)
            VALUES (${nombre},${precio},${product_id}, ${cantidad}, ${ganancia})
            RETURNING id
        `;

    // 2. Restar valor del Total Invertido (Stock físico)
    await sql`
            UPDATE productos 
            SET stock = stock - ${cantidad}
            WHERE id = ${product_id}
        `;

    // 3. Sumar a Caja Reposición
    await sql`
            UPDATE caja_reposicion_stock SET monto = monto + ${precio} 
        `;

    // 4. restart a Caja inversion
    await sql`
            UPDATE caja_inversion SET monto = monto - ${precio}
        `;

    return venta;
  });
}

export async function list() {
  const list = await sql`SELECT * FROM ventas`;
  return list;
}

export async function update({ id, nombre, precio, product_id }) {
  await sql`UPDATE ventas SET nombre=${nombre}, precio=${precio},producto_id=${product_id} WHERE id = ${id}`;
}

export async function remove({ id }) {
  await sql`DELETE FROM ventas WHERE id=${id}`;
}
