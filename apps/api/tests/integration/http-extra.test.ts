import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";

import { createApp } from "../../src/infrastructure/http/app.js";
import type { AppDependencies } from "../../src/infrastructure/http/app.js";
import {
  fakeNotifier,
  fakePasswordHasher,
  fakeSessionTokenSigner,
  fixedClock,
  inMemoryHistoryRepo,
  inMemoryTicketRepo,
  inMemoryUserRepo,
} from "../application/fakes.js";
import { buildTicket } from "../application/helpers.js";
import type { Notifier, PasswordHasher, SessionTokenSigner } from "../../src/application/ports/index.js";

const ADMIN_ID = "00000000-0000-5000-a000-000000000001";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin1234";

const USER_ID = "00000000-0000-5000-a000-000000000002";
const USER_EMAIL = "user@example.com";
const USER_PASSWORD = "user1234";

const TICKET_ID = "00000000-0000-5000-b000-000000000010";
const OTHER_USER_ID = "00000000-0000-5000-a000-000000000003";

interface Harness {
  app: Express;
  notifier: Notifier & { created: unknown[]; statusChanges: unknown[] };
  signer: SessionTokenSigner;
  hasher: PasswordHasher;
  cookieName: string;
  users: ReturnType<typeof inMemoryUserRepo>;
  tickets: ReturnType<typeof inMemoryTicketRepo>;
  history: ReturnType<typeof inMemoryHistoryRepo>;
}

async function makeHarness(): Promise<Harness> {
  const users = inMemoryUserRepo();
  const tickets = inMemoryTicketRepo();
  const history = inMemoryHistoryRepo();
  const notifier = fakeNotifier();
  const signer = fakeSessionTokenSigner();
  const hasher = fakePasswordHasher();
  const cookieName = "soporte_session";

  const deps: AppDependencies = {
    tickets,
    history,
    users,
    notifier,
    hasher,
    signer,
    ids: { generate: () => `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
    clock: fixedClock("2026-09-01T10:00:00.000Z"),
    cookie: { name: cookieName, maxAgeMs: 8 * 60 * 60 * 1000, secure: false },
    corsOrigin: "http://localhost:3000",
  };
  const app = createApp(deps);

  const adminHash = await hasher.hash(ADMIN_PASSWORD);
  const userHash = await hasher.hash(USER_PASSWORD);
  users.users.push(
    { id: ADMIN_ID, name: "Ada Admin", email: ADMIN_EMAIL, passwordHash: adminHash, role: "ADMIN", createdAt: "x" },
    { id: USER_ID, name: "Ursula User", email: USER_EMAIL, passwordHash: userHash, role: "USER", createdAt: "x" },
    { id: OTHER_USER_ID, name: "Otro User", email: "otro@example.com", passwordHash: "x", role: "USER", createdAt: "x" },
  );
  tickets.store.byId.set(
    TICKET_ID,
    buildTicket({
      id: TICKET_ID,
      title: "Ticket del usuario de demo",
      description: "Descripcion valida para tests de integracion",
      requester: { id: USER_ID, name: "Ursula User", email: USER_EMAIL },
      assignedTo: null,
    }),
  );

  return { app, notifier, signer, hasher, cookieName, users, tickets, history };
}

const loginAs = async (app: Express, email: string, password: string, cookieName: string): Promise<string> => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const setCookie = res.headers["set-cookie"];
  const list: string[] = Array.isArray(setCookie) ? setCookie : setCookie === undefined ? [] : [setCookie];
  const found = list.find((c) => c.startsWith(`${cookieName}=`));
  if (found === undefined) throw new Error("no se devolvio cookie");
  return found.split(";")[0]!;
};

let h: Harness;

beforeAll(async () => {
  h = await makeHarness();
});

describe("HTTP · PATCH /api/tickets/:id", () => {
  it("USER solicitante actualiza campos editables", async () => {
    const cookie = await loginAs(h.app, USER_EMAIL, USER_PASSWORD, h.cookieName);
    const res = await request(h.app)
      .patch(`/api/tickets/${TICKET_ID}`)
      .set("Cookie", cookie)
      .send({ title: "Titulo nuevo para test", priority: "ALTA" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Titulo nuevo para test");
    expect(res.body.priority).toBe("ALTA");
  });

  it("PATCH sobre ticket RESUELTA devuelve 409 TICKET_LOCKED", async () => {
    const cookie = await loginAs(h.app, ADMIN_EMAIL, ADMIN_PASSWORD, h.cookieName);
    const lockedId = "00000000-0000-5000-b000-000000000020";
    h.tickets.store.byId.set(
      lockedId,
      buildTicket({ id: lockedId, status: "RESUELTA", resolvedAt: "2026-08-01T00:00:00.000Z" }),
    );
    const res = await request(h.app)
      .patch(`/api/tickets/${lockedId}`)
      .set("Cookie", cookie)
      .send({ title: "Titulo suficiente" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("TICKET_LOCKED");
  });

  it("PATCH con UUID invalido devuelve 422 VALIDATION_ERROR", async () => {
    const cookie = await loginAs(h.app, ADMIN_EMAIL, ADMIN_PASSWORD, h.cookieName);
    const res = await request(h.app)
      .patch("/api/tickets/no-es-uuid")
      .set("Cookie", cookie)
      .send({ title: "X" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH con body totalmente vacio devuelve 422 VALIDATION_ERROR", async () => {
    const cookie = await loginAs(h.app, ADMIN_EMAIL, ADMIN_PASSWORD, h.cookieName);
    const res = await request(h.app)
      .patch(`/api/tickets/${TICKET_ID}`)
      .set("Cookie", cookie)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("HTTP · PATCH /api/tickets/:id/status", () => {
  it("ADMIN transiciona PENDIENTE → EN_PROGRESO y se registra historial + notifier", async () => {
    h.notifier.statusChanges.length = 0;
    const cookie = await loginAs(h.app, ADMIN_EMAIL, ADMIN_PASSWORD, h.cookieName);
    const res = await request(h.app)
      .patch(`/api/tickets/${TICKET_ID}/status`)
      .set("Cookie", cookie)
      .send({ status: "EN_PROGRESO", observation: "Tomamos el ticket" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("EN_PROGRESO");
    expect(h.notifier.statusChanges.length).toBe(1);
    const last = h.notifier.statusChanges[0] as { ticket: { id: string }; previousStatus: string; observation: string | null };
    expect(last.ticket.id).toBe(TICKET_ID);
    expect(last.previousStatus).toBe("PENDIENTE");
    expect(last.observation).toBe("Tomamos el ticket");
  });

  it("CRITICA → RESUELTA sin observacion devuelve 422 OBSERVATION_REQUIRED", async () => {
    const cookie = await loginAs(h.app, ADMIN_EMAIL, ADMIN_PASSWORD, h.cookieName);
    const critId = "00000000-0000-5000-b000-000000000030";
    h.tickets.store.byId.set(
      critId,
      buildTicket({ id: critId, status: "EN_PROGRESO", priority: "CRITICA" }),
    );
    const res = await request(h.app)
      .patch(`/api/tickets/${critId}/status`)
      .set("Cookie", cookie)
      .send({ status: "RESUELTA" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("OBSERVATION_REQUIRED");
  });

  it("USER no relacionado recibe 403", async () => {
    const otrosEmail = "otro-status@example.com";
    h.users.users.push({
      id: "u-otro",
      name: "Otro",
      email: otrosEmail,
      passwordHash: await h.hasher.hash("pwd"),
      role: "USER",
      createdAt: "x",
    });
    const cookie = await loginAs(h.app, otrosEmail, "pwd", h.cookieName);
    const res = await request(h.app)
      .patch(`/api/tickets/${TICKET_ID}/status`)
      .set("Cookie", cookie)
      .send({ status: "EN_PROGRESO" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

describe("HTTP · POST /api/tickets/:id/cancel", () => {
  it("USER solicitante cancela su ticket con observacion", async () => {
    const cookie = await loginAs(h.app, USER_EMAIL, USER_PASSWORD, h.cookieName);
    const target = "00000000-0000-5000-b000-000000000040";
    h.tickets.store.byId.set(
      target,
      buildTicket({ id: target, status: "PENDIENTE", requester: { id: USER_ID, name: "Ursula User", email: USER_EMAIL } }),
    );
    const res = await request(h.app)
      .post(`/api/tickets/${target}/cancel`)
      .set("Cookie", cookie)
      .send({ observation: "Ya no aplica" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELADA");
  });

  it("cancelar ticket RESUELTA devuelve 409 INVALID_TRANSITION (terminal)", async () => {
    const cookie = await loginAs(h.app, ADMIN_EMAIL, ADMIN_PASSWORD, h.cookieName);
    const target = "00000000-0000-5000-b000-000000000041";
    h.tickets.store.byId.set(
      target,
      buildTicket({ id: target, status: "RESUELTA", resolvedAt: "x" }),
    );
    const res = await request(h.app)
      .post(`/api/tickets/${target}/cancel`)
      .set("Cookie", cookie)
      .send({ observation: "x" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });
});

describe("HTTP · GET /api/tickets/:id/history", () => {
  it("USER solicitante ve el historial paginado de su ticket", async () => {
    const cookie = await loginAs(h.app, USER_EMAIL, USER_PASSWORD, h.cookieName);
    const target = "00000000-0000-5000-b000-000000000050";
    h.tickets.store.byId.set(
      target,
      buildTicket({ id: target, requester: { id: USER_ID, name: "Ursula User", email: USER_EMAIL } }),
    );
    for (let i = 0; i < 3; i += 1) {
      h.history.entries.push({
        id: `h-${target}-${i}`,
        ticketId: target,
        previousStatus: i === 0 ? null : "PENDIENTE",
        newStatus: i === 0 ? "PENDIENTE" : "EN_PROGRESO",
        changedBy: { id: ADMIN_ID, name: "Ada Admin", email: ADMIN_EMAIL },
        observation: `evento ${i}`,
        createdAt: `2026-09-0${i + 1}T00:00:00.000Z`,
      });
    }
    const res = await request(h.app)
      .get(`/api/tickets/${target}/history`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items).toHaveLength(3);
  });

  it("USER no relacionado recibe 403", async () => {
    h.users.users.push({
      id: "u-fuera",
      name: "Fuera",
      email: "fuera@example.com",
      passwordHash: await h.hasher.hash("pwd"),
      role: "USER",
      createdAt: "x",
    });
    const cookie = await loginAs(h.app, "fuera@example.com", "pwd", h.cookieName);
    const res = await request(h.app)
      .get(`/api/tickets/${TICKET_ID}/history`)
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});

describe("HTTP · DELETE /api/tickets/:id (soft)", () => {
  it("ADMIN aplica soft delete -> 204 y deletedAt poblado", async () => {
    const cookie = await loginAs(h.app, ADMIN_EMAIL, ADMIN_PASSWORD, h.cookieName);
    const target = "00000000-0000-5000-b000-000000000060";
    h.tickets.store.byId.set(target, buildTicket({ id: target }));
    const res = await request(h.app)
      .delete(`/api/tickets/${target}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(204);
    const after = h.tickets.store.byId.get(target);
    expect(after?.deletedAt).not.toBeNull();
  });

  it("soft delete es idempotente (segunda vez -> 204)", async () => {
    const cookie = await loginAs(h.app, ADMIN_EMAIL, ADMIN_PASSWORD, h.cookieName);
    const target = "00000000-0000-5000-b000-000000000061";
    h.tickets.store.byId.set(
      target,
      buildTicket({ id: target, deletedAt: "2025-01-01T00:00:00.000Z" }),
    );
    const res = await request(h.app)
      .delete(`/api/tickets/${target}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(204);
    expect(h.tickets.store.byId.get(target)?.deletedAt).toBe("2025-01-01T00:00:00.000Z");
  });
});

describe("HTTP · GET /api/users (selector)", () => {
  it("USER autenticado recibe lista de usuarios", async () => {
    const cookie = await loginAs(h.app, USER_EMAIL, USER_PASSWORD, h.cookieName);
    const res = await request(h.app)
      .get("/api/users")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    expect(res.body[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), name: expect.any(String), email: expect.any(String) }),
    );
  });

  it("sin sesion devuelve 401 UNAUTHENTICATED", async () => {
    const res = await request(h.app).get("/api/users");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("HTTP · validacion zod en borde", () => {
  it("POST /api/tickets con body invalido devuelve 422 con details por campo", async () => {
    const cookie = await loginAs(h.app, USER_EMAIL, USER_PASSWORD, h.cookieName);
    const res = await request(h.app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({ title: "no", description: "tampoco", category: "INVALIDA", priority: "MAXIMA" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const paths = (res.body.error.details as Array<{ path: string }>).map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(["title", "description", "category", "priority"]));
  });

  it("POST /api/auth/login con payload vacio devuelve 422", async () => {
    const res = await request(h.app).post("/api/auth/login").send({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/admin/users con role invalido devuelve 422", async () => {
    const cookie = await loginAs(h.app, ADMIN_EMAIL, ADMIN_PASSWORD, h.cookieName);
    const res = await request(h.app)
      .post("/api/admin/users")
      .set("Cookie", cookie)
      .send({ name: "X", email: "x@x.com", password: "abcdefgh", role: "ROOT" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("HTTP · swagger UI", () => {
  it("GET /api/docs/ sirve HTML con titulo Swagger", async () => {
    const res = await request(h.app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Swagger/i);
  });

  it("GET /api/openapi.json incluye todas las rutas principales", async () => {
    const res = await request(h.app).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    const expected = [
      "/auth/login", "/auth/logout", "/auth/me",
      "/admin/users", "/users",
      "/tickets", "/tickets/{id}", "/tickets/{id}/status",
      "/tickets/{id}/cancel", "/tickets/{id}/history",
      "/openapi.json", "/docs",
    ];
    for (const path of expected) {
      expect(res.body.paths[path], `falta path ${path}`).toBeDefined();
    }
  });
});
