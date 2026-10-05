import { InMemoryAuthRepository } from "../application/repositories/in-memory-auth-repository.js";
import { LoginUseCase } from "../application/use-cases/login.js";
import { RegisterUseCase } from "../application/use-cases/register.js";
import { httpClient } from "./http-client.js";

/**
 * Composition root. UNICO punto donde la presentacion cruza a la capa de
 * infraestructura. Aqui se elige la implementacion del puerto
 * (`AuthRepository`): en este shell se usa `InMemoryAuthRepository`; cuando
 * la API real este lista, se sustituye por un adapter HTTP que reutilice
 * `httpClient` (cookie httpOnly, mismo origen, sin token en JS).
 */

const authRepository = new InMemoryAuthRepository();

export const authContainer = {
  login: new LoginUseCase(authRepository),
  register: new RegisterUseCase(authRepository),
  logout: async (): Promise<void> => {
    await authRepository.logout();
  },
} as const;

export const infrastructure = {
  httpClient,
} as const;

export type AuthContainer = typeof authContainer;
