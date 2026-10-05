import type { AdminUserRepository, CreateAdminUserInput, AdminUserSummary } from "../ports/admin-user-repository.js";

/**
 * Caso de uso: alta de usuario desde el panel admin. La validacion de
 * campos (zod) la hace la UI; aqui solo delegamos en el repositorio.
 */
export class CreateAdminUserUseCase {
  constructor(private readonly repository: AdminUserRepository) {}

  async execute(input: CreateAdminUserInput): Promise<AdminUserSummary> {
    return this.repository.create(input);
  }
}
