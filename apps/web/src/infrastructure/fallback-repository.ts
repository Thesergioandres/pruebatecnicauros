import { HttpError } from "./http-client.js";

/**
 * Decorador de puerto que intenta primero la implementacion "real"
 * (HTTP) y, si la red falla o el backend responde 5xx, delega en la
 * implementacion "mock" (en memoria). Los errores 4xx se propagan
 * sin fallback porque son decisiones de negocio del backend
 * (credenciales invalidas, email duplicado, etc.).
 *
 * La transicion a mock es transparente para la UI: el consumidor
 * recibe la misma forma DTO sin saber si la peticion llego a la API
 * o no. Esto permite que el shell funcione aunque el backend no
 * este levantado (desarrollo offline, demos, tests).
 */

function shouldFallback(err: unknown): boolean {
  if (err instanceof TypeError) {
    // Fetch lanza TypeError ante fallos de red (CORS, DNS, conexion).
    return true;
  }
  if (err instanceof HttpError) {
    return err.status >= 500;
  }
  return false;
}

async function withFallback<T>(
  _scope: string,
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    if (shouldFallback(err)) {
      return fallback();
    }
    throw err;
  }
}

export interface FallbackOptions {
  // Si es `false`, no se intenta el remoto: se va directo al mock.
  // Util para tests o para apagar la integracion sin tocar el codigo.
  remoteEnabled?: boolean;
}

/**
 * Construye un `AuthRepository` que intenta primero el remoto y cae
 * al mock cuando la red o el 5xx lo justifiquen.
 */
export function wrapAuthWithFallback<P extends object, M extends object>(
  primary: P,
  mock: M,
  options: FallbackOptions = {},
): P & M {
  if (options.remoteEnabled === false) {
    return mock as P & M;
  }
  // El objeto envuelto expone los metodos del primario pero delega
  // cada llamada con `withFallback`. Esto evita copiar firmas.
  return new Proxy(mock as P & M, {
    get(target, prop, receiver) {
      const primaryValue = (primary as unknown as Record<string | symbol, unknown>)[prop];
      const mockValue = (target as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof primaryValue === "function" && typeof mockValue === "function") {
        return (...args: unknown[]) =>
          withFallback(
            "auth",
            () => (primaryValue as (...a: unknown[]) => unknown).apply(primary, args) as Promise<unknown>,
            () => (mockValue as (...a: unknown[]) => unknown).apply(target, args) as Promise<unknown>,
          );
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export function wrapTicketWithFallback<P extends object, M extends object>(
  primary: P,
  mock: M,
  options: FallbackOptions = {},
): P & M {
  if (options.remoteEnabled === false) {
    return mock as P & M;
  }
  return new Proxy(mock as P & M, {
    get(target, prop, receiver) {
      const primaryValue = (primary as unknown as Record<string | symbol, unknown>)[prop];
      const mockValue = (target as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof primaryValue === "function" && typeof mockValue === "function") {
        return (...args: unknown[]) =>
          withFallback(
            "tickets",
            () => (primaryValue as (...a: unknown[]) => unknown).apply(primary, args) as Promise<unknown>,
            () => (mockValue as (...a: unknown[]) => unknown).apply(target, args) as Promise<unknown>,
          );
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

export function wrapAdminUserWithFallback<P extends object, M extends object>(
  primary: P,
  mock: M,
  options: FallbackOptions = {},
): P & M {
  if (options.remoteEnabled === false) {
    return mock as P & M;
  }
  return new Proxy(mock as P & M, {
    get(target, prop, receiver) {
      const primaryValue = (primary as unknown as Record<string | symbol, unknown>)[prop];
      const mockValue = (target as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof primaryValue === "function" && typeof mockValue === "function") {
        return (...args: unknown[]) =>
          withFallback(
            "admin",
            () => (primaryValue as (...a: unknown[]) => unknown).apply(primary, args) as Promise<unknown>,
            () => (mockValue as (...a: unknown[]) => unknown).apply(target, args) as Promise<unknown>,
          );
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
