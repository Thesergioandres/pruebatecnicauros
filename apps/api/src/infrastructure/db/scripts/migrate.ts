/**
 * migrate.ts
 *
 * Aplica las migraciones SQL de `apps/api/src/infrastructure/db/migrations/`
 * en orden lexicografico. Es idempotente:
 *   - Asegura la tabla `schema_migrations` (track de archivos aplicados).
 *   - Cada archivo se ejecuta dentro de una transaccion; solo si termina OK
 *     se registra como aplicado.
 *
 * Uso:
 *   npm run db:migrate --workspace @soporte/api
 *
 * Variables de entorno:
 *   DATABASE_URL     (obligatorio; tomado de .env o .env.example si existe)
 *   DATABASE_POOL_MAX (opcional; default 10)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { closePool, getPool } from "../pool.js";
import { loadDatabaseConfig } from "../config.js";
import type { AppliedMigrationRow } from "../types.js";

const MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../migrations",
);

const TRACKING_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename   TEXT        PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

async function ensureTrackingTable(): Promise<void> {
  await getPool().query(TRACKING_TABLE_DDL);
}

async function appliedMigrations(): Promise<Set<string>> {
  const result = await getPool().query<AppliedMigrationRow>(
    "SELECT filename, applied_at FROM schema_migrations",
  );
  return new Set(result.rows.map((row) => row.filename));
}

function listMigrationFiles(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Directorio de migraciones no existe: ${MIGRATIONS_DIR}`);
  }
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"));
}

async function applyMigration(filename: string): Promise<void> {
  const filePath = resolve(MIGRATIONS_DIR, filename);
  const sql = readFileSync(filePath, "utf8");
  // Cada archivo se ejecuta en una transaccion: si falla a mitad, no queda
  // parcialmente aplicado. El runner registra en schema_migrations solo si
  // COMMIT sale bien.
  await getPool().query("BEGIN");
  try {
    await getPool().query(sql);
    await getPool().query(
      "INSERT INTO schema_migrations (filename) VALUES ($1)",
      [filename],
    );
    await getPool().query("COMMIT");
  } catch (error) {
    await getPool().query("ROLLBACK");
    throw error;
  }
}

async function main(): Promise<void> {
  loadDatabaseConfig();
  await ensureTrackingTable();
  const applied = await appliedMigrations();
  const files = listMigrationFiles();
  let pending = 0;
  for (const filename of files) {
    if (applied.has(filename)) {
      // eslint-disable-next-line no-console
      console.log(`[migrate] skip   ${filename} (ya aplicada)`);
      continue;
    }
    pending += 1;
    // eslint-disable-next-line no-console
    console.log(`[migrate] apply  ${filename}`);
    await applyMigration(filename);
    // eslint-disable-next-line no-console
    console.log(`[migrate] ok     ${filename}`);
  }
  if (pending === 0) {
    // eslint-disable-next-line no-console
    console.log("[migrate] nada que aplicar; esquema al dia.");
  } else {
    // eslint-disable-next-line no-console
    console.log(`[migrate] ${pending} migracion(es) aplicada(s).`);
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`[migrate] error: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
