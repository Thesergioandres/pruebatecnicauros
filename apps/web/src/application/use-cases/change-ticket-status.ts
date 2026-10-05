import type { Ticket, TicketStatus } from "@soporte/shared";

import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Caso de uso: cambiar de estado. Centraliza la observacion opcional y
 * delega en el repositorio la validacion de la transicion.
 */
export class ChangeTicketStatusUseCase {
  constructor(private readonly repository: TicketRepository) {}

  async execute(
    id: string,
    nextStatus: TicketStatus,
    observation: string | undefined,
    actor: { id: string; name: string; email: string },
  ): Promise<Ticket> {
    return this.repository.changeStatus(id, nextStatus, observation, actor);
  }
}
