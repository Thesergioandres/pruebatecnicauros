import { randomUUID } from "node:crypto";

import type { IdGenerator } from "../../application/ports/index.js";

/**
 * Generador de identificadores por defecto. Usa `crypto.randomUUID()`
 * (RFC 4122 v4) integrado en Node.
 */
export class RandomUuidIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
