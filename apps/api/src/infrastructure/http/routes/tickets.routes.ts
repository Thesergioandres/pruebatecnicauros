import { Router, type Response } from "express";
import {
  changeTicketStatusSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  type SessionUser,
  type TicketStatus,
  updateTicketSchema,
} from "@soporte/shared";
import { z } from "zod";

import type {
  CancelTicketUseCase,
  ChangeTicketStatusUseCase,
  CreateTicketUseCase,
  GetTicketHistoryUseCase,
  GetTicketUseCase,
  ListTicketsUseCase,
  SoftDeleteTicketUseCase,
  UpdateTicketUseCase,
} from "../../../application/use-cases/index.js";
import { validate } from "../validate.js";

const idParamSchema = z.object({ id: z.string().uuid("Debe ser un identificador valido") });

const cancelSchema = z
  .object({
    observation: z
      .string()
      .trim()
      .max(500, "La observacion no puede superar los 500 caracteres")
      .optional(),
  })
  .strict();

const readActor = (res: Response): SessionUser => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = (res.locals as any).sessionActor as SessionUser | undefined;
  if (actor === undefined) {
    throw new Error("sessionActor no presente en res.locals; requireAuth no ejecutado");
  }
  return actor;
};

/**
 * Rutas de tickets. Todas requieren sesion valida (aplicado en
 * `app.ts` mediante `requireAuth` a nivel de router). Las reglas
 * de autorizacion finas (solicitante, asignado, admin) viven en
 * los casos de uso (`application/authz.ts`).
 */
export function makeTicketsRouter(deps: {
  readonly listTickets: ListTicketsUseCase;
  readonly createTicket: CreateTicketUseCase;
  readonly getTicket: GetTicketUseCase;
  readonly updateTicket: UpdateTicketUseCase;
  readonly changeStatus: ChangeTicketStatusUseCase;
  readonly cancel: CancelTicketUseCase;
  readonly getHistory: GetTicketHistoryUseCase;
  readonly softDelete: SoftDeleteTicketUseCase;
}): Router {
  const router = Router();

  router.get(
    "/",
    validate("query", listTicketsQuerySchema),
    async (_req, res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query = (res.locals as any).validated.query as Parameters<
        ListTicketsUseCase["execute"]
      >[0]["query"];
      const actor = readActor(res);
      const page = await deps.listTickets.execute({ query, actor });
      res.status(200).json(page);
    },
  );

  router.post(
    "/",
    validate("body", createTicketSchema),
    async (_req, res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (res.locals as any).validated.body as Parameters<
        CreateTicketUseCase["execute"]
      >[0];
      const actor = readActor(res);
      const ticket = await deps.createTicket.execute({ ...body, actor });
      res.status(201).json(ticket);
    },
  );

  router.get(
    "/:id",
    validate("params", idParamSchema),
    async (req, res) => {
      const { id } = req.params as { id: string };
      const actor = readActor(res);
      const ticket = await deps.getTicket.execute({ id, actor });
      res.status(200).json(ticket);
    },
  );

  router.patch(
    "/:id",
    validate("params", idParamSchema),
    validate("body", updateTicketSchema),
    async (req, res) => {
      const { id } = req.params as { id: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const changes = (res.locals as any).validated.body as Parameters<
        UpdateTicketUseCase["execute"]
      >[0]["changes"];
      const actor = readActor(res);
      const updated = await deps.updateTicket.execute({ id, changes, actor });
      res.status(200).json(updated);
    },
  );

  router.patch(
    "/:id/status",
    validate("params", idParamSchema),
    validate("body", changeTicketStatusSchema),
    async (req, res) => {
      const { id } = req.params as { id: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (res.locals as any).validated.body as {
        status: TicketStatus;
        observation?: string;
      };
      const actor = readActor(res);
      const updated = await deps.changeStatus.execute({
        id,
        newStatus: body.status,
        observation: body.observation ?? null,
        actor,
      });
      res.status(200).json(updated);
    },
  );

  router.post(
    "/:id/cancel",
    validate("params", idParamSchema),
    validate("body", cancelSchema),
    async (req, res) => {
      const { id } = req.params as { id: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = (res.locals as any).validated.body as {
        observation?: string;
      };
      const actor = readActor(res);
      const updated = await deps.cancel.execute({
        id,
        observation: body.observation ?? null,
        actor,
      });
      res.status(200).json(updated);
    },
  );

  router.get(
    "/:id/history",
    validate("params", idParamSchema),
    validate(
      "query",
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(10),
      }),
    ),
    async (req, res: Response) => {
      const { id } = req.params as { id: string };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q = (res.locals as any).validated.query as { page: number; pageSize: number };
      const actor = readActor(res);
      const page = await deps.getHistory.execute({
        id,
        page: q.page,
        pageSize: q.pageSize,
        actor,
      });
      res.status(200).json(page);
    },
  );

  router.delete(
    "/:id",
    validate("params", idParamSchema),
    async (req, res) => {
      const { id } = req.params as { id: string };
      const actor = readActor(res);
      await deps.softDelete.execute({ id, actor });
      res.status(204).end();
    },
  );

  return router;
}
