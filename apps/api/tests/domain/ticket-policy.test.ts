import { describe, expect, it } from "vitest";

import {
  InvalidTransitionError,
  ObservationRequiredError,
  TicketLockedError,
  assertEditable,
  assertTransition,
  canTransition as canTransitionPolicy,
  isClosed,
  isOpen,
  requiresObservationFor,
} from "../../src/domain/index.js";

const ALL_STATUSES = [
  "PENDIENTE",
  "EN_PROGRESO",
  "RESUELTA",
  "CANCELADA",
] as const;

describe("ticket-policy · canTransition (matriz completa)", () => {
  it("permite PENDIENTE → EN_PROGRESO", () => {
    expect(canTransitionPolicy("PENDIENTE", "EN_PROGRESO")).toBe(true);
  });

  it("permite PENDIENTE → CANCELADA", () => {
    expect(canTransitionPolicy("PENDIENTE", "CANCELADA")).toBe(true);
  });

  it("permite EN_PROGRESO → PENDIENTE (retroceso por triage erróneo)", () => {
    expect(canTransitionPolicy("EN_PROGRESO", "PENDIENTE")).toBe(true);
  });

  it("permite EN_PROGRESO → RESUELTA", () => {
    expect(canTransitionPolicy("EN_PROGRESO", "RESUELTA")).toBe(true);
  });

  it("permite EN_PROGRESO → CANCELADA", () => {
    expect(canTransitionPolicy("EN_PROGRESO", "CANCELADA")).toBe(true);
  });

  it("rechaza PENDIENTE → RESUELTA (salto no permitido)", () => {
    expect(canTransitionPolicy("PENDIENTE", "RESUELTA")).toBe(false);
  });

  it("rechaza PENDIENTE → PENDIENTE (mismo estado genera ruido en historial)", () => {
    expect(canTransitionPolicy("PENDIENTE", "PENDIENTE")).toBe(false);
  });

  it("rechaza EN_PROGRESO → EN_PROGRESO (mismo estado)", () => {
    expect(canTransitionPolicy("EN_PROGRESO", "EN_PROGRESO")).toBe(false);
  });

  it("rechaza RESUELTA → PENDIENTE (estado terminal)", () => {
    expect(canTransitionPolicy("RESUELTA", "PENDIENTE")).toBe(false);
  });

  it("rechaza RESUELTA → EN_PROGRESO (estado terminal)", () => {
    expect(canTransitionPolicy("RESUELTA", "EN_PROGRESO")).toBe(false);
  });

  it("rechaza RESUELTA → CANCELADA (estado terminal)", () => {
    expect(canTransitionPolicy("RESUELTA", "CANCELADA")).toBe(false);
  });

  it("rechaza CANCELADA → PENDIENTE (estado terminal)", () => {
    expect(canTransitionPolicy("CANCELADA", "PENDIENTE")).toBe(false);
  });

  it("rechaza CANCELADA → EN_PROGRESO (estado terminal)", () => {
    expect(canTransitionPolicy("CANCELADA", "EN_PROGRESO")).toBe(false);
  });

  it("rechaza CANCELADA → RESUELTA (estado terminal)", () => {
    expect(canTransitionPolicy("CANCELADA", "RESUELTA")).toBe(false);
  });

  it("rechaza transiciones invertidas (PENDIENTE ← no es input válido, pero se valida)", () => {
    expect(canTransitionPolicy("RESUELTA", "PENDIENTE")).toBe(false);
  });

  it("cubre las 16 combinaciones de la matriz 4x4 sin estados terminales (incluye diagonales)", () => {
    // Cobertura exhaustiva: cada par (from, to) se evalúa.
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        // La función pura no debe lanzar nunca; solo devolver booleano.
        expect(typeof canTransitionPolicy(from, to)).toBe("boolean");
      }
    }
  });
});

describe("ticket-policy · requiresObservationFor", () => {
  it("exige observación cuando CRITICA → RESUELTA", () => {
    expect(requiresObservationFor("EN_PROGRESO", "RESUELTA", "CRITICA")).toBe(true);
  });

  it("no exige observación cuando BAJA → RESUELTA", () => {
    expect(requiresObservationFor("EN_PROGRESO", "RESUELTA", "BAJA")).toBe(false);
  });

  it("no exige observación cuando MEDIA → RESUELTA", () => {
    expect(requiresObservationFor("EN_PROGRESO", "RESUELTA", "MEDIA")).toBe(false);
  });

  it("no exige observación cuando ALTA → RESUELTA", () => {
    expect(requiresObservationFor("EN_PROGRESO", "RESUELTA", "ALTA")).toBe(false);
  });

  it("no exige observación para CRITICA en transiciones distintas a RESUELTA", () => {
    expect(requiresObservationFor("PENDIENTE", "EN_PROGRESO", "CRITICA")).toBe(false);
    expect(requiresObservationFor("PENDIENTE", "CANCELADA", "CRITICA")).toBe(false);
    expect(requiresObservationFor("EN_PROGRESO", "CANCELADA", "CRITICA")).toBe(false);
  });
});

describe("ticket-policy · assertTransition", () => {
  it("no lanza cuando la transición es válida y no requiere observación", () => {
    expect(() =>
      assertTransition("PENDIENTE", "EN_PROGRESO", { priority: "MEDIA" }),
    ).not.toThrow();
  });

  it("lanza InvalidTransitionError con from/to y code INVALID_TRANSITION", () => {
    expect(() =>
      assertTransition("PENDIENTE", "RESUELTA", { priority: "MEDIA" }),
    ).toThrow(InvalidTransitionError);
    try {
      assertTransition("PENDIENTE", "RESUELTA", { priority: "MEDIA" });
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as InvalidTransitionError).code).toBe("INVALID_TRANSITION");
      expect((error as InvalidTransitionError).from).toBe("PENDIENTE");
      expect((error as InvalidTransitionError).to).toBe("RESUELTA");
    }
  });

  it("rechaza transiciones desde estados terminales", () => {
    expect(() =>
      assertTransition("RESUELTA", "EN_PROGRESO", { priority: "MEDIA" }),
    ).toThrow(InvalidTransitionError);
    expect(() =>
      assertTransition("CANCELADA", "EN_PROGRESO", { priority: "MEDIA" }),
    ).toThrow(InvalidTransitionError);
  });

  it("lanza ObservationRequiredError con code OBSERVATION_REQUIRED para CRITICA sin observación", () => {
    expect(() =>
      assertTransition("EN_PROGRESO", "RESUELTA", { priority: "CRITICA" }),
    ).toThrow(ObservationRequiredError);
    try {
      assertTransition("EN_PROGRESO", "RESUELTA", { priority: "CRITICA" });
    } catch (error) {
      expect(error).toBeInstanceOf(ObservationRequiredError);
      expect((error as ObservationRequiredError).code).toBe("OBSERVATION_REQUIRED");
    }
  });

  it("lanza ObservationRequiredError si la observación son solo espacios", () => {
    expect(() =>
      assertTransition("EN_PROGRESO", "RESUELTA", {
        priority: "CRITICA",
        observation: "   \n\t  ",
      }),
    ).toThrow(ObservationRequiredError);
  });

  it("permite CRITICA → RESUELTA con observación no vacía", () => {
    expect(() =>
      assertTransition("EN_PROGRESO", "RESUELTA", {
        priority: "CRITICA",
        observation: "Reinicio del servicio aplicado",
      }),
    ).not.toThrow();
  });

  it("permite BAJA → RESUELTA sin observación", () => {
    expect(() =>
      assertTransition("EN_PROGRESO", "RESUELTA", { priority: "BAJA" }),
    ).not.toThrow();
  });

  it("la transición se valida antes que la regla de observación (orden de chequeo)", () => {
    // PENDIENTE → RESUELTA no es válida; debe lanzar InvalidTransition, no ObservationRequired.
    expect(() =>
      assertTransition("PENDIENTE", "RESUELTA", { priority: "CRITICA" }),
    ).toThrow(InvalidTransitionError);
  });
});

describe("ticket-policy · assertEditable", () => {
  const baseTicket = {
    id: "t-1",
    title: "Impresora no responde",
    description: "Detalle suficientemente largo para validar",
    category: "HARDWARE" as const,
    priority: "MEDIA" as const,
    requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
    assignedTo: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    resolvedAt: null,
    deletedAt: null,
  };

  it("permite editar tickets en PENDIENTE", () => {
    expect(() => assertEditable({ ...baseTicket, status: "PENDIENTE" })).not.toThrow();
  });

  it("permite editar tickets en EN_PROGRESO", () => {
    expect(() => assertEditable({ ...baseTicket, status: "EN_PROGRESO" })).not.toThrow();
  });

  it("lanza TicketLockedError para tickets en RESUELTA", () => {
    expect(() => assertEditable({ ...baseTicket, status: "RESUELTA" })).toThrow(
      TicketLockedError,
    );
    try {
      assertEditable({ ...baseTicket, status: "RESUELTA" });
    } catch (error) {
      expect(error).toBeInstanceOf(TicketLockedError);
      expect((error as TicketLockedError).code).toBe("TICKET_LOCKED");
      expect((error as TicketLockedError).status).toBe("RESUELTA");
    }
  });

  it("lanza TicketLockedError para tickets en CANCELADA", () => {
    expect(() => assertEditable({ ...baseTicket, status: "CANCELADA" })).toThrow(
      TicketLockedError,
    );
  });
});

describe("ticket-policy · helpers isOpen / isClosed", () => {
  const make = (status: (typeof ALL_STATUSES)[number]) => ({
    id: "t-1",
    title: "x",
    description: "x",
    category: "OTROS" as const,
    priority: "MEDIA" as const,
    status,
    requester: { id: "u-1", name: "Ana", email: "ana@example.com" },
    assignedTo: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    resolvedAt: null,
    deletedAt: null,
  });

  it("isOpen devuelve true en PENDIENTE y EN_PROGRESO", () => {
    expect(isOpen(make("PENDIENTE"))).toBe(true);
    expect(isOpen(make("EN_PROGRESO"))).toBe(true);
  });

  it("isOpen devuelve false en RESUELTA y CANCELADA", () => {
    expect(isOpen(make("RESUELTA"))).toBe(false);
    expect(isOpen(make("CANCELADA"))).toBe(false);
  });

  it("isClosed es la negación de isOpen (sin importar soft delete)", () => {
    // El soft delete se evalúa fuera del dominio puro; isClosed refleja solo status.
    for (const status of ALL_STATUSES) {
      expect(isClosed(make(status))).toBe(!isOpen(make(status)));
    }
  });
});
