/**
 * env.ts
 *
 * Carga las variables de entorno desde el `.env` de la raíz del monorepo.
 * Sube directorios hasta encontrarlo, así funciona igual al correr desde
 * `apps/api`, desde la raíz o desde cualquier script interno.
 * Si no hay `.env`, no falla: se usan los valores por defecto de cada módulo.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

let directorio = dirname(fileURLToPath(import.meta.url));

// Sube hasta la raíz del disco buscando el `.env` del monorepo.
while (true) {
  const candidato = resolve(directorio, ".env");
  if (existsSync(candidato)) {
    config({ path: candidato });
    break;
  }
  const padre = dirname(directorio);
  if (padre === directorio) break;
  directorio = padre;
}
