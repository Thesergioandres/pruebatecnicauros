import type { NextFunction, Request, Response } from "express";

import { mapErrorToBody } from "./error-mapper.js";

/**
 * Middleware final de errores. Convierte cualquier excepcion no
 * manejada en una respuesta JSON con la forma unica
 * `{ error: { code, message, details? } }`. Nunca propaga el stack al
 * cliente; los logs se hacen a nivel de aplicacion.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { status, body } = mapErrorToBody(err);
  res.status(status).json(body);
}
