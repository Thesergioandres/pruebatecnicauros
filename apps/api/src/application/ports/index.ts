// Re-exports de los puertos de aplicacion y de los puertos de dominio
// que la capa de aplicacion consume directamente. Mantener este barrel
// sincronizado con el resto de archivos del directorio `ports/`.
export type { Clock } from "./clock.js";
export type { IdGenerator } from "./id-generator.js";
export type { PasswordHasher } from "./password-hasher.js";
export type {
  SessionClaims,
  SessionTokenSigner,
} from "./session-token-signer.js";
export type { UserRecord, UserRepository } from "./user-repository.js";
export type { TicketTransitionWriter } from "./ticket-transition-writer.js";
export type { Notifier } from "./notifier.js";

export type {
  Clock as DomainClock,
  NewHistoryEntry,
  TicketHistoryRepository,
  TicketRepository,
  UpdateTicketPatch,
  ListTicketsQuery,
  UserDirectory,
} from "../../domain/ports.js";
