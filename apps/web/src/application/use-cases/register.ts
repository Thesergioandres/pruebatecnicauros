import type { RegisterInput } from "@soporte/shared";

import type { AuthSession } from "../../domain/auth.js";
import type { AuthRepository } from "../ports/auth-repository.js";

/**
 * Caso de uso: alta de cuenta.
 */
export class RegisterUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(input: RegisterInput): Promise<AuthSession> {
    return this.repository.register(input);
  }
}
