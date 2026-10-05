import type { LoginInput, RegisterInput } from "@soporte/shared";

import type { AuthSession } from "../../domain/auth.js";

/**
 * Puerto de autenticacion. La capa de presentacion solo conoce este contrato;
 * la implementacion concreta (en memoria para el shell, HTTP para produccion)
 * se elige en el composition root (`infrastructure/container.ts`).
 */
export interface AuthRepository {
  login(input: LoginInput): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  logout(): Promise<void>;
}
