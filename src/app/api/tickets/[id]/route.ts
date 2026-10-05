import { deleteTicket } from "@/server/application/deleteTicket";
import { getTicketById } from "@/server/application/getTicket";
import { jsonResponse, toErrorResponse } from "@/server/application/http";
import { toTicketDetailDto, toTicketDto } from "@/server/application/ticketDto";
import { updateTicket } from "@/server/application/updateTicket";

// Next 15+: route params are async.
// Source: https://nextjs.org/docs/app/building-your-application/routing/route-handlers#dynamic-route-segments
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;
    const { ticket, history } = await getTicketById(id);
    return jsonResponse(toTicketDetailDto(ticket, history));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const ticket = await updateTicket(id, body);
    return jsonResponse(toTicketDto(ticket));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;
    await deleteTicket(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
