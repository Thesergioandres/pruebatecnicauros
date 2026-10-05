# Solicitudes de soporte tecnológico

App Full Stack para registrar y dar seguimiento a solicitudes internas de
soporte. Monolito **Next.js (React 19 + Node) + TypeScript + Tailwind +
PostgreSQL (Prisma)**. Notificaciones por correo con **Resend**.

Repo: https://github.com/Thesergioandres/pruebatecnicauros

```
src/
  app/
    api/tickets/route.ts                 GET lista · POST crear
    api/tickets/[id]/route.ts            GET detalle · PATCH editar · DELETE borrar
    api/tickets/[id]/transitions/route.ts POST cambiar estado
    tickets/page.tsx                     lista + búsqueda + filtros + orden + paginación
    tickets/new/page.tsx                 crear
    tickets/[id]/page.tsx                detalle + editar + transición + historial + eliminar
  server/                                backend hexagonal
    domain/ticket.ts                     tipos + máquina de estados (puro, sin I/O)
    application/                         casos de uso + schemas Zod + errores tipados
    infrastructure/                      Prisma (repo), Resend (mail), env validado, logger
    composition.ts                       único lugar que conecta puertos y adaptadores
  lib/api.ts                             cliente HTTP tipado del frontend
  components/                            UI limpia (form, badges, diálogo, transición)
prisma/                                  schema + migraciones + seed
```

## Requisitos

- Node 20+ · npm · Docker Desktop (para Postgres) · cuenta Resend (solo para correos reales)

## Puesta en marcha

```bash
git clone https://github.com/Thesergioandres/pruebatecnicauros.git
cd pruebatecnicauros
npm install
cp .env.example .env        # y completa RESEND_API_KEY si quieres correos reales
docker compose up -d db     # Postgres 16 en localhost:5433
npx prisma migrate dev      # crea tablas
npm run db:seed             # 3 tickets de ejemplo
npm run dev                 # http://localhost:3000
```

> Si el puerto 5433 está ocupado: `POSTGRES_PORT=5434 docker compose up -d db`
> y ajusta `DATABASE_URL` en `.env`. Se usa 5433 (no 5432) porque suele estar
> ocupado por un Postgres nativo.

## Variables de entorno (`.env`, nunca se commitea)

| Variable | Ejemplo | Notas |
|---|---|---|
| `DATABASE_URL` | `postgresql://tickets:tickets_dev@localhost:5433/tickets?schema=public` | Requerida |
| `RESEND_API_KEY` | `re_xxx` | Vacía = avisos desactivados (se registran en log, nada falla) |
| `RESEND_FROM` | `onboarding@resend.dev` | En modo prueba Resend solo entrega al dueño de la cuenta |
| `APP_URL` | `http://localhost:3000` | Base para enlaces |

`.env.example` trae los valores de desarrollo (clave vacía a propósito).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` | ESLint + `tsc --noEmit` (ambos en 0) |
| `npm test` / `test:coverage` | Vitest (45 tests, ~95% líneas en dominio+aplicación) |
| `npm run db:migrate` / `db:seed` / `db:studio` | Prisma |

## API

Base `/api/tickets`. Error único: `{ "error": { "code": "...", "message": "..." } }`.

| Método | Ruta | OK | Errores |
|---|---|---|---|
| `POST` | `/api/tickets` | 201 | 422 `VALIDATION_ERROR` |
| `GET` | `/api/tickets?q=&status=&priority=&category=&sort=&order=&page=&pageSize=` | 200 `{data,page,pageSize,total,totalPages}` | 422 filtros inválidos |
| `GET` | `/api/tickets/:id` | 200 ticket + `history` | 404 `NOT_FOUND`, 422 id malformado |
| `PATCH` | `/api/tickets/:id` | 200 | 404, 409 `TERMINAL_STATE`, 422 (`VALIDATION_ERROR`, `IMMUTABLE_FIELD`) |
| `POST` | `/api/tickets/:id/transitions` `{to, actor, observation?}` | 200 `{ticket, history}` | 404, 409 `INVALID_TRANSITION`, 422 `OBSERVATION_REQUIRED` |
| `DELETE` | `/api/tickets/:id` | 204 | 404 |

`sort` ∈ `createdAt|updatedAt|priority|title`, `order` ∈ `asc|desc`,
`pageSize` máx 50. Búsqueda `q` en título+descripción (insensible a mayúsculas).

```bash
curl -X POST localhost:3000/api/tickets -H 'Content-Type: application/json' -d '{
  "title": "Sin acceso al correo", "description": "No entra desde la mañana...",
  "requester": "Sergio", "requesterEmail": "sergio@example.com",
  "category": "Accesos", "priority": "Alta"}'
```

## Reglas de negocio

- `Pendiente → En progreso` · `En progreso → Resuelta` · `Pendiente → Cancelada`
- `Cancelada` y `Resuelta` son terminales (nada sale de ahí).
- Resolver un ticket `Crítica` exige `observation` no vacía.
- **Extra (aporta valor)**: `En progreso → Cancelada` (abortar trabajo iniciado).
  Terminales no se editan (409) y `status` no se cambia por `PATCH` (422).
- Cada transición guarda historial (`anterior, nuevo, fecha/hora, responsable,
  observación`) en la misma transacción que el cambio de estado.

## Notificaciones (Resend)

- Al crear (si hay `requesterEmail`): “solicitud recibida”.
- Al cambiar estado: anterior → nuevo + responsable + observación.
- Sin `RESEND_API_KEY`: degradación elegante (log, el request sigue 200/201).
- Un fallo de envío nunca tumba el request (best-effort, queda en log).

## Supuestos y decisiones

1. **Sin autenticación** (el enunciado no la pide): `requester` y `actor` son
   texto libre. Con auth real, saldrían de la sesión.
2. **`requesterEmail` opcional**: el spec pide “usuario solicitante” sin formato;
   el email solo existe para enviar avisos.
3. **Eliminar = borrado físico + Cancelada como borrado lógico** (el spec pide
   “eliminar o cancelar”: se implementan ambas).
4. **API en español** (`Pendiente`, `En progreso`…); la DB guarda códigos sin
   tildes (`EnProgreso`, `Critica`). Mapeo en `ticketMappers.ts`.
5. **`priorityWeight`** (0–3) desnormalizado para ordenar por prioridad en DB
   con paginación correcta.
6. **Vitest** en vez de Jest (API compatible, permitido: “otra tecnología
   equivalente”; evita la trampa ESM/CJS de `@jest/globals`).
7. Sin Swagger (opcional del spec): la tabla de arriba + `http.ts` son el contrato.

## Verificación

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Smoke browser (lista → crear → detalle → transición, consola sin errores)
verificado con `playwright-cli`.
