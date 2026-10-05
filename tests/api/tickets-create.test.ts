import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/tickets/route";
import { prisma } from "@/server/infrastructure/db";

const validPayload = {
  title: "El monitor parpadea sin parar",
  description:
    "Desde ayer el monitor del puesto 4 parpadea cada pocos segundos y no deja trabajar.",
  requester: "Jorge Andrade",
  category: "Hardware",
  priority: "Media",
};

async function postJson(body: unknown): Promise<Response> {
  const request = new Request("http://localhost:3000/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

afterEach(async () => {
  await prisma.statusHistory.deleteMany();
  await prisma.ticket.deleteMany();
  vi.restoreAllMocks();
});

describe("POST /api/tickets", () => {
  it("creates a ticket with status Pendiente", async () => {
    const response = await postJson(validPayload);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe(validPayload.title);
    expect(body.status).toBe("Pendiente");
    expect(body.category).toBe("Hardware");
    expect(body.priority).toBe("Media");
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it("rejects missing title with VALIDATION_ERROR", async () => {
    const response = await postJson({ ...validPayload, title: undefined });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown category with VALIDATION_ERROR", async () => {
    const response = await postJson({ ...validPayload, category: "Café" });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a title that is too short", async () => {
    const response = await postJson({ ...validPayload, title: "abc" });

    expect(response.status).toBe(422);
  });

  it("rejects an invalid requesterEmail", async () => {
    const response = await postJson({
      ...validPayload,
      requesterEmail: "no-es-email",
    });

    expect(response.status).toBe(422);
  });

  it("ignores a client-sent status and always starts as Pendiente", async () => {
    const response = await postJson({
      ...validPayload,
      status: "Resuelta",
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.status).toBe("Pendiente");
  });

  it("notifies by email when requesterEmail is present", async () => {
    const { notifier } = await import("@/server/composition");
    const spy = vi.spyOn(notifier, "sendTicketCreated").mockResolvedValue();

    const response = await postJson({
      ...validPayload,
      requesterEmail: "jorge@example.com",
    });

    expect(response.status).toBe(201);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]).toMatchObject({
      to: "jorge@example.com",
    });
  });

  it("does not notify when requesterEmail is absent", async () => {
    const { notifier } = await import("@/server/composition");
    const spy = vi.spyOn(notifier, "sendTicketCreated").mockResolvedValue();

    const response = await postJson(validPayload);

    expect(response.status).toBe(201);
    expect(spy).not.toHaveBeenCalled();
  });
});
