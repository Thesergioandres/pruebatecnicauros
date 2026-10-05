import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import type {
  Clock,
  IdGenerator,
  Notifier,
  PasswordHasher,
  SessionTokenSigner,
  TicketHistoryRepository,
  TicketRepository,
  TicketTransitionWriter,
  UserDirectory,
  UserRepository,
} from "../../application/ports/index.js";
import {
  CancelTicketUseCase,
  ChangeTicketStatusUseCase,
  CreateTicketUseCase,
  CreateUserUseCase,
  GetCurrentUserUseCase,
  GetTicketHistoryUseCase,
  GetTicketUseCase,
  ListTicketsUseCase,
  LoginUserUseCase,
  SoftDeleteTicketUseCase,
  UpdateTicketUseCase,
} from "../../application/use-cases/index.js";
import { asUserDirectory } from "../db/repositories/user-directory-adapter.js";
import { errorHandler } from "./error-handler.js";
import { makeRequireAuth } from "./require-auth.js";
import { requireRole } from "./require-role.js";
import { makeAdminRouter } from "./routes/admin.routes.js";
import { makeAuthRouter } from "./routes/auth.routes.js";
import { makeDocsRouter } from "./routes/docs.routes.js";
import { makeTicketsRouter } from "./routes/tickets.routes.js";
import { makeUsersRouter } from "./routes/users.routes.js";
import type { SessionCookieOptions } from "./cookie.js";

/**
 * Conjunto de dependencias que la app HTTP necesita para arrancar.
 * El container (`container.ts`) es el unico sitio que sabe como
 * cablear cada pieza: aqui solo se hace DI por constructor.
 */
export interface AppDependencies {
  readonly tickets: TicketRepository & TicketTransitionWriter;
  readonly history: TicketHistoryRepository;
  readonly users: UserRepository;
  readonly notifier: Notifier;
  readonly hasher: PasswordHasher;
  readonly signer: SessionTokenSigner;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly cookie: SessionCookieOptions;
  readonly corsOrigin: string;
}

export function createApp(deps: AppDependencies): Express {
  const userDirectory: UserDirectory = asUserDirectory(deps.users);

  const login = new LoginUserUseCase({ users: deps.users, hasher: deps.hasher });
  // El handler de /me necesita el `role`, asi que pasamos el
  // `UserRepository` (que expone la fila completa) en lugar del
  // `UserDirectory` (que solo proyecta a `UserSummary` sin role).
  const me = new GetCurrentUserUseCase(deps.users);
  const createUser = new CreateUserUseCase({
    users: deps.users,
    hasher: deps.hasher,
    clock: deps.clock,
    ids: deps.ids,
  });
  const listTickets = new ListTicketsUseCase(deps.tickets);
  const createTicket = new CreateTicketUseCase({
    tickets: deps.tickets,
    users: userDirectory,
    clock: deps.clock,
    ids: deps.ids,
    notifier: deps.notifier,
  });
  const getTicket = new GetTicketUseCase(deps.tickets);
  const updateTicket = new UpdateTicketUseCase({
    tickets: deps.tickets,
    users: userDirectory,
    clock: deps.clock,
  });
  const changeStatus = new ChangeTicketStatusUseCase({
    tickets: deps.tickets,
    transitions: deps.tickets,
    clock: deps.clock,
    notifier: deps.notifier,
  });
  const cancel = new CancelTicketUseCase(changeStatus);
  const getHistory = new GetTicketHistoryUseCase({
    tickets: deps.tickets,
    history: deps.history,
  });
  const softDelete = new SoftDeleteTicketUseCase({
    tickets: deps.tickets,
    clock: deps.clock,
  });

  const requireAuth = makeRequireAuth(deps.signer, deps.cookie.name);

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: deps.corsOrigin === "*" ? true : deps.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Asegura que `res.locals.validated` exista antes de los validadores.
  app.use((_req: Request, r: Response, next: NextFunction) => {
    if (!r.locals.validated) r.locals.validated = {};
    next();
  });

  // Docs y OpenAPI sin auth.
  app.use("/api", makeDocsRouter());

  // Auth (login publico).
  app.use(
    "/api/auth",
    makeAuthRouter({
      login,
      me,
      signer: deps.signer,
      cookie: deps.cookie,
      getSessionClaims: (req) => readClaimsFromCookie(req, deps.signer, deps.cookie.name),
    }),
  );

  // Todo lo demas requiere sesion valida.
  app.use("/api", requireAuth);
  // Tras requireAuth, deja el actor en res.locals.sessionActor con la
  // forma `SessionUser { id, name, email, role }`. El nombre/email se
  // completa con un lookup a la BD via GetCurrentUserUseCase; asi las
  // notificaciones y la auditoria tienen datos consistentes.
  app.use(async (req: Request, r: Response, next: NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claims = (r.locals as any).session as
      | { subject: string; role: "ADMIN" | "USER" }
      | undefined;
    if (claims === undefined) {
      next();
      return;
    }
    try {
      const user = await me.execute({
        subject: claims.subject,
        role: claims.role,
        issuedAt: 0,
        expiresAt: 0,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r.locals as any).sessionActor = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: claims.role,
      };
      next();
    } catch (err) {
      next(err);
    }
  });

  // Endpoints de usuario (cualquier sesion).
  app.use("/api/users", makeUsersRouter({ users: userDirectory }));

  // Admin (solo ADMIN).
  app.use(
    "/api/admin",
    requireRole("ADMIN"),
    makeAdminRouter({ users: deps.users, createUser }),
  );

  // Tickets (cualquier sesion; authz fina en use cases).
  app.use(
    "/api/tickets",
    makeTicketsRouter({
      listTickets,
      createTicket,
      getTicket,
      updateTicket,
      changeStatus,
      cancel,
      getHistory,
      softDelete,
    }),
  );

  app.use(errorHandler);
  return app;
}

function readClaimsFromCookie(
  req: Request,
  signer: SessionTokenSigner,
  cookieName: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cookies = (req as any).cookies as Record<string, string> | undefined;
  const token = cookies?.[cookieName];
  if (typeof token !== "string" || token === "") return null;
  try {
    return signer.verify(token);
  } catch {
    return null;
  }
}
