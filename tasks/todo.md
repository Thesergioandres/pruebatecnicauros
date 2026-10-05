# Trazabilidad de requisitos → código → verificación

Cada fila es un requisito del spec (`pruebatecnica.md` / PDF). Ninguno se descarta, ninguno se
simplifica. "Estado" se actualiza a medida que se implementa y se verifica.

## 2. Contexto — modelo de datos

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R2.1 | Título | `packages/shared/src/types.ts` (`Ticket.title`), columna `tickets.title` | `create-ticket.usecase.test.ts`, POST 201 | pendiente |
| R2.2 | Descripción | `Ticket.description`, `tickets.description` | validación zod min/max | pendiente |
| R2.3 | Usuario solicitante | `Ticket.requesterId`, `tickets.requester_id` FK | FK + test de usuario inexistente | pendiente |
| R2.4 | Categoría (5 valores) | `Category` enum, CHECK en BD | test de valor inválido | pendiente |
| R2.5 | Prioridad (4 valores) | `Priority` enum, CHECK en BD | test de valor inválido | pendiente |
| R2.6 | Estado (4 valores) | `TicketStatus` enum, CHECK en BD | test de valor inválido | pendiente |
| R2.7 | Fecha de creación | `tickets.created_at` default `now()` | presente en respuestas | pendiente |
| R2.8 | Fecha de actualización | `tickets.updated_at`, trigger o UPDATE explícito | test que cambia tras editar | pendiente |

## 3. Funcionalidades requeridas

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R3.1 | Crear solicitudes | `application/use-cases/create-ticket.ts`, `POST /api/tickets` | test de integración 201 | pendiente |
| R3.2 | Consultar solicitudes | `list-tickets.ts`, `GET /api/tickets` | test de listado paginado | pendiente |
| R3.3 | Detalle de una solicitud | `get-ticket.ts`, `GET /api/tickets/:id` | 200 con detalle / 404 | pendiente |
| R3.4 | Editar solicitudes | `update-ticket.ts`, `PATCH /api/tickets/:id` | test de edición parcial | pendiente |
| R3.5 | Cambiar estado | `change-ticket-status.ts`, `PATCH /api/tickets/:id/status` | test de transición válida e inválida | pendiente |
| R3.6 | Eliminar o cancelar | `cancel-ticket.ts` (`POST /:id/cancel`), `delete-ticket.ts` (`DELETE /:id`, soft, admin) | test de ambos + permisos | pendiente |
| R3.7 | Historial de cambios | `get-ticket-history.ts`, `GET /api/tickets/:id/history` | test de historial ordenado | pendiente |
| R3.8 | Buscar solicitudes | parámetro `search` (título + descripción) | test de búsqueda case-insensitive | pendiente |
| R3.9 | Filtrar por estado, prioridad y categoría | params `status`, `priority`, `category` combinables | test de filtros combinados | pendiente |
| R3.10 | Ordenar los resultados | params `sort` + `order` con whitelist | test de orden + rejection de campo inválido | pendiente |
| R3.11 | Paginar los resultados | `page`, `pageSize` + metadatos en respuesta | test de `total`, `totalPages` | pendiente |
| R3.12 | Historial con estado anterior y nuevo | columnas `previous_status`, `new_status` | test del registro | pendiente |
| R3.13 | Historial con fecha y hora | `ticket_history.created_at` | aserción en test | pendiente |
| R3.14 | Historial con usuario responsable | `changed_by` FK,Tomado de la sesión | test de autoría | pendiente |
| R3.15 | Historial con observación cuando corresponda | `observation` nullable | test de observación obligatoria en crítica | pendiente |

## 4. Reglas de negocio

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R4.1 | Pendiente → En progreso | tabla `ALLOWED_TRANSITIONS` | test | pendiente |
| R4.2 | En progreso → Resuelta | ídem | test | pendiente |
| R4.3 | Pendiente → Cancelada | ídem | test | pendiente |
| R4.4 | Cancelada no vuelve a En progreso | estado terminal | test de rechazo | pendiente |
| R4.5 | Resuelta no vuelve a En progreso | estado terminal | test de rechazo | pendiente |
| R4.6 | Crítica exige observación al resolverse | `change-ticket-status` valida | test 422 sin observación / 201 con ella | pendiente |

## 5. Tecnologías

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R5.1 | React | `apps/web` | build | pendiente |
| R5.2 | Node | runtime de `apps/api` | `npm run dev` | pendiente |
| R5.3 | Next | Next 15 App Router | build + rutas | pendiente |
| R5.4 | Tailwind | `apps/web` config | estilos aplicados | pendiente |
| R5.5 | TypeScript | todos los paquetes | `npm run typecheck` | pendiente |
| R5.6 | PostgreSQL | `postgres:16-alpine`, `pg` | migraciones aplicadas | pendiente |

## 6. Arquitectura

| ID | Requisito | Código | Verificación | pendiente |
|---|---|---|---|---|
| R6.1 | Hexagonal en backend | `apps/api/src/{domain,application,infrastructure}` | `domain/` sin imports de framework (test de arquitectura) | pendiente |
| R6.2 | Limpia en frontend | `apps/web/src/{domain,application,infrastructure,presentation}` | `presentation` no importa `infrastructure` salvo container | pendiente |
| R6.3 | Separación de responsabilidades | puertos en `application`, adapters en `infrastructure` | lectura de código | pendiente |
| R6.4 | Justificación documentada | `docs/DECISIONS.md`, `README.md` | revisión | pendiente |

## 7. Validaciones

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R7.1 | Validación en frontend | schemas zod + errores por campo en formularios | flujo en browser | pendiente |
| R7.2 | Validación en backend con DTOs/Schemas | `infrastructure/http/schemas/*.ts` + middleware | tests 400/422 | pendiente |
| R7.3 | Campos obligatorios | `.min(1)` / required | test | pendiente |
| R7.4 | Tipos de datos | zod `z.string()`, `z.uuid()`, coerción numérica de query | test de tipo inválido | pendiente |
| R7.5 | Valores permitidos | `z.enum([...])` | test | pendiente |
| R7.6 | Datos inválidos | mensajes por campo en 422 | test | pendiente |
| R7.7 | Reglas de las operaciones | política de transiciones + authz de delete | test | pendiente |

## 8. Control de versiones

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R8.1 | Rama `main` | `git branch` | pendiente |
| R8.2 | Rama `develop` | desarrollo inicial en `develop` | pendiente |
| R8.3 | Mínimo 5 commits | 13 commits planificados | pendiente |
| R8.4 | Al menos un merge develop → main | `--no-ff` | pendiente |
| R8.5 | Commits reflejan el proceso | mensajes Conventional Commits por slice | pendiente |
| R8.6 | Repo en plataforma remota | `origin` → github.com/Thesergioandres/pruebatecnicauros | pendiente |

## 9. Documentación

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R9.1 | README: instalar | `README.md` | seguir los pasos en limpio | pendiente |
| R9.2 | README: variables de entorno | `.env.example` + tabla en README | pendiente |
| R9.3 | README: configurar base de datos | sección de migraciones y seed | pendiente |
| R9.4 | README: ejecutar frontend y backend | comandos | pendiente |
| R9.5 | README: decisiones técnicas | `docs/DECISIONS.md` enlazado | pendiente |
| R9.6 | Supuestos documentados | `docs/DECISIONS.md` § Supuestos | pendiente |

## 11. Opcionales elegidos

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R11.1 | Documentación de API | `infrastructure/http/openapi.ts` + `/api/docs` | abrir Swagger UI | pendiente |
| R11.2 | Contenedorización | `Dockerfile`s + `docker-compose.yml` | `docker compose up` | pendiente |
| R11.3 | Pruebas automatizadas | Vitest + supertest | `npm test` | pendiente |
| R11.4 | Notificaciones | **fuera de alcance**, decidido con el usuario | documentado | n/a |

## 12. Entregables

| ID | Requisito | Verificación | Estado |
|---|---|---|---|
| R12.1 | URL del repositorio | remoto configurado | pendiente |
| R12.2 | Instrucciones vía README | `README.md` | pendiente |
| R12.3 | Código del frontend | `apps/web` | pendiente |
| R12.4 | Código del backend | `apps/api` | pendiente |
| R12.5 | Scripts de base de datos | `npm run db:migrate`, `db:seed`, SQL en `infrastructure/db/migrations` | pendiente |
| R12.6 | `.env.example` | raíz + por app | pendiente |
