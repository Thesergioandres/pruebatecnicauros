import { Router, type Request, type Response } from "express";
import { loginSchema } from "@soporte/shared";

import type {
  GetCurrentUserUseCase,
  LoginUserUseCase,
} from "../../../application/use-cases/auth/index.js";
import type {
  SessionClaims,
  SessionTokenSigner,
} from "../../../application/ports/index.js";
import { clearSessionCookie, setSessionCookie, type SessionCookieOptions } from "../cookie.js";
import { validate } from "../validate.js";

/**
 * Rutas de autenticacion:
 *  - POST /api/auth/login   publica (unica pantalla de entrada).
 *  - POST /api/auth/logout  cierra la sesion actual.
 *  - GET  /api/auth/me      devuelve el usuario de la sesion.
 *
 * Sin registro publico: la creacion de usuarios vive en
 * `admin.routes.ts` y solo `ADMIN` puede llamarla.
 */
export function makeAuthRouter(deps: {
  readonly login: LoginUserUseCase;
  readonly me: GetCurrentUserUseCase;
  readonly signer: SessionTokenSigner;
  readonly cookie: SessionCookieOptions;
  readonly getSessionClaims: (req: Request) => SessionClaims | null;
}): Router {
  const router = Router();

  router.post(
    "/login",
    validate("body", loginSchema),
    async (_req: Request, res: Response) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (res.locals as any).validated.body as { email: string; password: string };
      const result = await deps.login.execute(body);
      const now = Date.now();
      const ttlMs = deps.cookie.maxAgeMs;
      const token = deps.signer.sign({
        subject: result.userId,
        role: result.role,
        issuedAt: now,
        expiresAt: now + ttlMs,
      });
      setSessionCookie(res, token, deps.cookie);
      res.status(204).end();
    },
  );

  router.post("/logout", (_req, res) => {
    clearSessionCookie(res, deps.cookie);
    res.status(204).end();
  });

  router.get("/me", async (req, res) => {
    const claims = deps.getSessionClaims(req);
    if (claims === null) {
      // requireAuth ya valido la cookie; este caso es defensivo.
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sin sesion" } });
      return;
    }
    const user = await deps.me.execute(claims);
    res.status(200).json(user);
  });

  return router;
}
