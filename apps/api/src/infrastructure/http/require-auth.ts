import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { AuthenticationError } from "../../application/errors.js";
import type {
  SessionClaims,
  SessionTokenSigner,
} from "../../application/ports/index.js";

/**
 * Intermediario que valida la cookie de sesion y, si es valida, deja
 * las claims en `res.locals.session`. Si falta, esta mal firmada o ha
 * expirado, delega el error a la cadena (sera traducido a 401 por el
 * manejador de errores).
 */
export function makeRequireAuth(signer: SessionTokenSigner, cookieName: string) {
  return function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const token = readCookie(req, cookieName);
    if (token === undefined) {
      next(new AuthenticationError("ausente"));
      return;
    }
    let claims: SessionClaims;
    try {
      claims = signer.verify(token);
    } catch (error) {
      // La libreria jsonwebtoken lanza `TokenExpiredError` cuando el
      // token expira; el resto de errores se consideran "invalido".
      if (error instanceof jwt.TokenExpiredError) {
        next(new AuthenticationError("expirado"));
        return;
      }
      next(new AuthenticationError("invalido"));
      return;
    }
    if (!res.locals.validated) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res.locals as any).validated = {};
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res.locals as any).session = claims;
    next();
  };
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (typeof header !== "string" || header === "") return undefined;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.split("=");
    if (rawName === undefined) continue;
    if (rawName.trim() !== name) continue;
    return decodeURIComponent(rest.join("=").trim());
  }
  return undefined;
}
