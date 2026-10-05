import {
  ERROR_STATUS_BY_CODE,
  type ApiErrorBody,
  type ErrorCode,
} from "@soporte/shared";

import { DomainError } from "../../domain/errors.js";
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  NotFoundError,
  RequestValidationError,
} from "../../application/errors.js";

/**
 * Mapea cualquier error conocido a la forma unica de respuesta
 * `{ error: { code, message, details? } }`. El status HTTP sale de la
 * tabla compartida `ERROR_STATUS_BY_CODE`, fuente unica de verdad.
 *
 * Reglas:
 *  - Si el error es de tipo `RequestValidationError`, los `details`
 *    se exponen en el body para que el cliente pueda pintar los
 *    mensajes por campo.
 *  - Los errores no reconocidos se envuelven como `INTERNAL_ERROR` y
 *    NO se filtra el stack ni el mensaje original al cliente.
 */
export function mapErrorToBody(
  error: unknown,
): { status: number; body: ApiErrorBody } {
  if (error instanceof RequestValidationError) {
    return {
      status: ERROR_STATUS_BY_CODE[error.code],
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
      },
    };
  }

  if (error instanceof DomainError) {
    return {
      status: ERROR_STATUS_BY_CODE[error.code],
      body: { error: { code: error.code, message: error.message } },
    };
  }

  return {
    status: ERROR_STATUS_BY_CODE.INTERNAL_ERROR,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Error interno del servidor",
      },
    },
  };
}

/**
 * Helper que mira si un error es uno de los tipados de aplicacion. Lo
 * usan los manejadores que necesitan branching por tipo (por ejemplo,
 * el de inicio de sesion para devolver 401 o el de borrado para
 * devolver 403).
 */
export function getErrorCode(error: unknown): ErrorCode | null {
  if (error instanceof DomainError) return error.code;
  return null;
}

export {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  NotFoundError,
  RequestValidationError,
};
