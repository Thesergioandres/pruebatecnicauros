import type { SessionUser, Ticket } from "@soporte/shared";

import { assertEditable } from "../../domain/ticket-policy.js";
import { assertCanEdit } from "../authz.js";
import { NotFoundError } from "../errors.js";
import type {
  Clock,
  TicketRepository,
  UpdateTicketPatch,
  UserDirectory,
} from "../ports/index.js";

export interface UpdateTicketInput {
  readonly id: string;
  readonly changes: UpdateTicketPatch;
  readonly actor: SessionUser;
}

/**
 * Caso de uso: edicion parcial de un ticket.
 * Reglas:
 *  - Si el ticket no existe, lanza `NotFoundError`.
 *  - Si el actor no es `ADMIN` y no es el solicitante, lanza
 *    `AuthorizationError` (politica: el cliente solo opera sus
 *    tickets).
 *  - Si esta en estado terminal (RESUELTA/CANCELADA), lanza
 *    `TicketLockedError` (politica del dominio).
 *  - Si se reasigna a otro usuario, este debe existir; para desasignar
 *    se envia `assignedToId: null`.
 *  - Si el parche llega vacio, devuelve el ticket sin tocarlo.
 */
export class UpdateTicketUseCase {
  constructor(
    private readonly deps: {
      readonly tickets: TicketRepository;
      readonly users: UserDirectory;
      readonly clock: Clock;
    },
  ) {}

  async execute(input: UpdateTicketInput): Promise<Ticket> {
    const current = await this.deps.tickets.findById(input.id);
    if (current === null) {
      throw new NotFoundError("Ticket", input.id);
    }

    assertCanEdit(input.actor, current);
    assertEditable(current);

    const changes = await this.buildChanges(input.changes);
    if (Object.keys(changes).length === 0) {
      return current;
    }

    const now = this.deps.clock.now();
    return this.deps.tickets.update(input.id, changes, now);
  }

  private async buildChanges(
    input: UpdateTicketPatch,
  ): Promise<UpdateTicketPatch> {
    const result: Mutable<UpdateTicketPatch> = {};
    if (input.title !== undefined) result.title = input.title;
    if (input.description !== undefined) result.description = input.description;
    if (input.category !== undefined) result.category = input.category;
    if (input.priority !== undefined) result.priority = input.priority;
    if ("assignedToId" in input) {
      const assignedId = input.assignedToId;
      if (assignedId === null || assignedId === undefined) {
        result.assignedToId = null;
      } else {
        const found = await this.deps.users.findById(assignedId);
        if (found === null) {
          throw new NotFoundError("Usuario", assignedId);
        }
        result.assignedToId = assignedId;
      }
    }
    return result;
  }
}

/**
 * Construye un clon mutable de `UpdateTicketPatch`. Como el tipo de
 * entrada tiene todos sus campos `readonly`, no podemos asignar
 * directamente; este helper es la unica excepcion controlada.
 */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
