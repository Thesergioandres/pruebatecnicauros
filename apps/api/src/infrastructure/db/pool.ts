/**
 * Pool de conexiones PostgreSQL compartido por la API y los scripts CLI.
 *
 * El modulo expone `getPool()` (singleton lazy) y `withTransaction()`
 * para envolver operaciones que deben ejecutarse de forma atomica.
 *
 * Reglas:
 *  - Ninguna credencial se lee del codigo: todo llega de `DATABASE_URL`.
 *  - Ninguna consulta se construye por concatenacion: solo placeholders `$N`
 *    de la libreria `pg`, que se encarga de escapar parametros.
 */

import pg from "pg";
import { loadDatabaseConfig } from "./config.js";

const { Pool } = pg;

export type DbPool = pg.Pool;
export type DbClient = pg.PoolClient;

let pool: DbPool | undefined;

export function getPool(): DbPool {
  if (pool === undefined) {
    const config = loadDatabaseConfig();
    pool = new Pool({
      connectionString: config.connectionString,
      max: config.poolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      application_name: "soporte-api",
    });
    pool.on("error", (error: Error) => {
      // Un cliente ocioso murio; el pool lo recreara. Log a stderr para que
      // los scripts CLI lo vean sin depender del logger de la app.
      // eslint-disable-next-line no-console
      console.error("[db] pool client error", error.message);
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool !== undefined) {
    await pool.end();
    pool = undefined;
  }
}

/**
 * Ejecuta `fn` dentro de una transaccion. Si la funcion lanza, se hace
 * ROLLBACK y se re-lanza el error; si termina OK, se hace COMMIT.
 */
export async function withTransaction<T>(
  fn: (client: DbClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignorar: el error original es el relevante.
    }
    throw error;
  } finally {
    client.release();
  }
}
