import type { UpdateTicketInput } from "@soporte/shared";

import type { Ticket } from "../../domain/tickets.js";
import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Caso de uso: edicion parcial de una solicitud. La regla "no se edita en
 * estados terminales" la aplica el repositorio segun `packages/shared`.
 */
export class UpdateTicketUseCase {
  constructor(private readonly repository: TicketRepository) {}

  async execute(id: string, input: UpdateTicketInput): Promise<Ticket> {
    return this.repository.update(id, input);
  }
}
