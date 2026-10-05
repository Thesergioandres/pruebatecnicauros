import { ERROR_CODES, type ErrorCode } from "@soporte/shared";

import { DomainError } from "../domain/errors.js";

/**
 * Errores a nivel de aplicacion. Todos extienden la misma base `DomainError`
 * para que la capa HTTP pueda mapearlos via `error.code -> status` usando
 * la tabla compartida `ERROR_STATUS_BY_CODE`.
 *
 * La capa de dominio define las reglas; la capa de aplicacion lanza estos
 * errores cuando se rompe un invariante desde la perspectiva del caso de
 * uso (entidad inexistente, email duplicado, sin autenticacion, etc.).
 */

export class NotFoundError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.NOT_FOUND;
  override readonly name: string = "NotFoundError";
  readonly resource: string;
  readonly identifier: string | number | undefined;

  constructor(resource: string, identifier?: string | number) {
    super(
      identifier === undefined
        ? `${resource} no encontrado`
        : `${resource} con identificador "${identifier}" no encontrado`,
    );
    this.resource = resource;
    this.identifier = identifier;
  }
}

export class ConflictError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.CONFLICT;
  override readonly name: string = "ConflictError";
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}

export class EmailAlreadyRegisteredError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.EMAIL_ALREADY_REGISTERED;
  override readonly name: string = "EmailAlreadyRegisteredError";

  constructor() {
    super("El email ya esta registrado");
  }
}

export class AuthenticationError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.UNAUTHENTICATED;
  override readonly name: string = "AuthenticationError";
  readonly reason: "ausente" | "invalido" | "expirado";

  constructor(reason: "ausente" | "invalido" | "expirado") {
    super(
      reason === "ausente"
        ? "Autenticacion requerida"
        : reason === "expirado"
          ? "La sesion ha expirado"
          : "Credenciales invalidas",
    );
    this.reason = reason;
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.INVALID_CREDENTIALS;
  override readonly name: string = "InvalidCredentialsError";

  constructor() {
    super("Email o contrasena incorrectos");
  }
}

export class AuthorizationError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.FORBIDDEN;
  override readonly name: string = "AuthorizationError";
  readonly action: string;

  constructor(action: string) {
    super(`No tiene permisos para ${action}`);
    this.action = action;
  }
}

export interface FieldIssueLike {
  readonly path: string;
  readonly message: string;
}

/**
 * Lo usa la capa HTTP para devolver errores de zod (o cualquier validador)
 * con detalle a nivel de campo. El `code` es el VALIDATION_ERROR generico
 * para que el cliente pueda pintar los mensajes segun `details[].path`.
 */
export class RequestValidationError extends DomainError {
  readonly code: ErrorCode = ERROR_CODES.VALIDATION_ERROR;
  override readonly name: string = "RequestValidationError";
  readonly issues: readonly FieldIssueLike[];

  constructor(issues: readonly FieldIssueLike[], message = "Solicitud invalida") {
    super(message);
    this.issues = issues;
  }
}
