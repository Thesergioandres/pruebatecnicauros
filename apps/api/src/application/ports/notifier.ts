import type { Ticket, TicketStatus, UserSummary } from "@soporte/shared";

/**
 * Puerto para el envio de notificaciones por email. La implementacion
 * de infraestructura (Resend) corre el envio en background; este
 * puerto expone metodos sincronos `void` para que los casos de uso
 * puedan dispararlos sin `await` y mantener el tiempo de respuesta
 * del endpoint < tiempo de envio del email.
 *
 * Si el envio falla, la implementacion debe loguearlo y continuar;
 * la operacion que disparo la notificacion ya ha commiteado.
 */
export interface Notifier {
  notifyTicketCreated(ticket: Ticket): void;
  notifyStatusChanged(input: {
    readonly ticket: Ticket;
    readonly previousStatus: TicketStatus;
    readonly observation: string | null;
    readonly actor: UserSummary;
  }): void;
}
