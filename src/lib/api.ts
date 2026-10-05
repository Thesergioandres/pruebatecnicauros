// Typed HTTP client for our own API. Runs in the browser; relative URLs.
export interface TicketDto {
  id: string;
  title: string;
  description: string;
  requester: string;
  requesterEmail: string | null;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryDto {
  id: string;
  fromStatus: string;
  toStatus: string;
  actor: string;
  observation: string | null;
  createdAt: string;
}

export interface TicketDetailDto extends TicketDto {
  history: HistoryDto[];
}

export interface PageDto<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListParams {
  q?: string;
  status?: string;
  priority?: string;
  category?: string;
  sort?: string;
  order?: string;
  page?: number;
  pageSize?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const nested = (body as { error?: { code?: string; message?: string } }).error;
    throw new ApiError(
      response.status,
      nested?.code ?? "UNKNOWN",
      nested?.message ?? `Request failed with status ${response.status}`,
    );
  }
  return body as T;
}

function toQuery(params: ListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  list(params: ListParams): Promise<PageDto<TicketDto>> {
    return request<PageDto<TicketDto>>(`/api/tickets${toQuery(params)}`);
  },
  get(id: string): Promise<TicketDetailDto> {
    return request<TicketDetailDto>(`/api/tickets/${id}`);
  },
  create(data: unknown): Promise<TicketDto> {
    return request<TicketDto>("/api/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update(id: string, data: unknown): Promise<TicketDto> {
    return request<TicketDto>(`/api/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  transition(id: string, data: unknown): Promise<unknown> {
    return request(`/api/tickets/${id}/transitions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  remove(id: string): Promise<void> {
    return request<void>(`/api/tickets/${id}`, { method: "DELETE" });
  },
};
