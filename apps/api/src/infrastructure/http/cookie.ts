import type { Response } from "express";

/**
 * Opciones de la cookie de sesion. `secure` se activa fuera de dev
 * para forzar HTTPS en produccion. `sameSite=lax` mitiga CSRF sin
 * romper navegacion normal; `httpOnly` evita que JS lea la cookie.
 */
export interface SessionCookieOptions {
  readonly name: string;
  readonly maxAgeMs: number;
  readonly secure: boolean;
}

export function setSessionCookie(
  res: Response,
  token: string,
  options: SessionCookieOptions,
): void {
  res.cookie(options.name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: options.secure,
    maxAge: options.maxAgeMs,
    path: "/",
  });
}

export function clearSessionCookie(
  res: Response,
  options: SessionCookieOptions,
): void {
  res.clearCookie(options.name, {
    httpOnly: true,
    sameSite: "lax",
    secure: options.secure,
    path: "/",
  });
}
