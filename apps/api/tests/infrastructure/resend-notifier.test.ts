import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Ticket } from "@soporte/shared";

import {
  ResendNotifier,
  buildTicketCreatedEmail,
} from "../../src/infrastructure/notifications/resend-notifier.js";
import type { NotifierLogger } from "../../src/infrastructure/notifications/resend-notifier.js";

const baseTicket: Ticket = {
  id: "t-1",
  title: "Pantalla parpadea",
  description: "El monitor del puesto 12 hace flicker desde esta manana",
  category: "HARDWARE",
  priority: "ALTA",
  status: "PENDIENTE",
  requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
  assignedTo: null,
  createdAt: "2026-02-01T10:00:00.000Z",
  updatedAt: "2026-02-01T10:00:00.000Z",
  resolvedAt: null,
  deletedAt: null,
};

const makeLogger = (): NotifierLogger & {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
} => ({
  info: vi.fn(),
  warn: vi.fn(),
});

describe("buildTicketCreatedEmail", () => {
  it("construye el payload con TODA la info del ticket", () => {
    const payload = buildTicketCreatedEmail({
      ticket: baseTicket,
      fromEmail: "soporte@tudominio.com",
      to: "serguito2003@gmail.com",
    });

    expect(payload.from).toBe("soporte@tudominio.com");
    expect(payload.to).toBe("serguito2003@gmail.com");
    expect(payload.subject).toBe("[Nuevo ticket t-1] Pantalla parpadea");
    const required = [
      "ID",
      "Titulo",
      "Descripcion",
      "Categoria",
      "Prioridad",
      "Estado",
      "Solicitante",
      "Creado",
      "Actualizado",
    ];
    for (const label of required) {
      expect(payload.text, `falta ${label} en texto`).toContain(label);
      expect(payload.html, `falta ${label} en html`).toContain(label);
    }
    expect(payload.text).toContain("PENDIENTE");
    expect(payload.text).toContain("ALTA");
    expect(payload.text).toContain("HARDWARE");
    expect(payload.text).toContain("ana@example.com");
  });

  it("escapa HTML para evitar inyeccion en campos libres", () => {
    const ticket: Ticket = {
      ...baseTicket,
      title: "<script>alert(1)</script>",
      description: 'Comilla doble " y <b>tag</b>',
    };
    const payload = buildTicketCreatedEmail({
      ticket,
      fromEmail: "a@b",
      to: "c@d",
    });
    expect(payload.html).not.toContain("<script>");
    expect(payload.html).toContain("&lt;script&gt;");
    expect(payload.html).toContain("&lt;b&gt;tag&lt;/b&gt;");
  });
});

describe("ResendNotifier", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTea al endpoint de Resend con Bearer, destino y payload correcto", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "email-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const logger = makeLogger();
    const notifier = new ResendNotifier({
      apiKey: "re_test_key",
      fromEmail: "soporte@tudominio.com",
      notifyNewTicketTo: "serguito2003@gmail.com",
      logger,
    });

    notifier.notifyTicketCreated(baseTicket);
    await new Promise((resolve) => setImmediate(resolve));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    const requestInit = init as RequestInit;
    expect(requestInit.method).toBe("POST");
    const headers = requestInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer re_test_key");
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(requestInit.body as string);
    expect(body.from).toBe("soporte@tudominio.com");
    expect(body.to).toEqual(["serguito2003@gmail.com"]);
    expect(body.subject).toBe("[Nuevo ticket t-1] Pantalla parpadea");
    expect(body.text).toContain("PENDIENTE");
    expect(body.html.length).toBeGreaterThan(0);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("loguea info con el id de Resend cuando el envio tiene exito", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "9f1b1a1a-uuid-resend" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const logger = makeLogger();
    const notifier = new ResendNotifier({
      apiKey: "re_test_key",
      fromEmail: "soporte@tudominio.com",
      notifyNewTicketTo: "serguito2003@gmail.com",
      logger,
    });

    notifier.notifyTicketCreated(baseTicket);
    await new Promise((resolve) => setImmediate(resolve));

    expect(logger.info).toHaveBeenCalledTimes(1);
    const [payload, message] = logger.info.mock.calls[0]!;
    expect(message).toContain("Email");
    expect(message).toContain("notificacion");
    expect(payload).toMatchObject({
      resendId: "9f1b1a1a-uuid-resend",
      ticketId: "t-1",
      event: "TICKET_CREATED",
      to: "serguito2003@gmail.com",
      subject: "[Nuevo ticket t-1] Pantalla parpadea",
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("no loguea info si Resend responde 200 sin id en el body", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    const logger = makeLogger();
    const notifier = new ResendNotifier({
      apiKey: "re_test_key",
      fromEmail: "a@b",
      notifyNewTicketTo: "c@d",
      logger,
    });
    notifier.notifyTicketCreated(baseTicket);
    await new Promise((resolve) => setImmediate(resolve));
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("loguea un warning y la operacion sigue verde cuando Resend falla", async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response("internal error", { status: 500, statusText: "Internal" }),
    );
    const logger = makeLogger();
    const notifier = new ResendNotifier({
      apiKey: "re_key",
      fromEmail: "a@b",
      notifyNewTicketTo: "c@d",
      logger,
    });

    expect(() => notifier.notifyTicketCreated(baseTicket)).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(logger.warn).toHaveBeenCalled();
    const call = logger.warn.mock.calls[0]!;
    expect(call[1]).toContain("creacion");
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("si RESEND_API_KEY esta vacia, el notifier hace no-op y avisa una sola vez al instanciar", () => {
    const logger = makeLogger();
    const notifier = new ResendNotifier({
      apiKey: "",
      fromEmail: "a@b",
      notifyNewTicketTo: "c@d",
      logger,
    });
    notifier.notifyTicketCreated(baseTicket);
    notifier.notifyTicketCreated(baseTicket);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.info).not.toHaveBeenCalled();
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
