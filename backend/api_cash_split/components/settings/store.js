import sql from "../../../store/database.js";

// settings is a tiny key/value store (key TEXT PRIMARY KEY, value TEXT NOT
// NULL) for UI-editable persisted settings. Only the WhatsApp renewal message
// template is stored today.

// Returns the stored value for a key, or null when no row exists.
export async function get(key) {
  const [row] = await sql`
        SELECT value FROM settings
        WHERE key = ${key}
    `;
  return row?.value ?? null;
}

// Upserts a key/value pair and returns the stored value (the RETURNING row is
// always present: the conflict path updates the existing row).
export async function set(key, value) {
  const [row] = await sql`
        INSERT INTO settings (key, value)
        VALUES (${key}, ${value})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        RETURNING value
    `;
  return row.value;
}
