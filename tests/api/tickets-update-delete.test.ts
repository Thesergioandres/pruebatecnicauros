import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE, PATCH } from "@/app/api/tickets/[id]/route";
import { prisma } from "@/server/infrastructure/db";

let editableId: string;
let resolvedId: string;

function requestFor(id: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost:3000/api/tickets/${id}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(async () => {
  const editable = await prisma.ticket.create({
    data: {
      title: "Ticket editable",
      description: "Descripción suficientemente larga para pasar validación.",
      requester: "Luis",
      category: "Accesos",
      priority: "Baja",
      priorityWeight: 0,
      status: "Pendiente",
    },
  });
  editableId = editable.id;
  const resolved = await prisma.ticket.create({
    data: {
      title: "Ticket resuelto",
      description: "Descripción suficientemente larga para pasar validación.",
      requester: "Ana",
      category: "Otros",
      priority: "Baja",
      priorityWeight: 0,
      status: "Resuelta",
    },
  });
  resolvedId = resolved.id;
});

afterEach(async () => {
  await prisma.statusHistory.deleteMany();
  await prisma.ticket.deleteMany();
});

describe("PATCH /api/tickets/:id", () => {
  it("updates allowed fields", async () => {
    const response = await PATCH(
      requestFor(editableId, "PATCH", {
        title: "Ticket editable actualizado",
        priority: "Alta",
      }),
      { params: Promise.resolve({ id: editableId }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe("Ticket editable actualizado");
    expect(body.priority).toBe("Alta");
    expect(body.status).toBe("Pendiente");
  });

  it("rejects changing status through PATCH", async () => {
    const response = await PATCH(
      requestFor(editableId, "PATCH", { status: "Resuelta" }),
      { params: Promise.resolve({ id: editableId }) },
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("IMMUTABLE_FIELD");
  });

  it("rejects editing a terminal ticket", async () => {
    const response = await PATCH(
      requestFor(resolvedId, "PATCH", { title: "Intento tardío" }),
      { params: Promise.resolve({ id: resolvedId }) },
    );

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("TERMINAL_STATE");
  });

  it("rejects an empty body", async () => {
    const response = await PATCH(requestFor(editableId, "PATCH", {}), {
      params: Promise.resolve({ id: editableId }),
    });

    expect(response.status).toBe(422);
  });
});

describe("DELETE /api/tickets/:id", () => {
  it("deletes and returns 204", async () => {
    const response = await DELETE(requestFor(editableId, "DELETE"), {
      params: Promise.resolve({ id: editableId }),
    });

    expect(response.status).toBe(204);
    expect(await prisma.ticket.findUnique({ where: { id: editableId } })).toBeNull();
  });

  it("returns NOT_FOUND for a missing ticket", async () => {
    const response = await DELETE(
      requestFor("ticket-que-no-existe", "DELETE"),
      { params: Promise.resolve({ id: "ticket-que-no-existe" }) },
    );

    expect(response.status).toBe(404);
  });
});
