import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

import { RequestValidationError } from "../../application/errors.js";

/**
 * Crea un intermediario de validacion que aplica el `schema` a la
 * fuente indicada (`body`, `query` o `params`). El resultado validado
 * se expone en `res.locals.validated.<source>` para que el manejador
 * lo use con tipos ya verificados.
 *
 * El manejador no debe leer `req.body` directo: usa
 * `res.locals.validated.body`.
 */
export function validate<TSource extends "body" | "query" | "params">(
  source: TSource,
  schema: ZodSchema,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const input: unknown = req[source];
    const result = schema.safeParse(input);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join(".") || "(root)",
        message: issue.message,
      }));
      next(new RequestValidationError(issues));
      return;
    }
    if (!res.locals.validated) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res.locals as any).validated = {};
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res.locals as any).validated[source] = result.data;
    next();
  };
}
