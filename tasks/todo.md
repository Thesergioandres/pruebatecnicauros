# Task List — trazabilidad spec → código → test

Formato por tarea: descripción, criterios, verificación, dependencias, archivos.
Cada código REQ-* viene del enunciado (`pruebatecnica.md`).

## T0 — Plan + base repo ✅
**Descripción:** Plan, tareas, ramas `develop`, AGENTS.md copiado.
**Criterios:** `tasks/plan.md` + `tasks/todo.md` existen; rama `develop` activa.
**Verificación:** `git branch --show-current` → `develop`.
**Dependencias:** ninguna.

## T1 — Bootstrap + DB + migraciones + seed
**Descripción:** Next.js + TS + Tailwind + Prisma + pg. `compose.yaml` (db),
`.env.example`, migración inicial (`Ticket` + `StatusHistory`), seed.
**Criterios:**
- [ ] REQ-STACK: react, node, next, tailwind, typescript, postgresql
- [ ] REQ-ARCH: backend hexagonal (`src/server/{domain,application,infrastructure}`),
      frontend limpio (`src/app`, componentes/hooks)
- [ ] REQ-DB: scripts/migraciones committeados; `.env.example` presente
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` en verde
**Verificación:** `docker compose up -d db && npx prisma migrate dev && npm test`
**Dependencias:** T0. **Archivos:** `package.json`, `compose.yaml`, `prisma/*`,
`src/server/*`, `.env.example`.

## T2 — Dominio: máquina de estados + validaciones (TDD)
**Requisitos:** REQ-R1..R6 (transiciones), REQ-CRIT (observación crítica),
REQ-VAL (campos/tipos/valores permitidos).
**Criterios:**
- [ ] REQ-R1: Pendiente → En progreso OK
- [ ] REQ-R2: En progreso → Resuelta OK
- [ ] REQ-R3: Pendiente → Cancelada OK
- [ ] REQ-R4: Cancelada ↛ En progreso (error tipado `INVALID_TRANSITION`)
- [ ] REQ-R5: Resuelta ↛ En progreso (error tipado)
- [ ] REQ-R6: resolver ticket Crítica sin observación → error `OBSERVATION_REQUIRED`
- [ ] EXTRA (justificada README): En progreso → Cancelada OK; terminales no salen
- [ ] Tests RED→GREEN: cada regla con test que falló antes del código
**Verificación:** `npm test -- transitions` (todos verdes, 0 skipped).
**Dependencias:** T1. **Archivos:** `src/server/domain/*`, `tests/domain/*`.

## T3 — Crear solicitud (vertical slice)
**Requisitos:** REQ-F1 (crear); campos REQ-D1..D8 (título, descripción,
solicitante, categoría, prioridad, estado inicial=Pendiente, createdAt/updatedAt).
**Criterios:**
- [ ] `POST /api/tickets` valida con Zod: obligatorios, tipos, enums
      (categoría: Hardware|Software|Red|Accesos|Otros; prioridad:
      Baja|Media|Alta|Crítica), 400/422 con forma de error única
- [ ] Estado inicial siempre Pendiente (aunque manden otro → 422)
- [ ] UI: formulario con labels, errores accesibles, estados carga/error
- [ ] Test integración API + test dominio
**Verificación:** `npm test` + crear desde UI verificado con playwright-cli.
**Dependencias:** T2. **Archivos:** `src/app/api/tickets/route.ts`,
`src/server/application/*`, `src/server/infrastructure/*`, `src/app/tickets/new/*`.

## T4 — Listar + buscar + filtrar + ordenar + paginar
**Requisitos:** REQ-F2 (consultar), REQ-F8 (buscar), REQ-F9 (filtros estado/
prioridad/categoría), REQ-F10 (ordenar), REQ-F11 (paginar).
**Criterios:**
- [ ] `GET /api/tickets?q=&status=&priority=&category=&sort=&order=&page=&pageSize=`
      paginado desde el inicio (`{data, page, pageSize, total, totalPages}`)
- [ ] `q` busca en título+descripción (case-insensitive)
- [ ] `sort` ∈ {createdAt, updatedAt, priority, title}; `order` ∈ {asc,desc};
      valores inválidos → 422
- [ ] UI: lista con búsqueda, 3 filtros, orden, paginación, estados vacío/error
- [ ] Tests integración (filtros combinados, paginación, orden)
**Verificación:** `npm test` + snapshot playwright sin errores consola.
**Dependencias:** T3.

## T5 — Detalle de solicitud
**Requisitos:** REQ-F3 (detalle).
**Criterios:**
- [ ] `GET /api/tickets/:id` → 200 con ticket + historial; id inexistente → 404
      forma única; id malformado → 400
- [ ] UI página detalle con todos los campos + historial visible
- [ ] Tests integración 200/404/400
**Verificación:** `npm test` + playwright detalle.
**Dependencias:** T3.

## T6 — Editar solicitud
**Requisitos:** REQ-F4 (editar).
**Criterios:**
- [ ] `PATCH /api/tickets/:id` parcial y aditivo; no permite cambiar `status`
      por aquí (solo vía transición → 422 con código), ni `createdAt`
- [ ] Terminales (Resuelta/Cancelada) no editables → 409
- [ ] UI formulario edición con validación; tests integración
**Verificación:** `npm test` + playwright editar.
**Dependencias:** T5.

## T7 — Cambiar estado
**Requisitos:** REQ-F5 + REQ-R1..R6 + REQ-CRIT.
**Criterios:**
- [ ] `POST /api/tickets/:id/transitions {to, actor, observation?}` aplica
      máquina de estados T2; errores tipados (400/409/422 según caso)
- [ ] Crítica → Resuelta exige `observation` no vacía
- [ ] Cada cambio crea entrada de historial (REQ-H1..H5) en la misma transacción
- [ ] UI control de cambio estado con observación; tests integración
**Verificación:** `npm test` + playwright transición Pendiente→En progreso→Resuelta.
**Dependencia
...[truncated 1580 chars]