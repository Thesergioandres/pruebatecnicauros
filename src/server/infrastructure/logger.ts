type Level = "info" | "warn" | "error";

// Minimal structured logger: JSON lines, never logs secrets or PII bodies.
export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    log("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    log("warn", message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    log("error", message, context);
  },
};

function log(
  level: Level,
  message: string,
  context?: Record<string, unknown>,
): void {
  const line = JSON.stringify({
    level,
    message,
    ...(context === undefined ? {} : { context }),
  });
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}
