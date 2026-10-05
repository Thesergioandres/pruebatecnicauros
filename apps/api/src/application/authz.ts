import type { SessionUser, Ticket } from "@soporte/shared";

import { AuthorizationError } from "./errors.js";

/**
 * Reglas de autorizacion a nivel de aplicacion para los tickets.
 * Separadas del dominio (que solo conoce la maquina de estados) y
 * de la infraestructura (HTTP, BD).
 *
 * Politica: el cliente (`USER`) solo opera sus propios tickets, donde
 * "suyos" significa "es solicitante o asignado". El `ADMIN` puede
 * operar cualquier ticket. El borrado es exclusivo de `ADMIN`.
 */
export function assertCanView(actor: SessionUser, ticket: Ticket): void {
  if (actor.role === "ADMIN") return;
  if (isInvolved(actor, ticket)) return;
  throw new AuthorizationError("ver este ticket");
}

export function assertCanEdit(actor: SessionUser, ticket: Ticket): void {
  if (actor.role === "ADMIN") return;
  if (ticket.requester.id === actor.id) return;
  throw new AuthorizationError("editar este ticket");
}

export function assertCanTransition(
  actor: SessionUser,
  ticket: Ticket,
): void {
  if (actor.role === "ADMIN") return;
  if (isInvolved(actor, ticket)) return;
  throw new AuthorizationError("cambiar el estado de este ticket");
}

export function assertCanDelete(actor: SessionUser): void {
  if (actor.role === "ADMIN") return;
  throw new AuthorizationError("eliminar tickets");
}

const isInvolved = (actor: SessionUser, ticket: Ticket): boolean =>
  ticket.requester.id === actor.id ||
  (ticket.assignedTo !== null && ticket.assignedTo.id === actor.id);
