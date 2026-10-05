import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Caso de uso: usuarios asignables. Se usa en el selector de responsable
 * al crear/editar una solicitud. La API real aplicara permisos (solo
 * usuarios activos con rol adecuado).
 */
export class ListUsersUseCase {
  constructor(private readonly repository: TicketRepository) {}

  async execute(): Promise<{ id: string; name: string; email: string }[]> {
    return this.repository.listUsers();
  }
}
