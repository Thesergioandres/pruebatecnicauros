import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/tickets/[id]/route";
import { prisma } from "@/server/infrastructure/db";

let ticketId: string;

async function getDetail(id: string): Promise<Response> {
  const request = new Request(`http://localhost:3000/api/tickets/${id}`, {
    method: "GET",
  });
  return GET(request, { params: Promise.resolve({ id }) });
}

beforeEach(async () => {
  const ticket = await prisma.ticket.create({
    data: {
      title: "Teclado derrama café",
      description: "El teclado del puesto 2 quedó pegajoso tras un derrame.",
      requester: "Paula",
      category: "Hardware",
      priority: "Media",
      priorityWeight: 1,
      status: "EnProgreso",
      history: {
        create: [
          {
            fromStatus: "Pendiente",
            toStatus: "EnProgreso",
            actor: "Soporte N1",
            observation: "Se lleva equipo a mesa de trabajo.",
          },
        ],
      },
    },
  });
  ticketId = ticket.id;
});

afterEach(async () => {
  await prisma.statusHistory.deleteMany();
  await prisma.ticket.deleteMany();
});

describe("GET /api/tickets/:id", () => {
  it("returns the ticket with its history", async () => {
    const response = await getDetail(ticketId);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(ticketId);
    expect(body.status).toBe("En progreso");
    expect(body.history).toHaveLength(1);
    expect(body.history[0]).toMatchObject({
      fromStatus: "Pendiente",
      toStatus: "En progreso",
      actor: "Soporte N1",
      observation: "Se lleva equipo a mesa de trabajo.",
    });
    expect(body.history[0].createdAt).toBeDefined();
  });

  it("returns NOT_FOUND for a missing id", async () => {
    const response = await getDetail("ticket-que-no-existe");

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns VALIDATION_ERROR for a malformed id", async () => {
    const response = await getDetail("id con espacios!!");

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
