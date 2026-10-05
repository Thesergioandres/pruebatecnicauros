import { Resend } from "resend";

import type {
  Notifier,
  StatusChangedEvent,
  TicketCreatedEvent,
} from "@/server/application/ports";
import { getEnv, isMailConfigured } from "@/server/infrastructure/env";

import { logger } from "../logger";

function ticketCreatedHtml(event: TicketCreatedEvent): string {
  return [
    `<p>Hola ${escapeHtml(event.requester)},</p>`,
    `<p>Recibimos tu solicitud <strong>${escapeHtml(event.title)}</strong> (ID ${escapeHtml(event.ticketId)}).</p>`,
    "<p>Te avisaremos por este medio cada vez que cambie su estado.</p>",
  ].join("");
}

function statusChangedHtml(event: StatusChangedEvent): string {
  const observation = event.observation
    ? `<p>Observación: ${escapeHtml(event.observation)}</p>`
    : "";
  return [
    `<p>La solicitud <strong>${escapeHtml(event.title)}</strong> (ID ${escapeHtml(event.ticketId)}) cambió de estado:</p>`,
    `<p>${escapeHtml(event.fromStatus)} → <strong>${escapeHtml(event.toStatus)}</strong></p>`,
    `<p>Responsable: ${escapeHtml(event.actor)}</p>`,
    observation,
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Resend-backed notifier. Best-effort by design: without RESEND_API_KEY it
 * logs and skips; a send failure never fails the originating request.
 */
export class ResendNotifier implements Notifier {
  async sendTicketCreated(event: TicketCreatedEvent): Promise<void> {
    await this.send({
      to: event.to,
      subject: `Solicitud recibida: ${event.title}`,
      html: ticketCreatedHtml(event),
    });
  }

  async sendStatusChanged(event: StatusChangedEvent): Promise<void> {
    await this.send({
      to: event.to,
      subject: `Tu solicitud ahora está: ${event.toStatus}`,
      html: statusChangedHtml(event),
    });
  }

  private async send(input: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!isMailConfigured()) {
      logger.info("mail skipped: RESEND_API_KEY not configured", {
        to: input.to,
        subject: input.subject,
      });
      return;
    }
    try {
      const resend = new Resend(getEnv().RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: getEnv().RESEND_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      if (error) {
        logger.error("mail send failed", { detail: error.message });
      }
    } catch (error) {
      logger.error("mail send threw", {
        detail: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}
