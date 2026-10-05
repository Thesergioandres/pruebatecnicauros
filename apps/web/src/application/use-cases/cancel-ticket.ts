import type { Ticket } from "@soporte/shared";

import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Caso de uso: cancelar solicitud. Equivalente a `change-ticket-status`
 * hacia `CANCELADA`, expuesto aparte por su semantica de negocio.
 */
export class CancelTicketUseCase {
  constructor(private readonly repository: TicketRepository) {}

  async execute(
    id: string,
    observation: string | undefined,
    actor: { id: string; name: string; email: string },
  ): Promise<Ticket> {
    return this.repository.cancel(id, observation, actor);
  }
}
