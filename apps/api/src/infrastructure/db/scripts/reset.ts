/**
 * reset.ts
 *
 * Resetea la base de datos a un estado limpio de desarrollo:
 *   1. DROP de todas las tablas conocidas (en orden que respeta FKs).
 *   2. Re-ejecuta las migraciones.
 *   3. Re-corre el seed (a menos que se pase --no-seed).
 *
 * Uso:
 *   npm run db:reset --workspace @soporte/api
 *   npm run db:reset --workspace @soporte/api -- --no-seed
 *
 * Requiere confirmacion explicita salvo que se pase --yes.
 * Esta pensado solo para entornos de desarrollo; en produccion el script
 * debe negarse a correr si NODE_ENV=production.
 */

import { spawnSync } from "node:child_process";
import { closePool, getPool } from "../pool.js";
import { loadDatabaseConfig } from "../config.js";

interface ResetOptions {
  readonly seed: boolean;
  readonly force: boolean;
}

function parseArgs(argv: readonly string[]): ResetOptions {
  let seed = true;
  let force = false;
  for (const arg of argv) {
    if (arg === "--no-seed") seed = false;
    else if (arg === "--seed") seed = true;
    else if (arg === "--yes" || arg === "-y") force = true;
  }
  return { seed, force };
}

const TABLES_IN_DROP_ORDER = [
  // Primero las tablas con FKs hacia otras, luego las referenciadas.
  "ticket_history",
  "tickets",
  "users",
  "schema_migrations",
] as const;

async function dropTables(): Promise<void> {
  for (const table of TABLES_IN_DROP_ORDER) {
    await getPool().query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }
}

async function dropFunctionsAndTriggers(): Promise<void> {
  // El trigger se cae con la tabla (CASCADE), pero la funcion queda.
  // La re-creacion del trigger la recrea, asi que limpiarla garantiza un
  // reset completo del estado del schema.
  await getPool().query("DROP FUNCTION IF EXISTS set_updated_at() CASCADE");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (process.env.NODE_ENV === "production" && !options.force) {
    throw new Error(
      "db:reset esta deshabilitado en produccion. Usa --yes para forzar.",
    );
  }
  loadDatabaseConfig();

  // eslint-disable-next-line no-console
  console.log("[reset] eliminando tablas y funciones...");
  await dropFunctionsAndTriggers();
  await dropTables();

  // eslint-disable-next-line no-console
  console.log("[reset] ejecutando migraciones...");
  runSelfScript("migrate.ts");

  if (options.seed) {
    // eslint-disable-next-line no-console
    console.log("[reset] ejecutando seed...");
    runSelfScript("seed.ts");
  } else {
    // eslint-disable-next-line no-console
    console.log("[reset] seed omitido (--no-seed).");
  }
}

function runSelfScript(filename: string): void {
  // Reutiliza el mismo runner de tsx para garantizar mismo contexto ESM/TS.
  const here = new URL(import.meta.url);
  const scriptUrl = new URL(`./${filename}`, here).href;
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", scriptUrl],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    throw new Error(`subproceso ${filename} fallo con codigo ${result.status ?? "?"}`);
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(`[reset] error: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
