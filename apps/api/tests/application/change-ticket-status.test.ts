import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  NotFoundError,
} from "../../src/application/errors.js";
import {
  InvalidTransitionError,
  ObservationRequiredError,
} from "../../src/domain/index.js";
import { ChangeTicketStatusUseCase } from "../../src/application/use-cases/change-ticket-status.js";
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

describe("ChangeTicketStatusUseCase", () => {
  it("ADMIN puede cambiar el estado de cualquier ticket", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1", status: "PENDIENTE" }));

    const useCase = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("2026-04-01T10:00:00.000Z"),
    });

    const updated = await useCase.execute({
      id: "t-1",
      newStatus: "EN_PROGRESO",
      observation: null,
      actor: adminActor,
    });
    expect(updated.status).toBe("EN_PROGRESO");
  });

  it("USER solicitante puede cambiar el estado de su ticket", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        status: "PENDIENTE",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
      }),
    );

    const useCase = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("x"),
    });

    const updated = await useCase.execute({
      id: "t-1",
      newStatus: "EN_PROGRESO",
      observation: null,
      actor: { id: "u-1", name: "Ana", email: "ana@example.com", role: "USER" },
    });
    expect(updated.status).toBe("EN_PROGRESO");
  });

  it("USER asignado (no solicitante) puede cambiar el estado", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        status: "PENDIENTE",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
        assignedTo: { id: "u-2", name: "Beto", email: "beto@example.com" },
      }),
    );

    const useCase = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("x"),
    });

    const updated = await useCase.execute({
      id: "t-1",
      newStatus: "EN_PROGRESO",
      observation: null,
      actor: { id: "u-2", name: "Beto", email: "beto@example.com", role: "USER" },
    });
    expect(updated.status).toBe("EN_PROGRESO");
  });

  it("USER sin relacion con el ticket recibe AuthorizationError", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        status: "PENDIENTE",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
        assignedTo: { id: "u-2", name: "Beto", email: "beto@example.com" },
      }),
    );

    const useCase = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({
        id: "t-1",
        newStatus: "EN_PROGRESO",
        observation: null,
        actor: { id: "u-3", name: "Cara", email: "cara@example.com", role: "USER" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("establece resolvedAt cuando el destino es RESUELTA", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({ id: "t-1", status: "EN_PROGRESO", priority: "BAJA" }),
    );

    const useCase = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("2026-04-01T10:00:00.000Z"),
    });

    const updated = await useCase.execute({
      id: "t-1",
      newStatus: "RESUELTA",
      observation: null,
      actor: adminActor,
    });

    expect(updated.resolvedAt).toBe("2026-04-01T10:00:00.000Z");
  });

  it("lanza InvalidTransitionError si el destino no es alcanzable", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1", status: "PENDIENTE" }));

    const useCase = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({
        id: "t-1",
        newStatus: "RESUELTA",
        observation: null,
        actor: adminActor,
      }),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("lanza ObservationRequiredError en CRITICA -> RESUELTA sin observacion", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({ id: "t-1", status: "EN_PROGRESO", priority: "CRITICA" }),
    );

    const useCase = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({
        id: "t-1",
        newStatus: "RESUELTA",
        observation: null,
        actor: adminActor,
      }),
    ).rejects.toBeInstanceOf(ObservationRequiredError);
  });

  it("acepta CRITICA -> RESUELTA con observacion no vacia", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({ id: "t-1", status: "EN_PROGRESO", priority: "CRITICA" }),
    );

    const useCase = new ChangeTicketStatusUseCase({
      tickets: repo,
      transitions: repo,
      clock: fixedClock("x"),
    });

    const updated = await useCase.execute({
      id: "t-1",
      newStatus: "RESUELTA",
      observation: "Reinicio del servicio aplicado",
      actor: adminActor,
    });

    expect(updated.status).toBe("RESUELTA");
    expect(repo.store.history[0]?.observation).toBe(
      "Reinicio del servicio aplicado",
    );
  });

  it("lanza NotFoundError si el ticket no existe", async () => {
    const useCase = new ChangeTicketStatusUseCase({
      tickets: inMemoryTicketRepo(),
      transitions: inMemoryTicketRepo(),
      clock: fixedClock("x"),
    });

    await expect(
      useCase.execute({
        id: "no-existe",
        newStatus: "EN_PROGRESO",
        observation: null,
        actor: adminActor,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
