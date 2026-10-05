/**
 * Puerto para firmar/verificar tokens de sesion (JWT en infraestructura).
 * La capa de aplicacion nunca ve el algoritmo ni el secreto; solo
 * trabaja con claims opacos + tokens como string.
 */
export interface SessionClaims {
  readonly subject: string;
  readonly role: "ADMIN" | "USER";
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export interface SessionTokenSigner {
  sign(claims: SessionClaims): string;
  verify(token: string): SessionClaims;
}
