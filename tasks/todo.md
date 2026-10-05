# Trazabilidad de requisitos → código → verificación

Cada fila es un requisito del spec (`pruebatecnica.md` / PDF). Ninguno se descarta, ninguno se
simplifica. "Estado" se actualiza a medida que se implementa y se verifica.

Leyenda de estados: `hecho` (código + verificación cerrada) · `parcial` (código listo, falta
verificación automatizada o alguna capa) · `pendiente` (no implementado) · `n/a` (fuera de alcance).

## 2. Contexto — modelo de datos

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R2.1 | Título | `packages/shared/src/types.ts` (`Ticket.title`), columna `tickets.title` con CHECK 5..120 | CHECK rechaza longitud inválida (psql) | hecho |
| R2.2 | Descripción | `Ticket.description`, `tickets.description` con CHECK 10..2000 | CHECK rechaza longitud inválida (psql) | hecho |
| R2.3 | Usuario solicitante | `Ticket.requester`, `tickets.requester_id` FK | FK rechaza id inexistente (psql) | hecho |
| R2.4 | Categoría (5 valores) | `TICKET_CATEGORIES` en `packages/shared/src/enums.ts`, `tickets_category_chk` en BD | CHECK rechaza `INVALID` (psql) | hecho |
| R2.5 | Prioridad (4 valores) | `TICKET_PRIORITIES`, `tickets_priority_chk` + `tickets_priority_weight_match_chk` | CHECK rechaza `URGENT` (psql) | hecho |
| R2.6 | Estado (4 valores) | `TICKET_STATUSES`, `tickets_status_chk` | CHECK + state machine en `packages/shared/src/state-machine.ts` | hecho |
| R2.7 | Fecha de creación | `tickets.created_at` default `now()` | default aplicado en INSERT (psql) | hecho |
| R2.8 | Fecha de actualización | `tickets.updated_at` + trigger `BEFORE UPDATE` (`set_updated_at()`) | UPDATE refresca la marca (psql) | hecho |

## 3. Funcionalidades requeridas

Casos de uso implementados en `apps/api/src/application/use-cases/`. Capa HTTP (rutas Express)
pendiente de cableado: no existe aun `apps/api/src/main.ts` ni router. Los use cases estan
listos para ser invocados por los adaptadores HTTP cuando se cree la capa de rutas.

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R3.1 | Crear solicitudes | `application/use-cases/create-ticket.ts` | use case listo; pendiente test de integración HTTP | parcial |
| R3.2 | Consultar solicitudes | `list-tickets.ts` (filtros, sort, paginación) | use case listo; pendiente test HTTP | parcial |
| R3.3 | Detalle de una solicitud | `get-ticket.ts` | use case listo; pendiente test HTTP | parcial |
| R3.4 | Editar solicitudes | `update-ticket.ts` | use case listo (typecheck falla por `readonly`; pendiente fix) | parcial |
| R3.5 | Cambiar estado | `change-ticket-status.ts` + state machine | use case listo; pendiente test HTTP | parcial |
| R3.6 | Eliminar o cancelar | `cancel-ticket.ts` + `soft-delete-ticket.ts` | use cases listos; pendiente test HTTP y authz | parcial |
| R3.7 | Historial de cambios | `get-ticket-history.ts` | use case listo; pendiente test HTTP | parcial |
| R3.8 | Buscar solicitudes | `search` en `list-tickets.ts`; índices trigram `tickets_title_trgm_idx` / `tickets_description_trgm_idx` | índices creados; pendiente test HTTP | parcial |
| R3.9 | Filtrar por estado, prioridad y categoría | params combinables en `list-tickets.ts` | use case listo; pendiente test HTTP | parcial |
| R3.10 | Ordenar los resultados | `SORTABLE_TICKET_FIELDS` en shared; whitelist en repositorio | use case listo; pendiente test HTTP | parcial |
| R3.11 | Paginar los resultados | `Page<TItem>` en shared; metadatos `total`/`totalPages` | use case listo; pendiente test HTTP | parcial |
| R3.12 | Historial con estado anterior y nuevo | columnas `previous_status`, `new_status` con CHECKs | seed inserta 11 entradas con transiciones; psql confirma | hecho |
| R3.13 | Historial con fecha y hora | `ticket_history.created_at` default `now()` | presente en seed y en respuestas (tipo `Date`) | hecho |
| R3.14 | Historial con usuario responsable | `changed_by_id` FK a `users` | FK validada; seed usa los IDs reales | hecho |
| R3.15 | Historial con observación cuando corresponda | `observation` nullable, max 500, `requiresObservation()` en state machine | regla implementada; pendiente test HTTP 422 | parcial |

## 4. Reglas de negocio

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R4.1 | Pendiente → En progreso | `TICKET_STATUS_TRANSITIONS` en `packages/shared/src/state-machine.ts` | test unitario de la matriz | parcial |
| R4.2 | En progreso → Resuelta | ídem | test unitario de la matriz | parcial |
| R4.3 | Pendiente → Cancelada | ídem | test unitario de la matriz | parcial |
| R4.4 | Cancelada no vuelve a En progreso | `TERMINAL_TICKET_STATUSES` | test de rechazo | parcial |
| R4.5 | Resuelta no vuelve a En progreso | `TERMINAL_TICKET_STATUSES` | test de rechazo | parcial |
| R4.6 | Crítica exige observación al resolverse | `requiresObservation()` en state machine | regla implementada; pendiente test HTTP 422 | parcial |

## 5. Tecnologías

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R5.1 | React | `apps/web/src` (React 19) | presencia de `react` y `react-dom` en `apps/web/package.json` | hecho |
| R5.2 | Node | `apps/api` (Node ≥ 20.11) | `engines.node` en `package.json` raíz | hecho |
| R5.3 | Next | `apps/web` (Next 15 App Router) | `next@^15.1.6` en `apps/web/package.json` | hecho |
| R5.4 | Tailwind | `apps/web` con Tailwind 4 | `tailwindcss@^4.0.0` + `postcss.config.mjs` | hecho |
| R5.5 | TypeScript | todos los paquetes con `tsconfig.json` estricto | `npm run typecheck` (falla en `update-ticket.ts`, fuera de esta lane) | parcial |
| R5.6 | PostgreSQL | `postgres:16-alpine` en compose + driver `pg` puro | contenedor healthy, 1 migración aplicada, 6 tickets seed | hecho |

## 6. Arquitectura

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R6.1 | Hexagonal en backend | `apps/api/src/{domain,application,infrastructure}` con puertos y adaptadores | estructura presente; `domain/` no importa framework | hecho |
| R6.2 | Limpia en frontend | `apps/web/src/{domain,application,infrastructure,presentation}` | estructura presente | hecho |
| R6.3 | Separación de responsabilidades | puertos en `application/ports/`, adaptadores en `infrastructure/` | `pg-user-repository.ts`, `bcrypt-password-hasher.ts`, `resend-notifier.ts` etc. | hecho |
| R6.4 | Justificación documentada | `docs/DECISIONS.md` (9 secciones) + `README.md` | documentos presentes y enlazados | hecho |

## 7. Validaciones

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R7.1 | Validación en frontend | schemas zod en `packages/shared/src/schemas.ts` + `LoginForm.tsx`, `TextField.tsx` etc. | formularios renderizan errores por campo | parcial |
| R7.2 | Validación en backend con DTOs/Schemas | `infrastructure/http/validate.ts` (middleware) + `infrastructure/http/require-auth.ts` / `require-role.ts` | middlewares presentes; pendiente test 400/422 | parcial |
| R7.3 | Campos obligatorios | `.min(1)` / required en schemas zod | test unitario de schema | parcial |
| R7.4 | Tipos de datos | zod `z.string()`, `z.uuid()`, coerción numérica de query | test unitario de schema | parcial |
| R7.5 | Valores permitidos | `z.enum([...])` para categorías, prioridades, estados, roles | test unitario de schema | parcial |
| R7.6 | Datos inválidos | mensajes por campo en `error-mapper.ts` | mapper presente; pendiente test 422 con shape exacto | parcial |
| R7.7 | Reglas de las operaciones | state machine + `require-role.ts` para `DELETE` y `soft-delete-ticket.ts` | lógica presente; pendiente test de authz | parcial |

## 8. Control de versiones

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R8.1 | Rama `main` | existe local y remoto | `git branch -a` | hecho |
| R8.2 | Rama `develop` | desarrollo en `develop` (HEAD actual) | rama activa | hecho |
| R8.3 | Mínimo 5 commits | 6 commits en develop (incluye 3 de feat, 2 de chore, 1 de feat shared) | `git log --oneline` | hecho |
| R8.4 | Al menos un merge develop → main | pendiente ejecutar por el evaluador (no automatizado) | `git merge --no-ff` | parcial |
| R8.5 | Commits reflejan el proceso | mensajes Conventional Commits por slice | revisar `git log` | hecho |
| R8.6 | Repo en plataforma remota | `origin` → github.com/Thesergioandres/pruebatecnicauros | `git remote -v` | hecho |

## 9. Documentación

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R9.1 | README: instalar | `README.md` (sección 1) | seguir los pasos en limpio | hecho |
| R9.2 | README: variables de entorno | `.env.example` + tabla en README (sección 2) | leer la tabla; sin secretos reales | hecho |
| R9.3 | README: configurar base de datos | `README.md` secciones 3 y 4 | levantar DB + migrar + seed limpio (verificado en smoke) | hecho |
| R9.4 | README: ejecutar frontend y backend | `README.md` secciones 7 y 8 | `npm run dev` o `docker compose up` | hecho |
| R9.5 | README: decisiones técnicas | `README.md` enlaza `docs/DECISIONS.md` (sección 11) | enlace presente | hecho |
| R9.6 | Supuestos documentados | `docs/DECISIONS.md` § 8 Supuestos | leer la sección | hecho |

## 10. Autenticación y notificaciones (spec reciente)

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R10.1 | Login único (admin y user) | `application/use-cases/auth/login-user.ts` + `create-user.ts` + `get-current-user.ts` | use cases listos; pendiente endpoint HTTP | parcial |
| R10.2 | Paneles por rol | enrutado en frontend segun rol; `require-role.ts` middleware en backend | middleware listo; pendiente test HTTP 403 | parcial |
| R10.3 | Notificaciones Resend | `infrastructure/notifications/resend-notifier.ts` + `RESEND_API_KEY` / `NOTIFY_FROM_EMAIL` en `.env.example` | adaptador presente; pendiente invocación desde casos de uso | parcial |
| R10.4 | Secretos solo de entorno | `seed.ts` lee `SEED_ADMIN_*` / `SEED_USER_*`; `.env` en `.gitignore`; `.env.example` solo placeholders | verificado: `.env` y `apps/api/.env` ignorados por git; seed imprime valores de env (no defaults) | hecho |

## 11. Opcionales elegidos

| ID | Requisito | Código | Verificación | Estado |
|---|---|---|---|---|
| R11.1 | Documentación de API | pendiente crear `infrastructure/http/openapi.ts` y montar Swagger UI en `/api/docs` | abrir Swagger UI | pendiente |
| R11.2 | Contenedorización | `docker-compose.yml` (db, migrate, api, web) + `apps/api/Dockerfile` + `apps/web/Dockerfile` + `.dockerignore` | `docker compose up -d db` healthy, migrate + seed limpios (2 users, 6 tickets, 11 history) | hecho |
| R11.3 | Pruebas automatizadas | Vitest + supertest configurados en `apps/api`; `apps/api/tests/application/` con tests de use cases | `npm test` ejecuta la suite; cobertura de líneas de negocio objetivo 80% | parcial |
| R11.4 | Notificaciones Resend | fuera de alcance para el caso de uso de negocio, pero cableado como puerto (`NotificationService`) + variables en `.env.example` | documentado en `docs/DECISIONS.md` § 5 | hecho (preparado) |

## 12. Entregables

| ID | Requisito | Verificación | Estado |
|---|---|---|---|
| R12.1 | URL del repositorio | remoto `https://github.com/Thesergioandres/pruebatecnicauros.git` | hecho |
| R12.2 | Instrucciones vía README | `README.md` con instalar, env, DB, dev, docker, estructura, decisiones | hecho |
| R12.3 | Código del frontend | `apps/web` con arquitectura limpia (Next 15 + React 19 + Tailwind 4) | parcial (componentes y rutas principales listos; faltantes por enumerar) |
| R12.4 | Código del backend | `apps/api` con dominio + aplicación + infraestructura; falta `main.ts` y router HTTP | parcial |
| R12.5 | Scripts de base de datos | `npm run db:migrate`, `db:seed`, `db:reset` + SQL en `apps/api/src/infrastructure/db/migrations/` | hecho (smoke limpio: contenedor + migrate + seed con 2 users, 6 tickets, 11 history) |
| R12.6 | `.env.example` | raíz con todas las variables documentadas; solo placeholders, sin secretos reales | hecho |
