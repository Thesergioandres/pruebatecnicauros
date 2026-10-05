import { describe, expect, it } from "vitest";

import {
  CancelTicketUseCase,
  ChangeTicketStatusUseCase,
} from "../../src/application/use-cases/index.js";
import {
  fixedClock,
  inMemoryTicketRepo,
} from "./fakes.js";
import { buildTicket } from "./helpers.js";

const adminActor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

describe("CancelTicketUseCase", () => {
  it("cancela un ticket pendiente con observacion opcional", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1", status: "PENDIENTE" }));

    const change = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("x"),
    });
    const cancel = new CancelTicketUseCase(change);

    const updated = await cancel.execute({
      id: "t-1",
      observation: "Duplicado",
      actor: adminActor,
    });

    expect(updated.status).toBe("CANCELADA");
    expect(repo.store.history[0]?.newStatus).toBe("CANCELADA");
  });

  it("propaga NotFoundError del caso delegado", async () => {
    const repo = inMemoryTicketRepo();
    const change = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("x"),
    });
    const cancel = new CancelTicketUseCase(change);

    await expect(
      cancel.execute({
        id: "no-existe",
        observation: null,
        actor: adminActor,
      }),
    ).rejects.toThrow();
  });
});
