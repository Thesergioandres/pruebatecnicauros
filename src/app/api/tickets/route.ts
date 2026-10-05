import { createTicket } from "@/server/application/createTicket";
import { jsonResponse, toErrorResponse } from "@/server/application/http";
import { listTickets } from "@/server/application/listTickets";
import { toTicketDto } from "@/server/application/ticketDto";

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

export async function GET(request: Request): Promise<Response> {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const page = await listTickets(params);
    return jsonResponse({
      ...page,
      data: page.data.map(toTicketDto),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
