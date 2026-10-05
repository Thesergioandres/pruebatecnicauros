import type { Clock } from "../../application/ports/index.js";

/**
 * Reloj de pared por defecto. Devuelve la hora actual en formato ISO 8601
 * con milisegundos y sufijo Z (UTC). Los tests y los seeds inyectan un
 * reloj fijo para tener resultados deterministas.
 */
export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}
