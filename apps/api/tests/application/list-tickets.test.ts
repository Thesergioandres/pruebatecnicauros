import { describe, expect, it } from "vitest";

import { ListTicketsUseCase } from "../../src/application/use-cases/list-tickets.js";
import { inMemoryTicketRepo } from "./fakes.js";
import { buildTicket } from "./helpers.js";

const adminActor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

describe("ListTicketsUseCase", () => {
  it("devuelve una pagina vacia cuando no hay tickets", async () => {
    const useCase = new ListTicketsUseCase(inMemoryTicketRepo());
    const page = await useCase.execute({
      query: {},
      actor: adminActor,
    });
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.totalPages).toBe(1);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(10);
  });

  it("filtra por status, priority y category", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1", status: "PENDIENTE" }));
    repo.seed(
      buildTicket({ id: "t-2", status: "EN_PROGRESO", priority: "ALTA" }),
    );
    repo.seed(
      buildTicket({
        id: "t-3",
        status: "RESUELTA",
        category: "SOFTWARE",
      }),
    );

    const useCase = new ListTicketsUseCase(repo);
    const result = await useCase.execute({
      query: { status: "EN_PROGRESO" },
      actor: adminActor,
    });
    expect(result.items.map((t) => t.id)).toEqual(["t-2"]);
  });

  it("busca en titulo y descripcion (case-insensitive)", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        title: "IMPRESORA no responde",
        description: "No imprime nada",
      }),
    );
    repo.seed(
      buildTicket({
        id: "t-2",
        title: "Otro ticket",
        description: "hablamos de la red wifi",
      }),
    );

    const useCase = new ListTicketsUseCase(repo);
    const result = await useCase.execute({
      query: { search: "IMPRESORA" },
      actor: adminActor,
    });
    expect(result.items.map((t) => t.id)).toEqual(["t-1"]);
  });

  it("ordena por sortBy + sortOrder", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1", title: "Aaa primero" }));
    repo.seed(buildTicket({ id: "t-2", title: "Bbb segundo" }));

    const useCase = new ListTicketsUseCase(repo);
    const asc = await useCase.execute({
      query: { sortBy: "title", sortOrder: "asc" },
      actor: adminActor,
    });
    expect(asc.items.map((t) => t.title)).toEqual(["Aaa primero", "Bbb segundo"]);

    const desc = await useCase.execute({
      query: { sortBy: "title", sortOrder: "desc" },
      actor: adminActor,
    });
    expect(desc.items.map((t) => t.title)).toEqual(["Bbb segundo", "Aaa primero"]);
  });

  it("pagina resultados", async () => {
    const repo = inMemoryTicketRepo();
    for (let i = 0; i < 25; i += 1) {
      repo.seed(buildTicket({ id: `t-${i.toString().padStart(2, "0")}` }));
    }
    const useCase = new ListTicketsUseCase(repo);
    const page1 = await useCase.execute({ query: { page: 1, pageSize: 10 }, actor: adminActor });
    const page3 = await useCase.execute({ query: { page: 3, pageSize: 10 }, actor: adminActor });
    expect(page1.items).toHaveLength(10);
    expect(page3.items).toHaveLength(5);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);
  });

  it("excluye soft-deleted por defecto y los incluye con includeDeleted=true", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1" }));
    repo.seed(buildTicket({ id: "t-2", deletedAt: "2026-02-01T00:00:00.000Z" }));

    const useCase = new ListTicketsUseCase(repo);
    const withoutDeleted = await useCase.execute({ query: {}, actor: adminActor });
    expect(withoutDeleted.items.map((t) => t.id)).toEqual(["t-1"]);

    const withDeleted = await useCase.execute({
      query: { includeDeleted: true },
      actor: adminActor,
    });
    expect(withDeleted.items.map((t) => t.id).sort()).toEqual(["t-1", "t-2"]);
  });

  it("USER solo ve tickets donde es solicitante o asignado", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(
      buildTicket({
        id: "t-1",
        requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
        assignedTo: null,
      }),
    );
    repo.seed(
      buildTicket({
        id: "t-2",
        requester: { id: "u-2", name: "Beto", email: "beto@example.com" },
        assignedTo: { id: "u-1", name: "Ana", email: "ana@example.com" },
      }),
    );
    repo.seed(
      buildTicket({
        id: "t-3",
        requester: { id: "u-2", name: "Beto", email: "beto@example.com" },
        assignedTo: null,
      }),
    );

    const useCase = new ListTicketsUseCase(repo);
    const anaView = await useCase.execute({
      query: {},
      actor: { id: "u-1", name: "Ana", email: "ana@example.com", role: "USER" },
    });
    expect(anaView.items.map((t) => t.id).sort()).toEqual(["t-1", "t-2"]);
    expect(anaView.total).toBe(2);

    const betoView = await useCase.execute({
      query: {},
      actor: { id: "u-2", name: "Beto", email: "beto@example.com", role: "USER" },
    });
    expect(betoView.items.map((t) => t.id).sort()).toEqual(["t-2", "t-3"]);
  });

  it("ADMIN ve todos los tickets independientemente de la relacion", async () => {
    const repo = inMemoryTicketRepo();
    repo.seed(buildTicket({ id: "t-1" }));
    repo.seed(buildTicket({ id: "t-2" }));
    const useCase = new ListTicketsUseCase(repo);
    const result = await useCase.execute({ query: {}, actor: adminActor });
    expect(result.items).toHaveLength(2);
  });
});
