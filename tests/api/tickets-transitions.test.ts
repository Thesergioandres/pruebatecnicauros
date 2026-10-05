import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/tickets/[id]/transitions/route";
import { prisma } from "@/server/infrastructure/db";

let pendingId: string;
let criticalId: string;

async function transition(id: string, body: unknown): Promise<Response> {
  const request = new Request(
    `http://localhost:3000/api/tickets/${id}/transitions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return POST(request, { params: Promise.resolve({ id }) });
}

beforeEach(async () => {
  const pending = await prisma.ticket.create({
    data: {
      title: "Ticket pendiente",
      description: "Descripción suficientemente larga para pasar validación.",
      requester: "Luis",
      category: "Software",
      priority: "Media",
      priorityWeight: 1,
      status: "Pendiente",
    },
  });
  pendingId = pending.id;
  const critical = await prisma.ticket.create({
    data: {
      title: "Ticket crítico",
      description: "Descripción suficientemente larga para pasar validación.",
      requester: "Marta",
      requesterEmail: "marta@example.com",
      category: "Red",
      priority: "Critica",
      priorityWeight: 3,
      status: "EnProgreso",
    },
  });
  criticalId = critical.id;
});

afterEach(async () => {
  await prisma.statusHistory.deleteMany();
  await prisma.ticket.deleteMany();
  vi.restoreAllMocks();
});

describe("POST /api/tickets/:id/transitions", () => {
  it("moves Pendiente -> En progreso and records history", async () => {
    const response = await transition(pendingId, {
      to: "En progreso",
      actor: "Soporte N1",
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ticket.status).toBe("En progreso");
    expect(body.history).toMatchObject({
      fromStatus: "Pendiente",
      toStatus: "En progreso",
      actor: "Soporte N1",
    });

    const rows = await prisma.statusHistory.findMany({
      where: { ticketId: pendingId },
    });
    expect(rows).toHaveLength(1);
  });

  it("rejects an illegal jump with INVALID_TRANSITION", async () => {
    const response = await transition(pendingId, {
      to: "Resuelta",
      actor: "Soporte N1",
    });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INVALID_TRANSITION");
  });

  it("rejects resolving a critical ticket without observation", async () => {
    const response = await transition(criticalId, {
      to: "Resuelta",
      actor: "Soporte N1",
    });

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("OBSERVATION_REQUIRED");
  });

  it("resolves a critical ticket with observation and notifies", async () => {
    const { notifier } = await import("@/server/composition");
    const spy = vi.spyOn(notifier, "sendStatusChanged").mockResolvedValue();

    const response = await transition(criticalId, {
      to: "Resuelta",
      actor: "Soporte N1",
      observation: "Se reemplazó el switch dañado.",
    });

    expect(response.status).toBe(200);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]).toMatchObject({
      to: "marta@example.com",
      fromStatus: "En progreso",
      toStatus: "Resuelta",
    });
  });

  it("returns NOT_FOUND for a missing ticket", async () => {
    const response = await transition("ticket-que-no-existe", {
      to: "En progreso",
      actor: "Soporte N1",
    });

    expect(response.status).toBe(404);
  });
});
