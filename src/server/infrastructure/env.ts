import { z } from "zod";

// Validated at import time: fail fast with a clear message, never undefined secrets.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default("onboarding@resend.dev"),
  APP_URL: z.string().default("http://localhost:3000"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

/** True when email sending is configured. Otherwise notifications are logged, not sent. */
export function isMailConfigured(): boolean {
  return (process.env["RESEND_API_KEY"] ?? "").trim().length > 0;
}
