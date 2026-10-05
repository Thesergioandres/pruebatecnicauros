import type { AdminUserRepository, AdminUserSummary } from "../ports/admin-user-repository.js";

/**
 * Caso de uso: listar usuarios para el panel admin.
 */
export class ListAdminUsersUseCase {
  constructor(private readonly repository: AdminUserRepository) {}

  async execute(): Promise<AdminUserSummary[]> {
    return this.repository.list();
  }
}
