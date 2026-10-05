# Plan de implementación — Soporte Técnico (Tickets)

Contrato: `pruebatecnica.md` + `Prueba Técnica — Desarrollador Full Stack Junior.pdf`.
Trazabilidad requisito → código → test: `tasks/todo.md`.

## Decisiones tomadas con el usuario

| Tema | Decisión |
|---|---|
| Frontend | Next 15 (App Router) + arquitectura limpia por capas dentro de `src/` |
| Backend | Express 5 + TypeScript, arquitectura hexagonal |
| Layout | npm workspaces (`apps/api`, `apps/web`, `packages/shared`) |
| Base de datos | PostgreSQL 16 en Docker Compose |
| Identidad | Login completo (registro + login + sesión) para que el historial tenga "usuario responsable" real |
| Eliminar | Cancelar (transición de estado, auditada) + soft delete exclusivo de admin |
| Opcionales | Swagger/OpenAPI + Docker + tests automatizados. Notificaciones: fuera |
| Git | Ramas `main` + `develop`, ≥5 commits, ≥1 merge `develop → main` |

## Estructura

```
.
├── apps/
│   ├── api/                       Express 5 · hexagonal
│   │   └── src/
│   │       ├── domain/            Entidades, política de transiciones, puertos. Sin Express ni pg.
│   │       ├── application/       Casos de uso. Depende solo de domain.
│   │       └── infrastructure/    Express, pg, migraciones, repositorios, auth, OpenAPI
│   └── web/                       Next 15 · arquitectura limpia
│       └── src/
│           ├── app/               Rutas (capa de presentación)
│           ├── domain/            Entidades y reglas puras del cliente
│           ├── application/       Casos de uso del cliente + puertos de datos
│           ├── infrastructure/    Cliente HTTP, repositorios, wiring de dependencias
│           └── presentation/      Componentes, formularios, vistas
├── packages/shared/               Contratos: enums, tipos DTO, máquina de estados, schemas zod
├── docs/DECISIONS.md              Supuestos y decisiones técnicas justificadas
├── docker-compose.yml             postgres + api + web
└── .env.example
```

Regla de dependencias: `domain` no importa nada del framework. `application` depende de `domain`.
`infrastructure` implementa los puertos de `application`. `presentation` depende de `application`,
nunca de `infrastructure` salvo en el composition root (`infrastructure/container.ts`), que es el
único lugar donde se arma el grafo de objetos.

## Modelo de datos

`users` — id, name, email (único), password_hash, role (`ADMIN` | `USER`), created_at.
`tickets` — id, title, description, category, priority, status, requester_id → users,
assigned_to → users (nullable), created_at, updated_at, resolved_at, deleted_at.
`ticket_history` — id, ticket_id, previous_status, new_status, changed_by → users,
observation, created_at.

## Máquina de estados

Transiciones permitidas (tabla única en `packages/shared/src/state-machine.ts`):

| Desde | Hacia |
|---|---|
| PENDIENTE | EN_PROGRESO, CANCELADA |
| EN_PROGRESO | PENDIENTE, RESUELTA, CANCELADA |
| RESUELTA | — (terminal) |
| CANCELADA | — (terminal) |

Regla adicional del spec: `CRITICA → RESUELTA` exige observación no vacía.
Reglas adicionales propias, justificadas en `docs/DECISIONS.md`:
- Mismo estado a mismo estado se rechaza (no-op silencioso genera historial ruido).
- `EN_PROGRESO → PENDIENTE` (retroceso por triage erróneo).
- `RESUELTA` y `CANCELADA` son terminales: el spec lo exige explícitamente.
- No se puede editar una solicitud `RESUELTA` ni `CANCELADA`.

## API REST

Base `/api`. Errores con una única forma: `{ error: { code, message, details? } }`.
Todos los endpoints de lectura/escritura exigen sesión válida.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Alta de usuario |
| POST | `/api/auth/login` | Login, emite cookie de sesión `httpOnly` |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/auth/me` | Usuario de la sesión |
| GET | `/api/users` | Listado de usuarios (para selector de solicitante/responsable) |
| GET | `/api/tickets` | Lista con `search`, `status`, `priority`, `category`, `sort`, `order`, `page`, `pageSize`, `includeDeleted` |
| POST | `/api/tickets` | Crear |
| GET | `/api/tickets/:id` | Detalle |
| PATCH | `/api/tickets/:id` | Editar campos |
| PATCH | `/api/tickets/:id/status` | Transición de estado (escribe historial) |
| POST | `/api/tickets/:id/cancel` | Atajo de cancelación con observación |
| DELETE | `/api/tickets/:id` | Soft delete, solo `ADMIN` |
| GET | `/api/tickets/:id/history` | Historial paginado |
| GET | `/api/docs` | Swagger UI |
| GET | `/api/openapi.json` | Contrato OpenAPI |

## Verificación

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run dev            # api :4000, web :3000
```

Flujos verificados en navegador real (a11y tree + consola sin errores) al cierre.

## Orden de commits en `develop`

1. `chore: scaffold monorepo with npm workspaces and tooling`
2. `feat(shared): add ticket domain contracts and status state machine`
3. `feat(api): add pure ticket domain with transition policy`
4. `feat(api): add PostgreSQL schema, migrations and seed script`
5. `feat(api): add ticket repositories and use cases`
6. `feat(api): expose HTTP API with validation and session auth`
7. `feat(api): serve OpenAPI documentation with Swagger UI`
8. `test: cover status transitions, validations and HTTP endpoints`
9. `feat(web): add Next.js clean architecture shell with login`
10. `feat(web): add ticket list with search, filters, sorting and pagination`
11. `feat(web): add ticket form, detail view and change history`
12. `chore: containerize api, web and postgres`
13. `docs: document setup, architecture and technical decisions`
14. `chore(release): merge develop into main`

## Open Questions

Resueltas con el usuario antes de empezar. Supuestos restantes que se documentan en
`docs/DECISIONS.md` (no bloquean, pero quedan explicitados para el revisor):

- **Vue 3 vs React/Next**: la sección 5 del PDF *recomienda* Vue 3, pero `pruebatecnica.md`
  línea 89 fija `react, node, next, tailwind, typescript, postgresql`. Se sigue el `.md`
  (es la versión anotada del enunciado) y se documenta la contradicción.
- **"Usuario responsable"**: el spec no pide auth, pero exige auditar quién hace cada cambio.
  Se resuelve con login completo; es el supuesto de mayor alcance y queda justificado.
- **Tests**: el spec recomienda Jest y admite "tecnología equivalente". Se usa Vitest
  (ESM + TypeScript nativo, sin transformaciones extra) y se documenta.
- **OpenAPI**: escrito a mano en `src/infrastructure/http/openapi.ts` en vez de generado por
  decoradores, para que el contrato viva en un archivo auditable y no se disperse en el código.
