import { describe, expect, it } from "vitest";

import { AuthenticationError } from "../../../src/application/errors.js";
import { GetCurrentUserUseCase } from "../../../src/application/use-cases/auth/get-current-user.js";
import { inMemoryUserRepo } from "../fakes.js";

describe("GetCurrentUserUseCase", () => {
  it("devuelve el usuario en forma SessionUser con role ADMIN", async () => {
    const users = inMemoryUserRepo();
    users.seed({
      id: "u-admin",
      name: "Ada Admin",
      email: "admin@example.com",
      passwordHash: "secret-hash",
      role: "ADMIN",
      createdAt: "x",
    });

    const useCase = new GetCurrentUserUseCase(users);
    const user = await useCase.execute({
      subject: "u-admin",
      role: "ADMIN",
      issuedAt: 0,
      expiresAt: 1,
    });

    expect(user).toEqual({
      id: "u-admin",
      name: "Ada Admin",
      email: "admin@example.com",
      role: "ADMIN",
    });
  });

  it("devuelve el usuario en forma SessionUser con role USER", async () => {
    const users = inMemoryUserRepo();
    users.seed({
      id: "u-1",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "x",
      role: "USER",
      createdAt: "x",
    });

    const useCase = new GetCurrentUserUseCase(users);
    const user = await useCase.execute({
      subject: "u-1",
      role: "USER",
      issuedAt: 0,
      expiresAt: 1,
    });

    expect(user.role).toBe("USER");
  });

  it("no expone el passwordHash en la respuesta", async () => {
    const users = inMemoryUserRepo();
    users.seed({
      id: "u-1",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash-secreto-nunca-debe-salir",
      role: "USER",
      createdAt: "x",
    });

    const useCase = new GetCurrentUserUseCase(users);
    const user = await useCase.execute({
      subject: "u-1",
      role: "USER",
      issuedAt: 0,
      expiresAt: 1,
    });

    expect(user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(user)).not.toContain("hash-secreto");
  });

  it("lanza AuthenticationError si el subject no existe", async () => {
    const useCase = new GetCurrentUserUseCase(inMemoryUserRepo());
    await expect(
      useCase.execute({
        subject: "u-inexistente",
        role: "USER",
        issuedAt: 0,
        expiresAt: 1,
      }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});
