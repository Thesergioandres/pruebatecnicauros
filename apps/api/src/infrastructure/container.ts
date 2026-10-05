import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { SystemClock } from "./time/system-clock.js";
import { RandomUuidIdGenerator } from "./auth/random-uuid-id-generator.js";
import { BcryptPasswordHasher } from "./auth/bcrypt-password-hasher.js";
import { JwtSessionTokenSigner } from "./auth/jwt-session-token-signer.js";
import { ResendNotifier } from "./notifications/resend-notifier.js";
import { PgTicketRepository } from "./db/repositories/pg-ticket-repository.js";
import { PgTicketHistoryRepository } from "./db/repositories/pg-ticket-history-repository.js";
import { PgUserRepository } from "./db/repositories/pg-user-repository.js";
import { getPool } from "./db/pool.js";
import { loadDatabaseConfig } from "./db/config.js";
import { createApp } from "./http/app.js";

/**
 * Composition root. Unico sitio donde se leen variables de entorno,
 * se instancian los adaptadores y se cablea la app HTTP. Ninguna otra
 * parte de la base de codigo debe leer `process.env` directamente.
 */

function loadDotenvFallback(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), ".env.example"),
    resolve(here, "../../../../.env"),
    resolve(here, "../../../../.env.example"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      const raw = readFileSync(file, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
      }
    }
  }
}

loadDotenvFallback();
loadDatabaseConfig();

const env = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Variable de entorno ${key} no definida`);
  }
  return value;
};

const envInt = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Variable de entorno ${key} invalida: ${raw}`);
  }
  return parsed;
};

const nodeEnv = env("NODE_ENV", "development");
const apiPort = envInt("API_PORT", 4000);
const logLevel = env("LOG_LEVEL", "info");

const jwtSecret = env("JWT_SECRET", "dev-secret-please-change-32-chars-minimum-xx");
const sessionTtlHours = envInt("SESSION_TTL_HOURS", 8);
const sessionCookieName = env("SESSION_COOKIE_NAME", "soporte_session");
const corsOrigin = env("CORS_ORIGIN", "http://localhost:3000");

const resendApiKey = env("RESEND_API_KEY", "");
const notifyFromEmail = env("NOTIFY_FROM_EMAIL", "soporte@tudominio.com");
const notifyNewTicketTo = env("NOTIFY_NEW_TICKET_TO", "serguito2003@gmail.com");

const logger = {
  info: (payload: Record<string, unknown>, message: string) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level: "info", msg: message, ...payload }));
  },
  warn: (payload: Record<string, unknown>, message: string) => {
    console.warn(JSON.stringify({ level: "warn", msg: message, ...payload }));
  },
};

const pool = getPool();

const userRepository = new PgUserRepository(pool);
const ticketRepository = new PgTicketRepository(pool);
const historyRepository = new PgTicketHistoryRepository(pool);

const notifier = new ResendNotifier({
  apiKey: resendApiKey,
  fromEmail: notifyFromEmail,
  notifyNewTicketTo,
  logger,
});

const app = createApp({
  tickets: ticketRepository,
  history: historyRepository,
  users: userRepository,
  notifier,
  hasher: new BcryptPasswordHasher(12),
  signer: new JwtSessionTokenSigner(jwtSecret),
  ids: new RandomUuidIdGenerator(),
  clock: new SystemClock(),
  cookie: {
    name: sessionCookieName,
    maxAgeMs: sessionTtlHours * 60 * 60 * 1000,
    secure: nodeEnv === "production",
  },
  corsOrigin,
});

console.error(
  JSON.stringify({
    level: "info",
    msg: "API arrancando",
    port: apiPort,
    env: nodeEnv,
    logLevel,
    cookie: sessionCookieName,
    notifyEnabled: resendApiKey.trim() !== "",
  }),
);

app.listen(apiPort);
