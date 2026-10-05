import { createTicket } from "@/server/application/createTicket";
import { jsonResponse, toErrorResponse } from "@/server/application/http";
import type { Ticket } from "@/server/domain/ticket";

// Source: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
export async function POST(request: Request): Promise<Response> {
  try {
    const body: unknown = await request.json();
    const ticket = await createTicket(body);
    return jsonResponse(toTicketDto(ticket), 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}

function toTicketDto(ticket: Ticket) {
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
