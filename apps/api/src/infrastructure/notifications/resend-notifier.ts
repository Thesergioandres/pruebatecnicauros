import type {
  Ticket,
  TicketStatus,
  UserSummary,
} from "@soporte/shared";

import type { Notifier } from "../../application/ports/index.js";

/**
 * Logger minimo que el notifier usa para reportar el ciclo de envio.
 * La app pasa `pino` u otro logger; el notifier solo llama a `info`
 * en exito y `warn` en fallo, ambos con un objeto estructurado que
 * incluye el `id` que devuelve Resend (util para trazabilidad y
 * soporte con el panel de Resend).
 */
export interface NotifierLogger {
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
}

export interface ResendNotifierOptions {
  readonly apiKey: string;
  readonly fromEmail: string;
  readonly notifyNewTicketTo: string;
  readonly logger?: NotifierLogger;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Construye el cuerpo del email para la creacion de un ticket. Lo
 * exponemos para que un test de integracion pueda validar el payload
 * sin necesidad de un mock de fetch.
 */
export function buildTicketCreatedEmail(input: {
  readonly ticket: Ticket;
  readonly fromEmail: string;
  readonly to: string;
}): {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
} {
  const { ticket, fromEmail, to } = input;
  const subject = `[Nuevo ticket ${ticket.id}] ${ticket.title}`;
  const fields: ReadonlyArray<readonly [string, string]> = [
    ["ID", ticket.id],
    ["Titulo", ticket.title],
    ["Descripcion", ticket.description],
    ["Categoria", ticket.category],
    ["Prioridad", ticket.priority],
    ["Estado", ticket.status],
    ["Solicitante", `${ticket.requester.name} <${ticket.requester.email}>`],
    ["Asignado a", ticket.assignedTo === null ? "(sin asignar)" : `${ticket.assignedTo.name} <${ticket.assignedTo.email}>`],
    ["Creado", ticket.createdAt],
    ["Actualizado", ticket.updatedAt],
    ["Resuelto", ticket.resolvedAt ?? "(no resuelto)"],
    ["Eliminado", ticket.deletedAt ?? "(no eliminado)"],
  ];
  const text = [
    subject,
    "",
    ...fields.map(([k, v]) => `${k}: ${v}`),
  ].join("\n");
  const htmlRows = fields
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 8px;font-weight:600">${escapeHtml(k)}</td><td style="padding:4px 8px">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px">
      <h2 style="margin:0 0 12px">${escapeHtml(subject)}</h2>
      <table style="border-collapse:collapse">${htmlRows}</table>
    </div>
  `.trim();
  return { from: fromEmail, to, subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Notifier que envia emails a traves de la API HTTP de Resend
 * (`POST https://api.resend.com/emails`). Implementacion envio no bloqueante:
 * el caso de uso no espera al envio; si Resend falla, se loguea y la
 * operacion original sigue verde.
 *
 * Si `apiKey` esta vacia (p. ej. en desarrollo local sin Resend
 * configurado), el notifier hace no-op logueando una sola vez al
 * instanciarse, para no contaminar los logs en cada operacion.
 */
export class ResendNotifier implements Notifier {
  private readonly enabled: boolean;

  constructor(private readonly options: ResendNotifierOptions) {
    this.enabled = options.apiKey.trim() !== "";
    if (!this.enabled) {
      this.options.logger?.warn(
        { from: options.fromEmail, to: options.notifyNewTicketTo },
        "Resend deshabilitado: RESEND_API_KEY vacia; notificaciones omitidas",
      );
    }
  }

  notifyTicketCreated(ticket: Ticket): void {
    if (!this.enabled) return;
    const payload = buildTicketCreatedEmail({
      ticket,
      fromEmail: this.options.fromEmail,
      to: this.options.notifyNewTicketTo,
    });
    this.send({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      ticketId: ticket.id,
      event: "TICKET_CREATED",
    }).catch((err: unknown) => {
      this.options.logger?.warn(
        { err, ticketId: ticket.id, subject: payload.subject },
        "Fallo el envio del email de creacion de ticket",
      );
    });
  }

  notifyStatusChanged(input: {
    ticket: Ticket;
    previousStatus: TicketStatus;
    observation: string | null;
    actor: UserSummary;
  }): void {
    if (!this.enabled) return;
    const subject = `[Ticket ${input.ticket.id}] ${input.previousStatus} -> ${input.ticket.status}`;
    const text = [
      subject,
      `Titulo: ${input.ticket.title}`,
      `Solicitante: ${input.ticket.requester.name} <${input.ticket.requester.email}>`,
      `Cambiado por: ${input.actor.name} <${input.actor.email}>`,
      `Observacion: ${input.observation ?? "(sin observacion)"}`,
    ].join("\n");
    const html = `<p>${escapeHtml(subject)}</p><pre style="font-family:system-ui">${escapeHtml(text)}</pre>`;
    this.send({
      from: this.options.fromEmail,
      to: this.options.notifyNewTicketTo,
      subject,
      text,
      html,
      ticketId: input.ticket.id,
      event: "STATUS_CHANGED",
    }).catch((err: unknown) => {
      this.options.logger?.warn(
        { err, ticketId: input.ticket.id, subject },
        "Fallo el envio del email de cambio de estado",
      );
    });
  }

  private async send(payload: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    ticketId?: string;
    event?: "TICKET_CREATED" | "STATUS_CHANGED";
  }): Promise<void> {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: payload.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Resend respondio ${response.status} ${response.statusText}: ${detail.slice(0, 200)}`,
      );
    }
    // Resend devuelve `{ id: "<uuid>" }` en el body de exito. Lo
    // registramos para que el equipo de soporte pueda cruzar el log
    // con el panel de Resend sin tener que buscar por ventana temporal.
    const body = (await response.json().catch(() => null)) as
      | { id?: string }
      | null;
    if (body?.id !== undefined) {
      this.options.logger?.info(
        {
          resendId: body.id,
          ticketId: payload.ticketId,
          event: payload.event,
          to: payload.to,
          subject: payload.subject,
        },
        "Email de notificacion enviado",
      );
    }
  }
}
