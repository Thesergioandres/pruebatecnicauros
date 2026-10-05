import type {
  CreateTicketInput,
  Page,
  Ticket,
  TicketHistoryEntry,
  TicketStatus,
  UpdateTicketInput,
  UserRole,
} from "@soporte/shared";

import type {
  ListTicketsQuery,
  ListTicketsResult,
} from "../../domain/tickets.js";
import type { HttpClient } from "../../infrastructure/http-client.js";
import type { TicketRepository } from "../ports/ticket-repository.js";

/**
 * Adaptador HTTP del puerto de tickets. Contrato alineado con
 * `tasks/plan.md`:
 *  - `GET    /api/tickets?search&status&priority&category&sortBy&sortOrder&page&pageSize&includeDeleted`
 *  - `POST   /api/tickets`
 *  - `GET    /api/tickets/:id`
 *  - `PATCH  /api/tickets/:id`
 *  - `PATCH  /api/tickets/:id/status`
 *  - `POST   /api/tickets/:id/cancel`
 *  - `DELETE /api/tickets/:id`
 *  - `GET    /api/tickets/:id/history?page&pageSize`
 *  - `GET    /api/users`
 *
 * La API ya aplica la regla de autorizacion (USER solo ve lo suyo) y
 * el cambio de estado, asi que la UI no tiene que duplicar la politica
 * aqui. La conversion query<->querystring es local para no acoplar el
 * puerto al nombre de los parametros HTTP.
 */

function buildQueryString(query: ListTicketsQuery): string {
  const params = new URLSearchParams();
  if (query.filter.search) params.set("search", query.filter.search);
  if (query.filter.status) params.set("status", query.filter.status);
  if (query.filter.priority) params.set("priority", query.filter.priority);
  if (query.filter.category) params.set("category", query.filter.category);
  if (query.filter.requesterId) params.set("requesterId", query.filter.requesterId);
  if (query.filter.includeDeleted) params.set("includeDeleted", "true");
  params.set("sortBy", query.sort.field);
  params.set("sortOrder", query.sort.order);
  params.set("page", String(query.pagination.page));
  params.set("pageSize", String(query.pagination.pageSize));
  return params.toString();
}

export class RemoteTicketRepository implements TicketRepository {
  constructor(private readonly http: HttpClient) {}

  async list(query: ListTicketsQuery): Promise<ListTicketsResult> {
    const qs = buildQueryString(query);
    return this.http.request<Page<Ticket>>({
      method: "GET",
      url: `/api/tickets?${qs}`,
    });
  }

  async getById(id: string): Promise<Ticket | null> {
    try {
      return await this.http.request<Ticket>({
        method: "GET",
        url: `/api/tickets/${id}`,
      });
    } catch (err) {
      // 404 => no existe.
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) {
        return null;
      }
      throw err;
    }
  }

  async create(
    input: CreateTicketInput,
    requester: { id: string; name: string; email: string },
  ): Promise<Ticket> {
    return this.http.request<Ticket>({
      method: "POST",
      url: "/api/tickets",
      body: { ...input, requesterId: input.requesterId ?? requester.id },
    });
  }

  async update(id: string, input: UpdateTicketInput): Promise<Ticket> {
    return this.http.request<Ticket>({
      method: "PATCH",
      url: `/api/tickets/${id}`,
      body: input,
    });
  }

  async changeStatus(
    id: string,
    nextStatus: TicketStatus,
    observation: string | undefined,
    _actor: { id: string; name: string; email: string; role: UserRole },
  ): Promise<Ticket> {
    // La API rechaza `observation: null` (zod exige string u omitir el
    // campo). Si no hay observacion, omitimos la key del body.
    const body: { status: TicketStatus; observation?: string } = { status: nextStatus };
    if (observation && observation.trim().length > 0) {
      body.observation = observation;
    }
    return this.http.request<Ticket>({
      method: "PATCH",
      url: `/api/tickets/${id}/status`,
      body,
    });
  }

  async cancel(
    id: string,
    observation: string | undefined,
    _actor: { id: string; name: string; email: string; role: UserRole },
  ): Promise<Ticket> {
    const body: { observation?: string } = {};
    if (observation && observation.trim().length > 0) {
      body.observation = observation;
    }
    return this.http.request<Ticket>({
      method: "POST",
      url: `/api/tickets/${id}/cancel`,
      body,
    });
  }

  async softDelete(
    id: string,
    _actor: { id: string; name: string; email: string; role: UserRole },
  ): Promise<Ticket> {
    return this.http.request<Ticket>({
      method: "DELETE",
      url: `/api/tickets/${id}`,
    });
  }

  async history(
    id: string,
    pagination: { page: number; pageSize: number },
  ): Promise<{ items: TicketHistoryEntry[]; total: number }> {
    return this.http.request<{ items: TicketHistoryEntry[]; total: number }>({
      method: "GET",
      url: `/api/tickets/${id}/history?page=${pagination.page}&pageSize=${pagination.pageSize}`,
    });
  }

  async listUsers(): Promise<{ id: string; name: string; email: string }[]> {
    return this.http.request<{ id: string; name: string; email: string }[]>({
      method: "GET",
      url: "/api/users",
    });
  }
}
