import type { HistoryEntry, Ticket } from "../domain/ticket";

export function toTicketDto(ticket: Ticket) {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    requester: ticket.requester,
    requesterEmail: ticket.requesterEmail,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export function toHistoryDto(entry: HistoryEntry) {
  return {
    id: entry.id,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    actor: entry.actor,
    observation: entry.observation,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function toTicketDetailDto(
  ticket: Ticket,
  history: HistoryEntry[],
) {
  return {
    ...toTicketDto(ticket),
    history: history.map(toHistoryDto),
  };
}
