import type {
  ListTicketsQuery,
  ListTicketsResult,
} from "../../domain/tickets.js";
import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Caso de uso: listar solicitudes con busqueda, filtros, orden y paginacion.
 * La capa de presentacion no manipula queries crudas: las arma aqui dentro.
 */
export class ListTicketsUseCase {
  constructor(private readonly repository: TicketRepository) {}

  async execute(query: ListTicketsQuery): Promise<ListTicketsResult> {
    return this.repository.list(query);
  }
}
