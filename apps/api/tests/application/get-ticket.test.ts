import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  NotFoundError,
} from "../../src/application/errors.js";
import { GetTicketUseCase } from "../../src/application/use-cases/get-ticket.js";
import { inMemoryTicketRepo } from "./fakes.js";
import { buildTicket } from "./helpers.js";

const adminActor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

describe("GetTicketUseCase", () => {
  it("ADMIN puede ver cualquier ticket", async () => {
    const repo = inMemoryTicketRepo();
    const seed = buildTicket({ id: "t-1" });
    repo.seed(seed);

    const useCase = new GetTicketUseCase(repo);
    const found = await useCase.execute({ id: seed.id, actor: adminActor });

    expect(found).toEqual(seed);
  });

  it("USER (solicitante) puede ver su propio ticket", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
      }),
    );

    const useCase = new GetTicketUseCase(repo);
    const found = await useCase.execute({
      id: "t-1",
      actor: { id: "u-1", name: "Ana", email: "ana@example.com", role: "USER" },
    });
    expect(found.id).toBe("t-1");
  });

  it("USER (asignado) puede ver el ticket donde esta asignado", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
        assignedTo: { id: "u-2", name: "Beto", email: "beto@example.com" },
      }),
    );

    const useCase = new GetTicketUseCase(repo);
    const found = await useCase.execute({
      id: "t-1",
      actor: { id: "u-2", name: "Beto", email: "beto@example.com", role: "USER" },
    });
    expect(found.id).toBe("t-1");
  });

  it("USER sin relacion con el ticket recibe AuthorizationError", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
        assignedTo: { id: "u-2", name: "Beto", email: "beto@example.com" },
      }),
    );

    const useCase = new GetTicketUseCase(repo);
    await expect(
      useCase.execute({
        id: "t-1",
        actor: { id: "u-3", name: "Cara", email: "cara@example.com", role: "USER" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("lanza NotFoundError cuando el ticket no existe", async () => {
    const useCase = new GetTicketUseCase(inMemoryTicketRepo());

    await expect(
      useCase.execute({ id: "no-existe", actor: adminActor }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lanza NotFoundError cuando el id esta vacio", async () => {
    const useCase = new GetTicketUseCase(inMemoryTicketRepo());

    await expect(
      useCase.execute({ id: "", actor: adminActor }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
