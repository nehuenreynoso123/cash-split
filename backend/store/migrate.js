import sql from "./database.js";

// Idempotent DDL migrations for already-initialized databases.
// The same ALTER statements live in store/init.sql for fresh DB init, but they
// only run when a DB is first created — so a pre-existing `productos` table
// never received `fecha_carga`. Running these on every app module load covers
// both the Vercel cold start and the local server boot.
//
// - ADD COLUMN IF NOT EXISTS no-ops once the column exists.
// - ALTER COLUMN TYPE DATE USING fecha_carga::date no-ops when it is already
//   DATE, and also converts a DB that got the earlier TIMESTAMP version.
// - sql.unsafe is required: these are unparameterized DDL statements.
// - If a statement throws, module load fails loudly — the app would be broken
//   anyway without the column.

const MIGRATIONS = [
  "ALTER TABLE productos ADD COLUMN IF NOT EXISTS fecha_carga DATE NOT NULL DEFAULT CURRENT_DATE",
  "ALTER TABLE productos ALTER COLUMN fecha_carga TYPE DATE USING fecha_carga::date",
];

export async function runMigrations() {
  for (const statement of MIGRATIONS) {
    await sql.unsafe(statement);
  }
}
