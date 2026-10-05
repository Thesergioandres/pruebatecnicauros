import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  NotFoundError,
} from "../../src/application/errors.js";
import { GetTicketHistoryUseCase } from "../../src/application/use-cases/get-ticket-history.js";
import {
  inMemoryHistoryRepo,
  inMemoryTicketRepo,
} from "./fakes.js";
import { buildHistoryEntry, buildTicket } from "./helpers.js";

const adminActor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

describe("GetTicketHistoryUseCase", () => {
  it("ADMIN ve el historial de cualquier ticket", async () => {
    const tickets = inMemoryTicketRepo();
    tickets.seed(buildTicket({ id: "t-1" }));
    const history = inMemoryHistoryRepo();
    for (let i = 0; i < 5; i += 1) {
      history.seed(
        buildHistoryEntry({
          id: `h-${i}`,
          ticketId: "t-1",
          previousStatus: i === 0 ? null : "PENDIENTE",
          newStatus: i === 0 ? "PENDIENTE" : "EN_PROGRESO",
        }),
      );
    }

    const useCase = new GetTicketHistoryUseCase({ tickets, history });
    const page = await useCase.execute({
      id: "t-1",
      page: 1,
      pageSize: 3,
      actor: adminActor,
    });

    expect(page.total).toBe(5);
    expect(page.totalPages).toBe(2);
    expect(page.items).toHaveLength(3);
  });

  it("USER sin relacion con el ticket recibe AuthorizationError", async () => {
    const tickets = inMemoryTicketRepo();
    tickets.seed(
      buildTicket({
        id: "t-1",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
        assignedTo: null,
      }),
    );
    const useCase = new GetTicketHistoryUseCase({
      tickets,
      history: inMemoryHistoryRepo(),
    });
    await expect(
      useCase.execute({
        id: "t-1",
        page: 1,
        pageSize: 10,
        actor: { id: "u-3", name: "Cara", email: "c@c", role: "USER" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("lanza NotFoundError si el ticket no existe", async () => {
    const useCase = new GetTicketHistoryUseCase({
      tickets: inMemoryTicketRepo(),
      history: inMemoryHistoryRepo(),
    });

    await expect(
      useCase.execute({
        id: "no-existe",
        page: 1,
        pageSize: 10,
        actor: adminActor,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
