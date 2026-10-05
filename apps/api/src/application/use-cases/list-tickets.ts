import type { Page, SessionUser, Ticket } from "@soporte/shared";

import type {
  ListTicketsQuery,
  TicketRepository,
} from "../ports/index.js";

export interface ListTicketsInput {
  readonly query: ListTicketsQuery;
  readonly actor: SessionUser;
}

/**
 * Caso de uso: lista tickets aplicando busqueda, filtros, orden y
 * paginacion. La validacion de los parametros de entrada la hace la
 * capa HTTP (zod) antes de invocar este caso de uso.
 *
 * Reglas de autorizacion:
 *  - `ADMIN` ve todos los tickets.
 *  - `USER` ve unicamente los tickets en los que es solicitante o
 *    asignado. El filtro se aplica en la capa de aplicacion tras la
 *    consulta del repositorio; el `total` reportado refleja solo los
 *    visibles para el actor.
 */
export class ListTicketsUseCase {
  constructor(private readonly tickets: TicketRepository) {}

  async execute(input: ListTicketsInput): Promise<Page<Ticket>> {
    const page = await this.tickets.list(input.query);
    if (input.actor.role === "ADMIN") return page;
    const filtered = page.items.filter(
      (t) =>
        t.requester.id === input.actor.id ||
        (t.assignedTo !== null && t.assignedTo.id === input.actor.id),
    );
    return {
      ...page,
      items: filtered,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / page.pageSize)),
    };
  }
}
