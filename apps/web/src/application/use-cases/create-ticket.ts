import type { CreateTicketInput } from "@soporte/shared";

import type { Ticket } from "../../domain/tickets.js";
import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Caso de uso: alta de solicitud. El solicitante lo deriva la UI de la
 * sesion actual (en el shell mock vive en `SessionProvider`; en produccion,
 * la API lo deduce de la cookie httpOnly).
 */
export class CreateTicketUseCase {
  constructor(private readonly repository: TicketRepository) {}

  async execute(
    input: CreateTicketInput,
    requester: { id: string; name: string; email: string },
  ): Promise<Ticket> {
    return this.repository.create(input, requester);
  }
}
