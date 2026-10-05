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
import type {
  Notifier,
  PasswordHasher,
  SessionTokenSigner,
} from "../../src/application/ports/index.js";

/**
 * Integration tests: arman la app HTTP completa con adaptadores fake
 * y la golpean con supertest. Verifican la forma unica de respuesta
 * de error, el ciclo de auth, la autorizacion por actor y el
 * disparador de la notificacion de creacion.
 */

const ADMIN_ID = "00000000-0000-5000-a000-000000000001";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin1234";

const USER_ID = "00000000-0000-5000-a000-000000000002";
const USER_EMAIL = "user@example.com";
const USER_PASSWORD = "user1234";

interface Harness {
  app: Express;
  notifier: Notifier & { created: unknown[] };
  users: ReturnType<typeof inMemoryUserRepo>;
  tickets: ReturnType<typeof inMemoryTicketRepo>;
  history: ReturnType<typeof inMemoryHistoryRepo>;
  signer: SessionTokenSigner;
  hasher: PasswordHasher;
  cookieName: string;
  seed: () => Promise<void>;
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
    cookie: {
      name: cookieName,
      maxAgeMs: 8 * 60 * 60 * 1000,
      secure: false,
    },
    corsOrigin: "http://localhost:3000",
  };

  const app = createApp(deps);

  return {
    app,
    notifier,
    users,
    tickets,
    history,
    signer,
    hasher,
    cookieName,
    seed: async () => {
      const adminHash = await hasher.hash(ADMIN_PASSWORD);
      const userHash = await hasher.hash(USER_PASSWORD);
      users.users.push({
        id: ADMIN_ID,
        name: "Ada Admin",
        email: ADMIN_EMAIL,
        passwordHash: adminHash,
        role: "ADMIN",
        createdAt: "x",
      });
      users.users.push({
        id: USER_ID,
        name: "Ursula User",
        email: USER_EMAIL,
        passwordHash: userHash,
        role: "USER",
        createdAt: "x",
      });
      // Sembrar un ticket donde el user es solicitante.
      const seed = buildTicket({
        id: "00000000-0000-5000-b000-000000000001",
        title: "Ticket del usuario de demo",
        requester: { id: USER_ID, name: "Ursula User", email: USER_EMAIL },
        assignedTo: null,
      });
      tickets.store.byId.set(seed.id, seed);
    },
  };
}

const extractCookie = (res: request.Response, name: string): string => {
  const raw = res.headers["set-cookie"];
  const list: string[] = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  const found = list.find((c) => c.startsWith(`${name}=`));
  if (found === undefined) throw new Error(`cookie ${name} no presente`);
  return found.split(";")[0]!;
};

let harness: Harness;

beforeAll(async () => {
  harness = await makeHarness();
  await harness.seed();
});

describe("HTTP · auth", () => {
  it("rechaza login con cuerpo invalido con 422 VALIDATION_ERROR", async () => {
    const res = await request(harness.app)
      .post("/api/auth/login")
      .send({ email: "no-es-email", password: "" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it("rechaza login con credenciales invalidas con 401 INVALID_CREDENTIALS", async () => {
    const res = await request(harness.app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("emite cookie httpOnly en login correcto", async () => {
    const res = await request(harness.app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(res.status).toBe(204);
    const setCookie = res.headers["set-cookie"];
    const list: string[] = Array.isArray(setCookie)
      ? setCookie
      : setCookie === undefined
        ? []
        : [setCookie];
    expect(list.length).toBeGreaterThan(0);
    const cookie = list.find((c) => c.startsWith(`${harness.cookieName}=`));
    expect(cookie).toBeDefined();
    expect(cookie!.toLowerCase()).toContain("httponly");
    expect(cookie!.toLowerCase()).toContain("samesite=lax");
  });

  it("GET /api/auth/me devuelve el usuario autenticado con role ADMIN", async () => {
    const login = await request(harness.app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const cookie = extractCookie(login, harness.cookieName);
    const res = await request(harness.app)
      .get("/api/auth/me")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: ADMIN_ID,
      name: "Ada Admin",
      email: ADMIN_EMAIL,
      role: "ADMIN",
    });
    expect(res.body).not.toHaveProperty("passwordHash");
  });

  it("GET /api/auth/me devuelve role USER para un cliente", async () => {
    const login = await request(harness.app)
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: USER_PASSWORD });
    const cookie = extractCookie(login, harness.cookieName);
    const res = await request(harness.app)
      .get("/api/auth/me")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: USER_ID,
      name: "Ursula User",
      email: USER_EMAIL,
      role: "USER",
    });
  });

  it("GET /api/auth/me sin cookie responde 401 UNAUTHENTICATED", async () => {
    const res = await request(harness.app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("POST /api/auth/logout borra la cookie", async () => {
    const login = await request(harness.app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const cookie = extractCookie(login, harness.cookieName);
    const logout = await request(harness.app)
      .post("/api/auth/logout")
      .set("Cookie", cookie);
    expect(logout.status).toBe(204);
    const setCookie = logout.headers["set-cookie"];
    const list: string[] = Array.isArray(setCookie)
      ? setCookie
      : setCookie === undefined
        ? []
        : [setCookie];
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toMatch(new RegExp(`${harness.cookieName}=;|`));
  });
});

describe("HTTP · admin", () => {
  const loginAs = async (email: string, password: string): Promise<string> => {
    const res = await request(harness.app)
      .post("/api/auth/login")
      .send({ email, password });
    return extractCookie(res, harness.cookieName);
  };

  it("POST /api/admin/users responde 403 para USER", async () => {
    const cookie = await loginAs(USER_EMAIL, USER_PASSWORD);
    const res = await request(harness.app)
      .post("/api/admin/users")
      .set("Cookie", cookie)
      .send({ name: "X", email: "x@example.com", password: "abcdefgh", role: "USER" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("POST /api/admin/users ADMIN crea usuario y devuelve 201", async () => {
    const cookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(harness.app)
      .post("/api/admin/users")
      .set("Cookie", cookie)
      .send({
        name: "Nuevo Usuario",
        email: "nuevo@example.com",
        password: "pwd-seguro",
        role: "USER",
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Nuevo Usuario",
      email: "nuevo@example.com",
    });
  });

  it("POST /api/admin/users con email duplicado responde 409 EMAIL_ALREADY_REGISTERED", async () => {
    const cookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(harness.app)
      .post("/api/admin/users")
      .set("Cookie", cookie)
      .send({
        name: "Duplicado",
        email: ADMIN_EMAIL,
        password: "pwd-seguro",
        role: "USER",
      });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });

  it("GET /api/admin/users lista usuarios (solo ADMIN)", async () => {
    const cookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(harness.app)
      .get("/api/admin/users")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

describe("HTTP · tickets y authz", () => {
  const loginAs = async (email: string, password: string): Promise<string> => {
    const res = await request(harness.app)
      .post("/api/auth/login")
      .send({ email, password });
    return extractCookie(res, harness.cookieName);
  };

  it("USER solo ve sus propios tickets en GET /api/tickets", async () => {
    const cookie = await loginAs(USER_EMAIL, USER_PASSWORD);
    const res = await request(harness.app)
      .get("/api/tickets")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    const ids = res.body.items.map((t: { id: string }) => t.id);
    expect(ids).toContain("00000000-0000-5000-b000-000000000001");
  });

  it("USER no puede ver un ticket que no es suyo -> 403", async () => {
    const cookie = await loginAs(USER_EMAIL, USER_PASSWORD);
    const otherTicket = buildTicket({
      id: "00000000-0000-5000-b000-000000000099",
    });
    harness.tickets.store.byId.set("00000000-0000-5000-b000-000000000099", otherTicket);
    const res = await request(harness.app)
      .get("/api/tickets/00000000-0000-5000-b000-000000000099")
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("ADMIN ve cualquier ticket -> 200", async () => {
    const cookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(harness.app)
      .get("/api/tickets/00000000-0000-5000-b000-000000000001")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  it("POST /api/tickets ADMIN crea ticket + dispara notificacion", async () => {
    const cookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(harness.app)
      .post("/api/tickets")
      .set("Cookie", cookie)
      .send({
        title: "Nuevo ticket admin",
        description: "Descripcion valida para el test de integracion",
        category: "HARDWARE",
        priority: "MEDIA",
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDIENTE");
    // El notifier fake recibio la notificacion.
    expect(harness.notifier.created.length).toBeGreaterThanOrEqual(1);
    const last = harness.notifier.created[harness.notifier.created.length - 1] as {
      ticket: { id: string; title: string; description: string; category: string; priority: string; status: string };
    };
    expect(last.ticket.title).toBe("Nuevo ticket admin");
    expect(last.ticket.description).toContain("valida para el test");
    expect(last.ticket.category).toBe("HARDWARE");
    expect(last.ticket.priority).toBe("MEDIA");
    expect(last.ticket.status).toBe("PENDIENTE");
  });

  it("PATCH /api/tickets/:id valida transicion via ticket policy", async () => {
    const cookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(harness.app)
      .patch("/api/tickets/00000000-0000-5000-b000-000000000001/status")
      .set("Cookie", cookie)
      .send({ status: "RESUELTA" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_TRANSITION");
  });

  it("DELETE /api/tickets/:id requiere ADMIN (USER -> 403)", async () => {
    const cookie = await loginAs(USER_EMAIL, USER_PASSWORD);
    const res = await request(harness.app)
      .delete("/api/tickets/00000000-0000-5000-b000-000000000001")
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("GET /api/tickets sin cookie -> 401 UNAUTHENTICATED", async () => {
    const res = await request(harness.app).get("/api/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("HTTP · docs y openapi", () => {
  it("GET /api/openapi.json devuelve el contrato", async () => {
    const res = await request(harness.app).get("/api/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.paths["/auth/login"]).toBeDefined();
    expect(res.body.paths["/admin/users"]).toBeDefined();
    expect(res.body.paths["/tickets"]).toBeDefined();
  });

  it("GET /api/docs sirve HTML de Swagger UI", async () => {
    const res = await request(harness.app).get("/api/docs/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});
