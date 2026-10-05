import type { NewHistoryEntry } from "../../domain/ports.js";
import type { Ticket, TicketStatus } from "@soporte/shared";

/**
 * Puerto atomico para cambio de estado. El caso de uso valida la
 * transicion via el dominio (`assertTransition`) y luego delega aqui el
 * paso de persistencia. La implementacion de infraestructura DEBE ejecutar
 * el UPDATE del ticket y el INSERT de la historia dentro de una sola
 * transaccion; si no, los dos eventos pueden divergir ante un fallo
 * parcial.
 */
export interface TicketTransitionWriter {
  applyTransition(input: {
    readonly ticketId: string;
    readonly newStatus: TicketStatus;
    readonly resolvedAt: string | null;
    readonly now: string;
    readonly history: NewHistoryEntry;
  }): Promise<Ticket>;
}
