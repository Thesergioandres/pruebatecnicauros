import type { SessionUser } from "@soporte/shared";

import { AuthenticationError } from "../../errors.js";
import type { UserRepository } from "../../ports/index.js";
import type { SessionClaims } from "../../ports/session-token-signer.js";

/**
 * Caso de uso: devuelve el usuario asociado a una sesion activa, en
 * forma `SessionUser` (incluye `role`) para que el front pueda pintar
 * guardas de ADMIN/USER y los paneles correspondientes.
 *
 * Si el id de los claims ya no existe (usuario borrado), lanza
 * `AuthenticationError("invalido")` para forzar re-login. La fila
 * interna trae `passwordHash`; aqui se proyecta a `SessionUser` y se
 * descarta el hash antes de devolver.
 */
export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(claims: SessionClaims): Promise<SessionUser> {
    const user = await this.users.findById(claims.subject);
    if (user === null) {
      throw new AuthenticationError("invalido");
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
