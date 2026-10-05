import bcrypt from "bcryptjs";

import type { PasswordHasher } from "../../application/ports/index.js";

/**
 * Implementacion real del hasher usando `bcryptjs`. Coste por defecto
 * 12, alineado con las recomendaciones OWASP. No loguear ni la
 * contrasena en claro ni el hash resultante.
 */
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost: number = 12) {}

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
