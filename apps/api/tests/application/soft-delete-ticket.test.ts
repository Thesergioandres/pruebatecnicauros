import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  NotFoundError,
} from "../../src/application/errors.js";
import { SoftDeleteTicketUseCase } from "../../src/application/use-cases/soft-delete-ticket.js";
import { fixedClock, inMemoryTicketRepo } from "./fakes.js";
import { buildTicket } from "./helpers.js";

describe("SoftDeleteTicketUseCase", () => {
  it("marca deletedAt cuando el actor es ADMIN", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1" }));

    const useCase = new SoftDeleteTicketUseCase({
      tickets: repo,
      clock: fixedClock("2026-05-01T00:00:00.000Z"),
    });

    await useCase.execute({
      id: "t-1",
      actor: { id: "admin", name: "Admin", email: "a@a", role: "ADMIN" },
    });

    const after = repo.store.byId.get("t-1");
    expect(after?.deletedAt).toBe("2026-05-01T00:00:00.000Z");
  });

  it("lanza AuthorizationError cuando el rol no es ADMIN", async () => {
    const useCase = new SoftDeleteTicketUseCase({
      tickets: inMemoryTicketRepo(),
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({
        id: "t-1",
        actor: { id: "u", name: "U", email: "u@u", role: "USER" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("lanza NotFoundError si el ticket no existe", async () => {
    const useCase = new SoftDeleteTicketUseCase({
      tickets: inMemoryTicketRepo(),
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({
        id: "no-existe",
        actor: { id: "admin", name: "Admin", email: "a@a", role: "ADMIN" },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("es idempotente: un ticket ya borrado no falla", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({ id: "t-1", deletedAt: "2025-01-01T00:00:00.000Z" }),
    );

    const useCase = new SoftDeleteTicketUseCase({
      tickets: repo,
      clock: fixedClock("2026-05-01T00:00:00.000Z"),
    });

    await expect(
      useCase.execute({
        id: "t-1",
        actor: { id: "admin", name: "Admin", email: "a@a", role: "ADMIN" },
      }),
    ).resolves.toBeUndefined();
    expect(repo.store.byId.get("t-1")?.deletedAt).toBe(
      "2025-01-01T00:00:00.000Z",
    );
  });
});
