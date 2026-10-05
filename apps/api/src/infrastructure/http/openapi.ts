/**
 * Esqueleto de OpenAPI 3.0 escrito a mano para evitar dispersar el
 * contrato entre los manejadores. La fuente de verdad de tipos de
 * payload sigue siendo `packages/shared/src/schemas.ts`; aqui solo
 * documentamos forma, parametros y respuestas (status + shape).
 *
 * Se sirve tal cual desde `GET /api/openapi.json` y se renderiza en
 * `GET /api/docs` via swagger-ui-express.
 */

const TICKET_CATEGORIES = ["HARDWARE", "SOFTWARE", "RED", "ACCESOS", "OTROS"];
const TICKET_PRIORITIES = ["BAJA", "MEDIA", "ALTA", "CRITICA"];
const TICKET_STATUSES = ["PENDIENTE", "EN_PROGRESO", "RESUELTA", "CANCELADA"];
const USER_ROLES = ["ADMIN", "USER"];

const errorResponse = {
  description: "Error con la forma unica `{ error: { code, message, details? } }`.",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ApiError" },
    },
  },
};

const cookieAuth = {
  name: "soporte_session",
  in: "cookie",
  required: true,
  description: "Cookie de sesion httpOnly firmada con JWT (HS256).",
  schema: { type: "string" },
};

export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "API de solicitudes de soporte tecnico",
    version: "1.0.0",
    description:
      "API REST para la gestion de solicitudes internas de soporte. " +
      "Auth via cookie httpOnly; los identificadores son UUIDs. " +
      "Las respuestas de error siguen la forma unica `{ error: { code, message, details? } }`.",
  },
  servers: [
    { url: "/api", description: "Mismo origen (proxy del front o llamada directa)" },
  ],
  tags: [
    { name: "auth", description: "Inicio, fin y sesion" },
    { name: "admin", description: "Gestion de usuarios, solo ADMIN" },
    { name: "users", description: "Listado de usuarios para selectores" },
    { name: "tickets", description: "Solicitudes de soporte" },
    { name: "docs", description: "Documentacion del contrato" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        ...cookieAuth,
      },
    },
    schemas: {
      UserSummary: {
        type: "object",
        required: ["id", "name", "email"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
        },
      },
      Ticket: {
        type: "object",
        required: [
          "id", "title", "description", "category", "priority", "status",
          "requester", "assignedTo", "createdAt", "updatedAt", "resolvedAt", "deletedAt",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string", minLength: 5, maxLength: 120 },
          description: { type: "string", minLength: 10, maxLength: 2000 },
          category: { type: "string", enum: TICKET_CATEGORIES },
          priority: { type: "string", enum: TICKET_PRIORITIES },
          status: { type: "string", enum: TICKET_STATUSES },
          requester: { $ref: "#/components/schemas/UserSummary" },
          assignedTo: {
            oneOf: [
              { $ref: "#/components/schemas/UserSummary" },
              { type: "null" },
            ],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          resolvedAt: { type: "string", format: "date-time", nullable: true },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      TicketHistoryEntry: {
        type: "object",
        required: [
          "id", "ticketId", "previousStatus", "newStatus", "changedBy",
          "observation", "createdAt",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          ticketId: { type: "string", format: "uuid" },
          previousStatus: {
            oneOf: [
              { type: "string", enum: TICKET_STATUSES },
              { type: "null" },
            ],
          },
          newStatus: { type: "string", enum: TICKET_STATUSES },
          changedBy: { $ref: "#/components/schemas/UserSummary" },
          observation: { type: "string", nullable: true, maxLength: 500 },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PageTicket: {
        type: "object",
        required: ["items", "page", "pageSize", "total", "totalPages"],
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/Ticket" } },
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1, maximum: 100 },
          total: { type: "integer", minimum: 0 },
          totalPages: { type: "integer", minimum: 1 },
        },
      },
      PageHistory: {
        type: "object",
        required: ["items", "page", "pageSize", "total", "totalPages"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/TicketHistoryEntry" },
          },
          page: { type: "integer", minimum: 1 },
          pageSize: { type: "integer", minimum: 1, maximum: 100 },
          total: { type: "integer", minimum: 0 },
          totalPages: { type: "integer", minimum: 1 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
      },
      CreateUserRequest: {
        type: "object",
        required: ["name", "email", "password", "role"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 80 },
          email: { type: "string", format: "email", maxLength: 160 },
          password: { type: "string", minLength: 8, maxLength: 72 },
          role: { type: "string", enum: USER_ROLES },
        },
      },
      CreateTicketRequest: {
        type: "object",
        required: ["title", "description", "category", "priority"],
        properties: {
          title: { type: "string", minLength: 5, maxLength: 120 },
          description: { type: "string", minLength: 10, maxLength: 2000 },
          category: { type: "string", enum: TICKET_CATEGORIES },
          priority: { type: "string", enum: TICKET_PRIORITIES, default: "MEDIA" },
          requesterId: { type: "string", format: "uuid" },
          assignedToId: { type: "string", format: "uuid", nullable: true },
        },
      },
      UpdateTicketRequest: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 5, maxLength: 120 },
          description: { type: "string", minLength: 10, maxLength: 2000 },
          category: { type: "string", enum: TICKET_CATEGORIES },
          priority: { type: "string", enum: TICKET_PRIORITIES },
          assignedToId: { type: "string", format: "uuid", nullable: true },
        },
      },
      ChangeStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: TICKET_STATUSES },
          observation: { type: "string", maxLength: 500 },
        },
      },
      CancelRequest: {
        type: "object",
        properties: {
          observation: { type: "string", maxLength: 500 },
        },
      },
      ApiError: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
                enum: [
                  "VALIDATION_ERROR",
                  "UNAUTHENTICATED",
                  "FORBIDDEN",
                  "NOT_FOUND",
                  "CONFLICT",
                  "INVALID_TRANSITION",
                  "OBSERVATION_REQUIRED",
                  "TICKET_LOCKED",
                  "EMAIL_ALREADY_REGISTERED",
                  "INVALID_CREDENTIALS",
                  "RATE_LIMITED",
                  "INTERNAL_ERROR",
                ],
              },
              message: { type: "string" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  required: ["path", "message"],
                  properties: {
                    path: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Inicio de sesion publico (unica pantalla de entrada)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          204: { description: "Login correcto, cookie de sesion emitida" },
          401: errorResponse,
          422: errorResponse,
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["auth"],
        summary: "Cierra la sesion actual (borra la cookie)",
        responses: {
          204: { description: "Sesion cerrada" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["auth"],
        summary: "Devuelve el usuario asociado a la sesion actual",
        responses: {
          200: {
            description: "Usuario actual",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserSummary" },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    "/admin/users": {
      get: {
        tags: ["admin"],
        summary: "Lista usuarios (solo ADMIN)",
        responses: {
          200: {
            description: "Listado de usuarios",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/UserSummary" },
                },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
        },
      },
      post: {
        tags: ["admin"],
        summary: "Crea un usuario nuevo (solo ADMIN)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUserRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Usuario creado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserSummary" },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
          409: errorResponse,
          422: errorResponse,
        },
      },
    },
    "/users": {
      get: {
        tags: ["users"],
        summary: "Lista usuarios para selectores (solicitante, asignado)",
        responses: {
          200: {
            description: "Listado de usuarios",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/UserSummary" },
                },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    "/tickets": {
      get: {
        tags: ["tickets"],
        summary: "Lista tickets con busqueda, filtros, orden y paginacion",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: TICKET_STATUSES } },
          { name: "priority", in: "query", schema: { type: "string", enum: TICKET_PRIORITIES } },
          { name: "category", in: "query", schema: { type: "string", enum: TICKET_CATEGORIES } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "updatedAt", "title", "priority", "status"], default: "createdAt" } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
          { name: "includeDeleted", in: "query", schema: { type: "boolean", default: false } },
        ],
        responses: {
          200: {
            description: "Pagina de tickets",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PageTicket" },
              },
            },
          },
          401: errorResponse,
        },
      },
      post: {
        tags: ["tickets"],
        summary: "Crea un ticket nuevo",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTicketRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Ticket creado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Ticket" },
              },
            },
          },
          401: errorResponse,
          404: errorResponse,
          422: errorResponse,
        },
      },
    },
    "/tickets/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      get: {
        tags: ["tickets"],
        summary: "Detalle de un ticket",
        responses: {
          200: {
            description: "Ticket",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Ticket" },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
        },
      },
      patch: {
        tags: ["tickets"],
        summary: "Edita campos del ticket",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTicketRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Ticket actualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Ticket" },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          422: errorResponse,
        },
      },
      delete: {
        tags: ["tickets"],
        summary: "Soft delete (solo ADMIN)",
        responses: {
          204: { description: "Borrado logico aplicado" },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    "/tickets/{id}/status": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      patch: {
        tags: ["tickets"],
        summary: "Cambia el estado del ticket (escribe historial)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangeStatusRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Ticket con el nuevo estado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Ticket" },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
          422: errorResponse,
        },
      },
    },
    "/tickets/{id}/cancel": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      post: {
        tags: ["tickets"],
        summary: "Atajo de cancelacion con observacion opcional",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CancelRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Ticket cancelado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Ticket" },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          409: errorResponse,
        },
      },
    },
    "/tickets/{id}/history": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
      ],
      get: {
        tags: ["tickets"],
        summary: "Historial paginado del ticket",
        responses: {
          200: {
            description: "Pagina de entradas",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PageHistory" },
              },
            },
          },
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    "/openapi.json": {
      get: {
        tags: ["docs"],
        summary: "Contrato OpenAPI 3.0 en JSON",
        security: [],
        responses: {
          200: { description: "Documento OpenAPI" },
        },
      },
    },
    "/docs": {
      get: {
        tags: ["docs"],
        summary: "Swagger UI",
        security: [],
        responses: {
          200: { description: "HTML del UI" },
        },
      },
    },
  },
} as const;
