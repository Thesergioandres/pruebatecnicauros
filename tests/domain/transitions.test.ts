import { describe, expect, it } from "vitest";

import {
  InvalidTransitionError,
  ObservationRequiredError,
  assertTransition,
  canTransition,
} from "@/server/domain/ticket";

describe("canTransition", () => {
  it("allows Pendiente -> En progreso", () => {
    expect(canTransition("Pendiente", "En progreso")).toBe(true);
  });

  it("allows En progreso -> Resuelta", () => {
    expect(canTransition("En progreso", "Resuelta")).toBe(true);
  });

  it("allows Pendiente -> Cancelada", () => {
    expect(canTransition("Pendiente", "Cancelada")).toBe(true);
  });

  it("allows En progreso -> Cancelada (extra rule: abort started work)", () => {
    expect(canTransition("En progreso", "Cancelada")).toBe(true);
  });

  it("rejects Cancelada -> En progreso", () => {
    expect(canTransition("Cancelada", "En progreso")).toBe(false);
  });

  it("rejects Resuelta -> En progreso", () => {
    expect(canTransition("Resuelta", "En progreso")).toBe(false);
  });

  it("rejects terminal states to anything", () => {
    expect(canTransition("Resuelta", "Cancelada")).toBe(false);
    expect(canTransition("Cancelada", "Resuelta")).toBe(false);
    expect(canTransition("Resuelta", "Pendiente")).toBe(false);
  });

  it("rejects backwards moves", () => {
    expect(canTransition("En progreso", "Pendiente")).toBe(false);
  });
});

describe("assertTransition", () => {
  it("does not throw on a legal transition", () => {
    expect(() =>
      assertTransition("Pendiente", "En progreso", { priority: "Media" }),
    ).not.toThrow();
  });

  it("throws InvalidTransitionError with code on illegal transition", () => {
    try {
      assertTransition("Cancelada", "En progreso", { priority: "Baja" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as InvalidTransitionError).code).toBe("INVALID_TRANSITION");
    }
  });

  it("throws ObservationRequiredError when resolving a critical ticket without observation", () => {
    try {
      assertTransition("En progreso", "Resuelta", { priority: "Crítica" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ObservationRequiredError);
      expect((error as ObservationRequiredError).code).toBe(
        "OBSERVATION_REQUIRED",
      );
    }
  });

  it("throws ObservationRequiredError when observation is blank", () => {
    expect(() =>
      assertTransition("En progreso", "Resuelta", {
        priority: "Crítica",
        observation: "   ",
      }),
    ).toThrow(ObservationRequiredError);
  });

  it("resolves a critical ticket when observation is provided", () => {
    expect(() =>
      assertTransition("En progreso", "Resuelta", {
        priority: "Crítica",
        observation: "Se reemplazó la fuente de poder.",
      }),
    ).not.toThrow();
  });

  it("does not require observation for non-critical tickets", () => {
    expect(() =>
      assertTransition("En progreso", "Resuelta", { priority: "Alta" }),
    ).not.toThrow();
  });
});
