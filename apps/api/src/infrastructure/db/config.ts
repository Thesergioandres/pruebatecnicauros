/**
 * Configuracion de conexion a PostgreSQL.
 *
 * Prioridad de carga de variables:
 *   1. Variables ya presentes en `process.env` (inyectadas por docker, CI, etc.)
 *   2. Archivo `.env` en el cwd si existe
 *   3. Archivo `.env.example` en el cwd como fallback (solo para dev local)
 *
 * Asi los scripts de migracion/seed funcionan con un checkout fresco
 * copiando `.env.example` o levantando `docker compose up -d db`.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

function loadDotenvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const equalsAt = line.indexOf("=");
    if (equalsAt <= 0) continue;
    const key = line.slice(0, equalsAt).trim();
    let value = line.slice(equalsAt + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function findEnvFile(): string {
  // El script corre con cwd en la raiz del monorepo (npm workspaces).
  // Resolvemos相对于 el archivo actual para soportar tanto la ejecucion desde
  // la raiz como desde apps/api en el futuro.
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".env.example"),
    resolve(here, "../../../../.env"),
    resolve(here, "../../../../.env.example"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  // Devolver un path arbitrario: el caller deberia validar que DATABASE_URL existe.
  return candidates[0]!;
}

let envLoaded = false;
function ensureEnvLoaded(): void {
  if (envLoaded) return;
  const file = findEnvFile();
  if (file.endsWith(".env")) {
    loadDotenvFile(file);
  }
  // .env.example es fallback: se carga despues de .env para no pisar nada.
  const fallback = file.replace(/\.env$/, ".env.example");
  loadDotenvFile(fallback);
  envLoaded = true;
}

export interface DatabaseConfig {
  readonly connectionString: string;
  readonly poolMax: number;
}

export function loadDatabaseConfig(): DatabaseConfig {
  ensureEnvLoaded();
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString.trim() === "") {
    throw new Error(
      "DATABASE_URL no esta definido. Copia .env.example a .env o "
        + "exporta la variable antes de ejecutar scripts de DB.",
    );
  }
  const rawPoolMax = process.env.DATABASE_POOL_MAX;
  const poolMax = rawPoolMax === undefined || rawPoolMax.trim() === ""
    ? 10
    : Number.parseInt(rawPoolMax, 10);
  if (!Number.isFinite(poolMax) || poolMax <= 0) {
    throw new Error(
      `DATABASE_POOL_MAX invalido: ${rawPoolMax}. Debe ser un entero positivo.`,
    );
  }
  return { connectionString, poolMax };
}
