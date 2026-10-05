import { jsonResponse, toErrorResponse } from "@/server/application/http";
import { toHistoryDto, toTicketDto } from "@/server/application/ticketDto";
import { transitionTicket } from "@/server/application/transitionTicket";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const { ticket, history } = await transitionTicket(id, body);
    return jsonResponse({ ticket: toTicketDto(ticket), history: toHistoryDto(history) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
