import type { SessionUser, Ticket } from "@soporte/shared";

import { assertCanView } from "../authz.js";
import { NotFoundError } from "../errors.js";
import type { TicketRepository } from "../ports/index.js";

export interface GetTicketInput {
  readonly id: string;
  readonly actor: SessionUser;
}

/**
 * Caso de uso: obtiene el detalle de un ticket por su identificador.
 * Reglas:
 *  - Lanza `NotFoundError` si el id esta vacio o el ticket no existe.
 *  - Lanza `AuthorizationError` si el actor no es `ADMIN` y no es
 *    solicitante ni asignado del ticket.
 */
export class GetTicketUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: GetTicketInput): Promise<Ticket> {
    if (typeof input.id !== "string" || input.id.trim() === "") {
      throw new NotFoundError("Ticket", input.id);
    }
    const ticket = await this.tickets.findById(input.id);
    if (ticket === null) {
      throw new NotFoundError("Ticket", input.id);
    }
    assertCanView(input.actor, ticket);
    return ticket;
  }
}
