import { Router } from "express";

import type { UserDirectory } from "../../../application/ports/index.js";

/**
 * Listado de usuarios para alimentar selectores (solicitante,
 * asignado). Cualquier usuario autenticado puede llamarlo; no es
 * un endpoint administrativo (la gestion CRUD de usuarios vive en
 * `admin.routes.ts`).
 */
export function makeUsersRouter(deps: { readonly users: UserDirectory }): Router {
  const router = Router();
  router.get("/", async (_req, res) => {
    const users = await deps.users.list();
    res.status(200).json(users);
  });
  return router;
}
