import type {
  Page,
  SessionUser,
  TicketHistoryEntry,
} from "@soporte/shared";

import { assertCanView } from "../authz.js";
import { NotFoundError } from "../errors.js";
import type {
  TicketHistoryRepository,
  TicketRepository,
} from "../ports/index.js";

export interface GetTicketHistoryInput {
  readonly id: string;
  readonly page: number;
  readonly pageSize: number;
  readonly actor: SessionUser;
}

/**
 * Caso de uso: devuelve el historial paginado de un ticket, ordenado
 * por fecha descendente. Lanza `NotFoundError` si el ticket no existe
 * y `AuthorizationError` si el actor no es `ADMIN` ni solicitante
 * ni asignado.
 */
export class GetTicketHistoryUseCase {
  constructor(
    private readonly deps: {
      readonly tickets: TicketRepository;
      readonly history: TicketHistoryRepository;
    },
  ) {}

  async execute(input: GetTicketHistoryInput): Promise<Page<TicketHistoryEntry>> {
    const ticket = await this.deps.tickets.findById(input.id);
    if (ticket === null) {
      throw new NotFoundError("Ticket", input.id);
    }
    assertCanView(input.actor, ticket);
    return this.deps.history.listByTicket(input.id, {
      page: input.page,
      pageSize: input.pageSize,
    });
  }
}
