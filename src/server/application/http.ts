import { ZodError } from "zod";

import {
  InvalidTransitionError,
  ObservationRequiredError,
} from "../domain/ticket";
import { CodedError, NotFoundError } from "./errors";

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function body(
  code: string,
  message: string,
  details?: unknown,
): ErrorBody {
  return {
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}

export function jsonResponse<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

/**
 * Single error response shape for the whole API. Status codes mean what
 * they say: 400 malformed, 404 missing, 409 conflict, 422 validation,
 * 500 unexpected (no stack traces leak to clients).
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      body("VALIDATION_ERROR", "Invalid request data", error.issues),
      { status: 422 },
    );
  }
  if (error instanceof NotFoundError) {
    return Response.json(body(error.code, error.message), { status: 404 });
  }
  if (error instanceof CodedError) {
    return Response.json(body(error.code, error.message), {
      status: error.status,
    });
  }
  if (error instanceof InvalidTransitionError) {
    return Response.json(body(error.code, error.message), { status: 409 });
  }
  if (error instanceof ObservationRequiredError) {
    return Response.json(body(error.code, error.message), { status: 422 });
  }
  if (error instanceof SyntaxError) {
    return Response.json(body("MALFORMED_JSON", "Request body is not valid JSON"), {
      status: 400,
    });
  }
  return Response.json(body("INTERNAL_ERROR", "Unexpected error"), {
    status: 500,
  });
}
