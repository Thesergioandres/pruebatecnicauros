import type { Ticket } from "../../domain/tickets.js";
import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Caso de uso: detalle de una solicitud. Devuelve `null` si no existe.
 */
export class GetTicketUseCase {
  constructor(private readonly repository: TicketRepository) {}

  async execute(id: string): Promise<Ticket | null> {
    return this.repository.getById(id);
  }
}
