import type { NextFunction, Request, Response } from "express";

import { AuthorizationError } from "../../application/errors.js";
import type { UserRole } from "@soporte/shared";

/**
 * Restringe una ruta a uno o varios roles. Asume que `requireAuth` ya
 * ha dejado las claims en `res.locals.session`.
 */
export function requireRole(...allowed: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (res.locals as any).session as
      | { role: UserRole }
      | undefined;
    if (session === undefined) {
      next(new AuthorizationError("acceder a este recurso"));
      return;
    }
    if (!allowed.includes(session.role)) {
      next(new AuthorizationError("acceder a este recurso"));
      return;
    }
    next();
  };
}
