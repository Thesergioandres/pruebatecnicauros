import type { UserRole } from "@soporte/shared";

import { InvalidCredentialsError } from "../../errors.js";
import type { PasswordHasher, UserRepository } from "../../ports/index.js";

export interface LoginUserInput {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly userId: string;
  readonly role: UserRole;
}

/**
 * Caso de uso: inicio de sesion. Valida el par email/contrasena contra el
 * hash almacenado. Lanza `InvalidCredentialsError` tanto si el usuario
 * no existe como si la contrasena no coincide, para no filtrar existencia.
 */
export class LoginUserUseCase {
  constructor(
    private readonly deps: {
      readonly users: UserRepository;
      readonly hasher: PasswordHasher;
    },
  ) {}

  async execute(input: LoginUserInput): Promise<LoginResult> {
    const user = await this.deps.users.findByEmail(input.email);
    if (user === null) {
      throw new InvalidCredentialsError();
    }
    const ok = await this.deps.hasher.verify(input.password, user.passwordHash);
    if (!ok) {
      throw new InvalidCredentialsError();
    }
    return { userId: user.id, role: user.role };
  }
}
