import { InMemoryAdminUserRepository } from "../application/repositories/in-memory-admin-user-repository.js";
import { InMemoryAuthRepository } from "../application/repositories/in-memory-auth-repository.js";
import { InMemoryTicketRepository } from "../application/repositories/in-memory-ticket-repository.js";
import { RemoteAdminUserRepository } from "../application/repositories/remote-admin-user-repository.js";
import { RemoteAuthRepository } from "../application/repositories/remote-auth-repository.js";
import { RemoteTicketRepository } from "../application/repositories/remote-ticket-repository.js";
import { CancelTicketUseCase } from "../application/use-cases/cancel-ticket.js";
import { ChangeTicketStatusUseCase } from "../application/use-cases/change-ticket-status.js";
import { CreateAdminUserUseCase } from "../application/use-cases/create-admin-user.js";
import { CreateTicketUseCase } from "../application/use-cases/create-ticket.js";
import { GetTicketHistoryUseCase } from "../application/use-cases/get-ticket-history.js";
import { GetTicketUseCase } from "../application/use-cases/get-ticket.js";
import { ListAdminUsersUseCase } from "../application/use-cases/list-admin-users.js";
import { ListTicketsUseCase } from "../application/use-cases/list-tickets.js";
import { ListUsersUseCase } from "../application/use-cases/list-users.js";
import { LoginUseCase } from "../application/use-cases/login.js";
import { SoftDeleteTicketUseCase } from "../application/use-cases/soft-delete-ticket.js";
import { UpdateTicketUseCase } from "../application/use-cases/update-ticket.js";
import {
  wrapAdminUserWithFallback,
  wrapAuthWithFallback,
  wrapTicketWithFallback,
} from "./fallback-repository.js";
import { httpClient } from "./http-client.js";

/**
 * Composition root. UNICO punto donde la presentacion cruza a la capa de
 * infraestructura.
 *
 * Cada puerto se sirve con un decorador de fallback: el front intenta
 * primero la API real (vía proxy same-origin `/api`) y, si la red falla
 * o el backend responde 5xx, recae en el repositorio en memoria. Los
 * errores 4xx se propagan tal cual: son decisiones de negocio.
 *
 * El interruptor `remoteEnabled` permite apagar la integracion remota
 * (tests, modo offline forzado) sin tocar el codigo.
 */

const remoteAuth = new RemoteAuthRepository(httpClient);
const mockAuth = new InMemoryAuthRepository();
const authRepository = wrapAuthWithFallback(remoteAuth, mockAuth, {
  remoteEnabled: process.env.NEXT_PUBLIC_API_MODE !== "mock",
});

const remoteTickets = new RemoteTicketRepository(httpClient);
const mockTickets = new InMemoryTicketRepository();
const ticketRepository = wrapTicketWithFallback(remoteTickets, mockTickets, {
  remoteEnabled: process.env.NEXT_PUBLIC_API_MODE !== "mock",
});

const remoteAdminUsers = new RemoteAdminUserRepository(httpClient);
const mockAdminUsers = new InMemoryAdminUserRepository();
const adminUserRepository = wrapAdminUserWithFallback(remoteAdminUsers, mockAdminUsers, {
  remoteEnabled: process.env.NEXT_PUBLIC_API_MODE !== "mock",
});

export const authContainer = {
  login: new LoginUseCase(authRepository),
  // El registro publico esta deshabilitado: el alta de usuarios la hace
  // unicamente el panel admin (ver `adminContainer.createUser`).
  register: null,
  logout: async (): Promise<void> => {
    await authRepository.logout();
  },
  refresh: async () => authRepository.getCurrentSession(),
} as const;

export const ticketContainer = {
  list: new ListTicketsUseCase(ticketRepository),
  get: new GetTicketUseCase(ticketRepository),
  create: new CreateTicketUseCase(ticketRepository),
  update: new UpdateTicketUseCase(ticketRepository),
  changeStatus: new ChangeTicketStatusUseCase(ticketRepository),
  cancel: new CancelTicketUseCase(ticketRepository),
  softDelete: new SoftDeleteTicketUseCase(ticketRepository),
  history: new GetTicketHistoryUseCase(ticketRepository),
  listUsers: new ListUsersUseCase(ticketRepository),
} as const;

export const adminContainer = {
  listUsers: new ListAdminUsersUseCase(adminUserRepository),
  createUser: new CreateAdminUserUseCase(adminUserRepository),
} as const;

export const infrastructure = {
  httpClient,
  // Lectura util para diagnostico: en que modo estamos corriendo.
  apiMode: process.env.NEXT_PUBLIC_API_MODE === "mock" ? "mock" : "remote-with-fallback",
} as const;

export type AuthContainer = typeof authContainer;
export type TicketContainer = typeof ticketContainer;
export type AdminContainer = typeof adminContainer;
