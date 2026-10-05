import jwt from "jsonwebtoken";

import type {
  SessionClaims,
  SessionTokenSigner,
} from "../../application/ports/index.js";

/**
 * Firma y verifica los tokens JWT de sesion. El secreto se carga de
 * `JWT_SECRET` (ver `.env.example`); en produccion debe ser >= 32
 * caracteres y rotarse periodicamente. El algoritmo es HS256.
 */
export class JwtSessionTokenSigner implements SessionTokenSigner {
  constructor(private readonly secret: string) {
    if (secret.length < 16) {
      throw new Error(
        "JWT_SECRET debe tener al menos 16 caracteres. Define uno seguro en .env",
      );
    }
  }

  sign(claims: SessionClaims): string {
    return jwt.sign(
      {
        sub: claims.subject,
        role: claims.role,
        iat: Math.floor(claims.issuedAt / 1000),
        exp: Math.floor(claims.expiresAt / 1000),
      },
      this.secret,
      { algorithm: "HS256" },
    );
  }

  verify(token: string): SessionClaims {
    const payload = jwt.verify(token, this.secret, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    if (typeof payload.sub !== "string") {
      throw new Error("Token sin subject");
    }
    if (payload.role !== "ADMIN" && payload.role !== "USER") {
      throw new Error("Token con rol invalido");
    }
    if (typeof payload.iat !== "number" || typeof payload.exp !== "number") {
      throw new Error("Token sin iat/exp");
    }
    return {
      subject: payload.sub,
      role: payload.role,
      issuedAt: payload.iat * 1000,
      expiresAt: payload.exp * 1000,
    };
  }
}
