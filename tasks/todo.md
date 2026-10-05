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
**Dependencias:** T5, T2. **Archivos:** `src/app/api/tickets/[id]/transitions/route.ts`, UI detalle.

## T8 — Historial de cambios
**Requisitos:** REQ-F7 + REQ-H1..H5 (anterior, nuevo, fecha/hora, responsable, observación).
**Criterios:**
- [ ] Cada transición inserta fila `StatusHistory` en la misma transacción DB
- [ ] `GET /api/tickets/:id` incluye `history` ordenado ascendente
- [ ] UI muestra timeline con los 5 campos
- [ ] Tests integración: historial crece 1 por transición, orden correcto
**Verificación:** `npm test`.
**Dependencias:** T7. **Archivos:** repositorio Prisma, UI detalle.

## T9 — Eliminar o cancelar
**Requisitos:** REQ-F6 (eliminar o cancelar).
**Criterios:**
- [ ] `DELETE /api/tickets/:id` borrado físico → 204; inexistente → 404
- [ ] UI botón eliminar con confirmación (sin `confirm()` nativo; diálogo propio)
- [ ] Cancelada disponible como borrado lógico vía transición (T7)
- [ ] Tests integración 204/404
**Verificación:** `npm test` + playwright eliminar.
**Dependencias:** T5. **Archivos:** `src/app/api/tickets/[id]/route.ts`, UI.

## T10 — UI: páginas + estados + a11y
**Requisitos:** REQ-UI (formularios validados, carga/error/vacío, responsive, labels).
**Criterios:**
- [ ] `/tickets` lista + `/tickets/new` crear + `/tickets/:id` detalle/editar/estado
- [ ] Validación frontend espeja backend (requeridos, emails, enums, longitudes)
- [ ] Keyboard nav, contraste, `alt`/`width`/`height` donde aplique
- [ ] playwright-cli: snapshot + `console` sin errores en los 3 flujos
**Verificación:** `npm run build` + smoke browser.
**Dependencias:** T3–T9.

## T11 — Verificación + commits + push
**Requisitos:** REQ-GIT (≥5 commits en develop, historia limpia).
**Criterios:**
- [ ] `npm run lint` 0, `npx tsc --noEmit` 0, `npm test` 0 skipped, `npm run build` 0
- [ ] Cobertura dominio 100%, crítico ≥80%
- [ ] Commits Conventional Commits, 1 por slice; push develop al remoto
**Verificación:** comandos + `git log --oneline`.
**Dependencias:** T10.

## T12 — README + decisiones + merge a main
**Requisitos:** REQ-DOC (instalar, env, DB, correr front/back, decisiones, supuestos).
**Criterios:**
- [ ] README: setup, `.env`, migraciones, seed, scripts, endpoints, decisiones,
      supuestos (sin auth, requesterEmail opcional, Resend test-mode), trade-offs
- [ ] Merge develop → main (1 merge commit), push main
- [ ] Checklist compliance spec línea por línea en la entrega
**Verificación:** `git log --oneline --graph` muestra merge a main.
**Dependencias:** T11.

## T13 — Notificaciones por email con Resend (EN SCOPE, pedido usuario)
**Requisitos:** REQ-OPT4 (notificación en eventos, vía email).
**Criterios:**
- [ ] Al crear ticket (con `requesterEmail`): email "solicitud recibida"
- [ ] Al cambiar estado: email con anterior → nuevo + observación + actor
- [ ] Sin `RESEND_API_KEY`: degradación graceful (log, no cae el request)
- [ ] Clave SOLO en `.env` local; `.env.example` con placeholder vacío
- [ ] Tests: payload del email (mock Resend), skip-send sin clave
**Verificación:** `npm test` + envío real opcional con clave del usuario.
**Dependencias:** T3, T7. **Archivos:** `src/server/infrastructure/mail/*`.
...[truncated 1580 chars]