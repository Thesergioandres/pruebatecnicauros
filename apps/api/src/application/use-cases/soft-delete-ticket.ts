import { assertCanDelete } from "../authz.js";
import { NotFoundError } from "../errors.js";
import type { Clock, TicketRepository } from "../ports/index.js";
import type { SessionUser } from "@soporte/shared";

export interface SoftDeleteTicketInput {
  readonly id: string;
  readonly actor: SessionUser;
}

/**
 * Caso de uso: soft delete de un ticket. Restringido a `ADMIN` (lanza
 * `AuthorizationError` para cualquier otro rol). Es idempotente: si el
 * ticket ya esta borrado, no falla.
 */
export class SoftDeleteTicketUseCase {
  constructor(
    private readonly deps: {
      readonly tickets: TicketRepository;
      readonly clock: Clock;
    },
  ) {}

  async execute(input: SoftDeleteTicketInput): Promise<void> {
    assertCanDelete(input.actor);
    const ticket = await this.deps.tickets.findById(input.id);
    if (ticket === null) {
      throw new NotFoundError("Ticket", input.id);
    }
    if (ticket.deletedAt !== null) {
      // Idempotente: ya estaba borrado.
      return;
    }
    await this.deps.tickets.softDelete(input.id, this.deps.clock.now());
  }
}
