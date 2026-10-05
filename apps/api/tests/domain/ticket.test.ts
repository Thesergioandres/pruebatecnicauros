import { describe, expect, it } from "vitest";

import {
  buildNewTicket,
  isAssigned,
  markDeleted,
  markResolved,
  withStatus,
  type NewTicketInput,
  type Ticket,
} from "../../src/domain/index.js";

const baseInput: NewTicketInput = {
  id: "t-1",
  title: "No enciende el monitor",
  description: "El monitor del puesto 12 no enciende desde esta mañana",
  category: "HARDWARE",
  priority: "MEDIA",
  requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
  now: "2026-01-01T10:00:00.000Z",
};

describe("ticket · buildNewTicket", () => {
  it("construye un ticket en PENDIENTE con timestamps consistentes", () => {
    const ticket = buildNewTicket(baseInput);
    expect(ticket.status).toBe("PENDIENTE");
    expect(ticket.createdAt).toBe(baseInput.now);
    expect(ticket.updatedAt).toBe(baseInput.now);
    expect(ticket.resolvedAt).toBeNull();
    expect(ticket.deletedAt).toBeNull();
    expect(ticket.assignedTo).toBeNull();
  });

  it("rechaza títulos vacíos o solo espacios", () => {
    expect(() =>
      buildNewTicket({ ...baseInput, title: "   " }),
    ).toThrow(/t[ií]tulo/);
    expect(() =>
      buildNewTicket({ ...baseInput, title: "" }),
    ).toThrow(/t[ií]tulo/);
  });

  it("rechaza descripciones demasiado cortas", () => {
    expect(() =>
      buildNewTicket({ ...baseInput, description: "corta" }),
    ).toThrow(/descripci[oó]n/);
  });

  it("asigna assignedTo cuando se pasa un responsable", () => {
    const ticket = buildNewTicket({
      ...baseInput,
      assignedTo: { id: "u-2", name: "Beto", email: "beto@example.com" },
    });
    expect(ticket.assignedTo).toEqual({
      id: "u-2",
      name: "Beto",
      email: "beto@example.com",
    });
  });
});

describe("ticket · isAssigned", () => {
  const base: Ticket = buildNewTicket(baseInput);

  it("es false cuando assignedTo es null", () => {
    expect(isAssigned(base)).toBe(false);
  });

  it("es true cuando assignedTo tiene un usuario", () => {
    expect(
      isAssigned(
        buildNewTicket({
          ...baseInput,
          assignedTo: { id: "u-2", name: "Beto", email: "beto@example.com" },
        }),
      ),
    ).toBe(true);
  });
});

describe("ticket · markResolved", () => {
  it("establece resolvedAt y mantiene updatedAt en el mismo instante", () => {
    const ticket = markResolved(buildNewTicket(baseInput), "2026-01-02T12:00:00.000Z");
    expect(ticket.resolvedAt).toBe("2026-01-02T12:00:00.000Z");
    expect(ticket.updatedAt).toBe("2026-01-02T12:00:00.000Z");
  });

  it("no muta el ticket original (inmutabilidad)", () => {
    const original = buildNewTicket(baseInput);
    const updated = markResolved(original, "2026-01-02T12:00:00.000Z");
    expect(original.resolvedAt).toBeNull();
    expect(original).not.toBe(updated);
  });
});

describe("ticket · markDeleted", () => {
  it("establece deletedAt y mantiene el resto de campos", () => {
    const ticket = markDeleted(buildNewTicket(baseInput), "2026-01-03T08:00:00.000Z");
    expect(ticket.deletedAt).toBe("2026-01-03T08:00:00.000Z");
    expect(ticket.status).toBe("PENDIENTE");
  });
});

describe("ticket · withStatus", () => {
  it("devuelve un nuevo ticket con el status solicitado y updatedAt refrescado", () => {
    const ticket = buildNewTicket(baseInput);
    const updated = withStatus(ticket, "EN_PROGRESO", "2026-01-01T11:00:00.000Z");
    expect(updated.status).toBe("EN_PROGRESO");
    expect(updated.updatedAt).toBe("2026-01-01T11:00:00.000Z");
    expect(ticket.status).toBe("PENDIENTE");
  });
});
