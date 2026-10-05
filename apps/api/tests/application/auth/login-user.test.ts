import { describe, expect, it } from "vitest";

import { InvalidCredentialsError } from "../../../src/application/errors.js";
import { LoginUserUseCase } from "../../../src/application/use-cases/auth/login-user.js";
import { fakePasswordHasher, inMemoryUserRepo } from "../fakes.js";

describe("LoginUserUseCase", () => {
  it("devuelve userId y role cuando el par es valido", async () => {
    const users = inMemoryUserRepo();
    users.seed({
      id: "u-1",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash:secret",
      role: "USER",
      createdAt: "x",
    });

    const useCase = new LoginUserUseCase({
      users,
      hasher: fakePasswordHasher(),
    });

    const result = await useCase.execute({
      email: "ana@example.com",
      password: "secret",
    });

    expect(result).toEqual({ userId: "u-1", role: "USER" });
  });

  it("lanza InvalidCredentialsError si el email no existe", async () => {
    const useCase = new LoginUserUseCase({
      users: inMemoryUserRepo(),
      hasher: fakePasswordHasher(),
    });

    await expect(
      useCase.execute({ email: "nadie@example.com", password: "x" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("lanza InvalidCredentialsError si la contrasena no coincide", async () => {
    const users = inMemoryUserRepo();
    users.seed({
      id: "u-1",
      name: "Ana",
      email: "ana@example.com",
      passwordHash: "hash:secret",
      role: "USER",
      createdAt: "x",
    });

    const useCase = new LoginUserUseCase({
      users,
      hasher: fakePasswordHasher(),
    });

    await expect(
      useCase.execute({ email: "ana@example.com", password: "wrong" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
