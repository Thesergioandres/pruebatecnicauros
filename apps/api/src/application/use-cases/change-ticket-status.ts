import type {
  SessionUser,
  Ticket,
  TicketStatus,
  UserSummary,
} from "@soporte/shared";

import { assertTransition } from "../../domain/ticket-policy.js";
import { assertCanTransition } from "../authz.js";
import { NotFoundError } from "../errors.js";
import type {
  Clock,
  Notifier,
  TicketRepository,
  TicketTransitionWriter,
} from "../ports/index.js";

export interface ChangeTicketStatusInput {
  readonly id: string;
  readonly newStatus: TicketStatus;
  readonly observation: string | null;
  readonly actor: SessionUser;
}

/**
 * Caso de uso: cambia el estado de un ticket validando la transicion
 * (politica del dominio) y, si pasa, delega la persistencia atomica
 * (UPDATE + INSERT en historial) al `TicketTransitionWriter`.
 *
 * Reglas:
 *  - Si el ticket no existe, lanza `NotFoundError`.
 *  - Si el actor no es `ADMIN` y no es solicitante ni asignado, lanza
 *    `AuthorizationError`.
 *  - Si la transicion no esta permitida, lanza `InvalidTransitionError`.
 *  - Si la regla del spec exige observacion (CRITICA -> RESUELTA), lanza
 *    `ObservationRequiredError` cuando llegue vacia o solo espacios.
 */
export class ChangeTicketStatusUseCase {
  constructor(
    private readonly deps: {
      readonly tickets: TicketRepository;
      readonly transitions: TicketTransitionWriter;
      readonly clock: Clock;
      readonly notifier?: Notifier;
    },
  ) {}

  async execute(input: ChangeTicketStatusInput): Promise<Ticket> {
    const current = await this.deps.tickets.findById(input.id);
    if (current === null) {
      throw new NotFoundError("Ticket", input.id);
    }

    assertCanTransition(input.actor, current);
    assertTransition(current.status, input.newStatus, {
      priority: current.priority,
      observation: input.observation ?? undefined,
    });

    const now = this.deps.clock.now();
    const resolvedAt = input.newStatus === "RESUELTA" ? now : null;

    const updated = await this.deps.transitions.applyTransition({
      ticketId: input.id,
      newStatus: input.newStatus,
      resolvedAt,
      now,
      history: {
        ticketId: input.id,
        previousStatus: current.status,
        newStatus: input.newStatus,
        changedBy: toUserSummary(input.actor),
        observation: input.observation ?? null,
        createdAt: now,
      },
    });

    if (this.deps.notifier !== undefined) {
      this.deps.notifier.notifyStatusChanged({
        ticket: updated,
        previousStatus: current.status,
        observation: input.observation,
        actor: toUserSummary(input.actor),
      });
    }
    return updated;
  }
}

const toUserSummary = (user: SessionUser): UserSummary => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
