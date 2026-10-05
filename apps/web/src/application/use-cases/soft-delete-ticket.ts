import type { Ticket } from "@soporte/shared";

import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Caso de uso: soft delete de una solicitud. Solo lo invoca el panel
 * admin; la UI ya限制了 el acceso a usuarios `ADMIN`. El repositorio
 * delega en el storage el marcado de `deletedAt` y deja una entrada en
 * el historial con la observacion "Solicitud eliminada".
 */
export class SoftDeleteTicketUseCase {
  constructor(private readonly repository: TicketRepository) {}

  async execute(
    id: string,
    actor: { id: string; name: string; email: string },
  ): Promise<Ticket> {
    return this.repository.softDelete(id, actor);
  }
}
