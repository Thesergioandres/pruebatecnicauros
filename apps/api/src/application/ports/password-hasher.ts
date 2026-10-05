/**
 * Puerto para el hasheo de contrasenas. La implementacion de
 * infraestructura usa bcrypt con coste >= 12. Nunca loguear la contrasena
 * en claro ni el hash resultante.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
