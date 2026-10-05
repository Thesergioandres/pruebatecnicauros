import { Router, type Response } from "express";
import { z } from "zod";

import type { CreateUserUseCase } from "../../../application/use-cases/auth/index.js";
import type { UserRepository } from "../../../application/ports/index.js";
import { validate } from "../validate.js";

const createUserSchema = z
  .object({
    name: z
      .string({ required_error: "El nombre es obligatorio" })
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre no puede superar los 80 caracteres"),
    email: z
      .string({ required_error: "El email es obligatorio" })
      .trim()
      .toLowerCase()
      .email("El email no tiene un formato valido")
      .max(160, "El email no puede superar los 160 caracteres"),
    password: z
      .string({ required_error: "La contrasena es obligatoria" })
      .min(8, "La contrasena debe tener al menos 8 caracteres")
      .max(72, "La contrasena no puede superar los 72 caracteres"),
    role: z.enum(["ADMIN", "USER"]),
  })
  .strict();

/**
 * Rutas de administracion, todas requieren rol `ADMIN` (verificado
 * en `requireRole` que se aplica a nivel de router). Aqui viven los
 * endpoints de creacion y listado de usuarios; el registro publico NO
 * existe.
 */
export function makeAdminRouter(deps: {
  readonly users: UserRepository;
  readonly createUser: CreateUserUseCase;
}): Router {
  const router = Router();

  router.get("/users", async (_req, res) => {
    const users = await deps.users.list();
    res.status(200).json(users);
  });

  router.post(
    "/users",
    validate("body", createUserSchema),
    async (_req, res: Response) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (res.locals as any).validated.body as {
        name: string;
        email: string;
        password: string;
        role: "ADMIN" | "USER";
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actor = (res.locals as any).sessionActor as
        | { id: string; name: string; email: string; role: "ADMIN" | "USER" }
        | undefined;
      if (actor === undefined) {
        res.status(401).json({
          error: { code: "UNAUTHENTICATED", message: "Sin sesion" },
        });
        return;
      }
      const summary = await deps.createUser.execute({ ...body, actor });
      res.status(201).json(summary);
    },
  );

  return router;
}
