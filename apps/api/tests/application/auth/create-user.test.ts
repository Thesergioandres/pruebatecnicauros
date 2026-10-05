import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  EmailAlreadyRegisteredError,
} from "../../../src/application/errors.js";
import { CreateUserUseCase } from "../../../src/application/use-cases/auth/create-user.js";
import {
  constantId,
  fakePasswordHasher,
  fixedClock,
  inMemoryUserRepo,
} from "../fakes.js";

const adminActor = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

describe("CreateUserUseCase", () => {
  it("ADMIN crea un usuario con contrasena hasheada y devuelve UserSummary", async () => {
    const users = inMemoryUserRepo();

    const useCase = new CreateUserUseCase({
      users,
      hasher: fakePasswordHasher(),
      clock: fixedClock("2026-06-01T00:00:00.000Z"),
      ids: constantId("u-new"),
    });

    const summary = await useCase.execute({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "secret-pass",
      role: "USER",
      actor: adminActor,
    });

    expect(summary).toEqual({
      id: "u-new",
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    const stored = users.users[0]!;
    expect(stored.passwordHash).toBe("hash:secret-pass");
    expect(stored.createdAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("lanza EmailAlreadyRegisteredError si el email ya existe", async () => {
    const users = inMemoryUserRepo();
    users.seed({
      id: "u-1",
      name: "Ya existe",
      email: "ada@example.com",
      passwordHash: "x",
      role: "USER",
      createdAt: "x",
    });

    const useCase = new CreateUserUseCase({
      users,
      hasher: fakePasswordHasher(),
      clock: fixedClock("x"),
      ids: constantId("u-2"),
    });

    await expect(
      useCase.execute({
        name: "Otro",
        email: "ada@example.com",
        password: "pwd",
        role: "USER",
        actor: adminActor,
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it("lanza AuthorizationError si el actor no es ADMIN", async () => {
    const useCase = new CreateUserUseCase({
      users: inMemoryUserRepo(),
      hasher: fakePasswordHasher(),
      clock: fixedClock("x"),
      ids: constantId("u-3"),
    });

    await expect(
      useCase.execute({
        name: "X",
        email: "x@example.com",
        password: "pwd",
        role: "USER",
        actor: { id: "u-1", name: "Ana", email: "ana@example.com", role: "USER" },
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("ADMIN puede crear otro ADMIN (rol ADMIN permitido)", async () => {
    const users = inMemoryUserRepo();
    const useCase = new CreateUserUseCase({
      users,
      hasher: fakePasswordHasher(),
      clock: fixedClock("x"),
      ids: constantId("u-admin-2"),
    });

    const summary = await useCase.execute({
      name: "Otro Admin",
      email: "admin2@example.com",
      password: "pwd",
      role: "ADMIN",
      actor: adminActor,
    });
    expect(users.users[0]!.role).toBe("ADMIN");
    expect(summary.id).toBe("u-admin-2");
  });
});
