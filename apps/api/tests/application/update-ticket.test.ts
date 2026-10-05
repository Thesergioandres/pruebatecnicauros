import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  NotFoundError,
} from "../../src/application/errors.js";
import { TicketLockedError } from "../../src/domain/index.js";
import { UpdateTicketUseCase } from "../../src/application/use-cases/update-ticket.js";
import {
  fixedClock,
  inMemoryTicketRepo,
  inMemoryUserRepo,
} from "./fakes.js";
import { buildTicket, buildUser } from "./helpers.js";

const adminActor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const anaActor = {
  id: "u-1",
  name: "Ana",
  email: "ana@example.com",
  role: "USER" as const,
};

describe("UpdateTicketUseCase", () => {
  it("ADMIN puede editar cualquier ticket editable", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1" }));

    const useCase = new UpdateTicketUseCase({
      tickets: repo,
      users: inMemoryUserRepo().asDirectory(),
      clock: fixedClock("2026-03-01T00:00:00.000Z"),
    });

    const updated = await useCase.execute({
      id: "t-1",
      changes: { title: "Titulo nuevo", priority: "ALTA" },
      actor: adminActor,
    });

    expect(updated.title).toBe("Titulo nuevo");
    expect(updated.priority).toBe("ALTA");
  });

  it("USER solicitante puede editar su propio ticket", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
      }),
    );
    const users = inMemoryUserRepo();
    users.seed({ ...buildUser({ id: "u-2" }), passwordHash: "x", role: "USER", createdAt: "x" });

    const useCase = new UpdateTicketUseCase({
      tickets: repo,
      users: users.asDirectory(),
      clock: fixedClock("2026-03-01T00:00:00.000Z"),
    });

    const updated = await useCase.execute({
      id: "t-1",
      changes: { title: "Titulo nuevo" },
      actor: anaActor,
    });
    expect(updated.title).toBe("Titulo nuevo");
  });

  it("USER asignado (pero no solicitante) NO puede editar", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
        assignedTo: { id: "u-2", name: "Beto", email: "beto@example.com" },
      }),
    );

    const useCase = new UpdateTicketUseCase({
      tickets: repo,
      users: inMemoryUserRepo().asDirectory(),
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({
        id: "t-1",
        changes: { title: "X" },
        actor: { id: "u-2", name: "Beto", email: "beto@example.com", role: "USER" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("lanza NotFoundError si el ticket no existe", async () => {
    const useCase = new UpdateTicketUseCase({
      tickets: inMemoryTicketRepo(),
      users: inMemoryUserRepo().asDirectory(),
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({ id: "no-existe", changes: { title: "X" }, actor: adminActor }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lanza TicketLockedError si el ticket esta RESUELTA", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1", status: "RESUELTA" }));

    const useCase = new UpdateTicketUseCase({
      tickets: repo,
      users: inMemoryUserRepo().asDirectory(),
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({ id: "t-1", changes: { title: "X" }, actor: adminActor }),
    ).rejects.toBeInstanceOf(TicketLockedError);
  });

  it("lanza TicketLockedError si el ticket esta CANCELADA", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1", status: "CANCELADA" }));

    const useCase = new UpdateTicketUseCase({
      tickets: repo,
      users: inMemoryUserRepo().asDirectory(),
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({ id: "t-1", changes: { title: "X" }, actor: adminActor }),
    ).rejects.toBeInstanceOf(TicketLockedError);
  });

  it("permite desasignar con assignedToId null", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        assignedTo: { id: "u-2", name: "Beto", email: "beto@example.com" },
      }),
    );

    const useCase = new UpdateTicketUseCase({
      tickets: repo,
      users: inMemoryUserRepo().asDirectory(),
      clock: fixedClock("x"),
    });

    const updated = await useCase.execute({
      id: "t-1",
      changes: { assignedToId: null },
      actor: adminActor,
    });
    expect(updated.assignedTo).toBeNull();
  });

  it("lanza NotFoundError si el nuevo asignado no existe", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1" }));

    const useCase = new UpdateTicketUseCase({
      tickets: repo,
      users: inMemoryUserRepo().asDirectory(),
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({
        id: "t-1",
        changes: { assignedToId: "u-inexistente" },
        actor: adminActor,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("devuelve el ticket sin tocarlo si el parche esta vacio", async () => {
    const repo = inMemoryTicketRepo();
    const original = buildTicket({ id: "t-1" });
    repo.seed(original);

    const useCase = new UpdateTicketUseCase({
      tickets: repo,
      users: inMemoryUserRepo().asDirectory(),
      clock: fixedClock("2099-01-01T00:00:00.000Z"),
    });

    const result = await useCase.execute({
      id: "t-1",
      changes: {},
      actor: adminActor,
    });
    expect(result).toEqual(original);
    expect(result.updatedAt).toBe(original.updatedAt);
  });
});
