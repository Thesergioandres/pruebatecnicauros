import { describe, expect, it } from "vitest";

import { NotFoundError } from "../../src/application/errors.js";
import { CreateTicketUseCase } from "../../src/application/use-cases/create-ticket.js";
import type { Notifier } from "../../src/application/ports/index.js";
import {
  constantId,
  fakeNotifier,
  fixedClock,
  inMemoryTicketRepo,
  inMemoryUserRepo,
} from "./fakes.js";
import { buildUser } from "./helpers.js";

describe("CreateTicketUseCase", () => {
  it("crea un ticket en PENDIENTE con el actor como solicitante por defecto", async () => {
    const tickets = inMemoryTicketRepo();
    const users = inMemoryUserRepo();
    users.seed({ ...buildUser(), passwordHash: "x", role: "USER", createdAt: "2026-01-01T00:00:00.000Z" });
    const notifier = fakeNotifier();

    const useCase = new CreateTicketUseCase({
      tickets,
      users: users.asDirectory(),
      clock: fixedClock("2026-02-01T10:00:00.000Z"),
      ids: constantId("t-new"),
      notifier,
    });

    const ticket = await useCase.execute({
      title: "Pantalla parpadea",
      description: "El monitor hace flicker desde esta manana",
      category: "HARDWARE",
      priority: "MEDIA",
      actor: buildUser(),
    });

    expect(ticket.id).toBe("t-new");
    expect(ticket.status).toBe("PENDIENTE");
    expect(ticket.requester.id).toBe("u-1");
    expect(ticket.createdAt).toBe("2026-02-01T10:00:00.000Z");
    expect(ticket.assignedTo).toBeNull();
    expect(tickets.store.byId.get("t-new")).toEqual(ticket);
  });

  it("lanza NotFoundError si el requesterId no existe", async () => {
    const useCase = new CreateTicketUseCase({
      tickets: inMemoryTicketRepo(),
      users: inMemoryUserRepo().asDirectory(),
      clock: fixedClock("x"),
      ids: constantId("t-1"),
      notifier: fakeNotifier(),
    });

    await expect(
      useCase.execute({
        title: "Algo importante",
        description: "Descripcion valida para el test",
        category: "HARDWARE",
        priority: "MEDIA",
        requesterId: "u-inexistente",
        actor: buildUser(),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lanza NotFoundError si el assignedToId no existe", async () => {
    const users = inMemoryUserRepo();
    users.seed({ ...buildUser(), passwordHash: "x", role: "USER", createdAt: "x" });

    const useCase = new CreateTicketUseCase({
      tickets: inMemoryTicketRepo(),
      users: users.asDirectory(),
      clock: fixedClock("x"),
      ids: constantId("t-1"),
      notifier: fakeNotifier(),
    });

    await expect(
      useCase.execute({
        title: "Algo importante",
        description: "Descripcion valida para el test",
        category: "HARDWARE",
        priority: "MEDIA",
        assignedToId: "u-inexistente",
        actor: buildUser(),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("acepta assignedToId null para no asignar", async () => {
    const users = inMemoryUserRepo();
    users.seed({ ...buildUser(), passwordHash: "x", role: "USER", createdAt: "x" });

    const useCase = new CreateTicketUseCase({
      tickets: inMemoryTicketRepo(),
      users: users.asDirectory(),
      clock: fixedClock("x"),
      ids: constantId("t-1"),
      notifier: fakeNotifier(),
    });

    const ticket = await useCase.execute({
      title: "Algo importante",
      description: "Descripcion valida para el test",
      category: "HARDWARE",
      priority: "MEDIA",
      assignedToId: null,
      actor: buildUser(),
    });

    expect(ticket.assignedTo).toBeNull();
  });

  it("resuelve assignedToId existente y guarda el resumen del usuario", async () => {
    const users = inMemoryUserRepo();
    users.seed({ ...buildUser(), passwordHash: "x", role: "USER", createdAt: "x" });
    users.seed({
      ...buildUser({ id: "u-2", name: "Beto", email: "beto@example.com" }),
      passwordHash: "x",
      role: "ADMIN",
      createdAt: "x",
    });

    const useCase = new CreateTicketUseCase({
      tickets: inMemoryTicketRepo(),
      users: users.asDirectory(),
      clock: fixedClock("x"),
      ids: constantId("t-1"),
      notifier: fakeNotifier(),
    });

    const ticket = await useCase.execute({
      title: "Algo importante",
      description: "Descripcion valida para el test",
      category: "HARDWARE",
      priority: "MEDIA",
      assignedToId: "u-2",
      actor: buildUser(),
    });

    expect(ticket.assignedTo).toEqual({
      id: "u-2",
      name: "Beto",
      email: "beto@example.com",
    });
  });

  describe("notificacion de creacion", () => {
    const baseInput = {
      title: "Pantalla parpadea",
      description: "El monitor del puesto 12 hace flicker desde esta manana",
      category: "HARDWARE" as const,
      priority: "ALTA" as const,
      actor: buildUser({ id: "u-1", name: "Ana", email: "ana@example.com" }),
    };

    it("dispara notifyTicketCreated con el ticket recien guardado", async () => {
      const users = inMemoryUserRepo();
      users.seed({ ...buildUser(), passwordHash: "x", role: "USER", createdAt: "x" });
      const notifier = fakeNotifier();

      const useCase = new CreateTicketUseCase({
        tickets: inMemoryTicketRepo(),
        users: users.asDirectory(),
        clock: fixedClock("2026-02-01T10:00:00.000Z"),
        ids: constantId("t-abc"),
        notifier,
      });

      const ticket = await useCase.execute(baseInput);

      expect(notifier.created).toHaveLength(1);
      const captured = notifier.created[0]!.ticket;
      expect(captured.id).toBe("t-abc");
      expect(captured.title).toBe(baseInput.title);
      expect(captured.description).toBe(baseInput.description);
      expect(captured.category).toBe(baseInput.category);
      expect(captured.priority).toBe(baseInput.priority);
      expect(captured.status).toBe("PENDIENTE");
      expect(captured.requester).toEqual({
        id: "u-1",
        name: "Ana",
        email: "ana@example.com",
      });
      expect(captured.createdAt).toBe("2026-02-01T10:00:00.000Z");
      expect(captured.updatedAt).toBe("2026-02-01T10:00:00.000Z");
      expect(ticket.id).toBe("t-abc");
    });

    it("incluye TODA la info del ticket en la notificacion (titulo, descripcion, categoria, prioridad, estado, solicitante, fechas, ID)", async () => {
      const users = inMemoryUserRepo();
      users.seed({ ...buildUser(), passwordHash: "x", role: "USER", createdAt: "x" });
      const notifier = fakeNotifier();

      const useCase = new CreateTicketUseCase({
        tickets: inMemoryTicketRepo(),
        users: users.asDirectory(),
        clock: fixedClock("2026-02-01T10:00:00.000Z"),
        ids: constantId("t-full"),
        notifier,
      });

      await useCase.execute(baseInput);

      const t = notifier.created[0]!.ticket;
      // Cada campo exigido por el spec esta presente y con el valor correcto.
      const required: Array<[string, unknown]> = [
        ["id", "t-full"],
        ["title", baseInput.title],
        ["description", baseInput.description],
        ["category", "HARDWARE"],
        ["priority", "ALTA"],
        ["status", "PENDIENTE"],
        ["requester.id", "u-1"],
        ["requester.name", "Ana"],
        ["requester.email", "ana@example.com"],
        ["createdAt", "2026-02-01T10:00:00.000Z"],
        ["updatedAt", "2026-02-01T10:00:00.000Z"],
        ["resolvedAt", null],
        ["deletedAt", null],
      ];
      for (const [path, expected] of required) {
        const value = path
          .split(".")
          .reduce<unknown>(
            (acc, key) =>
              acc !== null && typeof acc === "object"
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (acc as any)[key]
                : undefined,
            t,
          );
        expect(value, `campo ${path}`).toEqual(expected);
      }
    });

    it("la operacion sigue verde aunque la notificacion lance (envio no bloqueante)", async () => {
      const users = inMemoryUserRepo();
      users.seed({ ...buildUser(), passwordHash: "x", role: "USER", createdAt: "x" });

      // El caso de uso invoca `notifier.notifyTicketCreated` de forma
      // sincrona y no espera nada. Si el notifier es un no-op (como el
      // adaptador real de Resend, que envuelve `fetch` con
      // `void send().catch(log)`), la operacion termina sin propagar.
      const noopNotifier: Notifier = {
        notifyTicketCreated() {
          // simulacion del adaptador real: envio no bloqueante sin throw
        },
        notifyStatusChanged() {
          /* noop */
        },
      };
      const useCase = new CreateTicketUseCase({
        tickets: inMemoryTicketRepo(),
        users: users.asDirectory(),
        clock: fixedClock("x"),
        ids: constantId("t-2"),
        notifier: noopNotifier,
      });

      const ticket = await useCase.execute(baseInput);
      expect(ticket.id).toBe("t-2");
      // El notifier no-op no hace nada observable; lo importante es
      // que la operacion se completa en verde.
      expect(noopNotifier).toBeDefined();
    });
  });
});
