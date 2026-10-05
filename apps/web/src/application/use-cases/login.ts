import type { LoginInput } from "@soporte/shared";

import type { AuthSession } from "../../domain/auth.js";
import type { AuthRepository } from "../ports/auth-repository.js";

/**
 * Caso de uso: iniciar sesion.
 * Mantiene la capa de presentacion libre de saber como se obtiene la sesion.
 */
export class LoginUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(input: LoginInput): Promise<AuthSession> {
    return this.repository.login(input);
  }
}
