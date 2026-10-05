/**
 * Puerto para generar identificadores. La infraestructura usa
 * `crypto.randomUUID()`; los tests pueden pasar un contador determinista.
 */
export interface IdGenerator {
  generate(): string;
}
