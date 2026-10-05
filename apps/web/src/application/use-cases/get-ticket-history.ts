import type { TicketHistoryEntry } from "@soporte/shared";

import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Caso de uso: historial paginado de una solicitud.
 * Lo expone la UI en el detalle para que el usuario vea quien hizo cada
 * cambio y con que observacion.
 */
export class GetTicketHistoryUseCase {
  constructor(private readonly repository: TicketRepository) {}

  async execute(
    id: string,
    pagination: { page: number; pageSize: number },
  ): Promise<{ items: TicketHistoryEntry[]; total: number }> {
    return this.repository.history(id, pagination);
  }
}
