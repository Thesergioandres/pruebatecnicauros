import type { ApiErrorBody, ErrorCode, FieldIssue } from "@soporte/shared";

/**
 * Cliente HTTP tipado para el frontend.
 *
 * Convenciones:
 *  - Todas las llamadas son same-origin (`/api/...`) y se envian con
 *    `credentials: 'include'` para que la cookie de sesion httpOnly viaje
 *    en cada peticion. El proxy de Next (`next.config.ts`) reescribe
 *    `/api/:path*` hacia `API_INTERNAL_URL`.
 *  - El cliente NUNCA toca `localStorage` ni `sessionStorage` con tokens.
 *  - Los errores se envuelven en `HttpError` con la forma canonica
 *    `{ error: { code, message, details? } }` que devuelve la API.
 *  - La capa de aplicacion puede distinguir errores por `code` o `status`
 *    sin parsear mensajes.
 */

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface HttpRequest<TBody = unknown> {
  method: HttpMethod;
  url: string;
  body?: TBody;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface HttpClient {
  request<TResponse, TBody = unknown>(input: HttpRequest<TBody>): Promise<TResponse>;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details: FieldIssue[] | undefined;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: FieldIssue[],
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_HEADERS = {
  Accept: "application/json",
} as const;

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { error?: unknown };
  if (typeof candidate.error !== "object" || candidate.error === null) return false;
  const error = candidate.error as { code?: unknown; message?: unknown };
  return typeof error.code === "string" && typeof error.message === "string";
}

class FetchHttpClient implements HttpClient {
  async request<TResponse, TBody = unknown>(
    input: HttpRequest<TBody>,
  ): Promise<TResponse> {
    const init: RequestInit = {
      method: input.method,
      credentials: "include",
      headers: {
        ...DEFAULT_HEADERS,
        ...(input.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...input.headers,
      },
      ...(input.signal ? { signal: input.signal } : {}),
    };

    if (input.body !== undefined) {
      init.body = JSON.stringify(input.body);
    }

    const response = await fetch(input.url, init);
    const parsed = await parseBody(response);

    if (!response.ok) {
      if (isApiErrorBody(parsed)) {
        const { code, message, details } = parsed.error;
        throw new HttpError(response.status, code, message, details);
      }
      throw new HttpError(
        response.status,
        "INTERNAL_ERROR",
        `Error HTTP ${response.status}`,
      );
    }

    return parsed as TResponse;
  }
}

export const httpClient: HttpClient = new FetchHttpClient();
