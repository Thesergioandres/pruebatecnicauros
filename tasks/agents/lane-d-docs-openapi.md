# Lane D — Docs + contrato OpenAPI skeleton

## Base
Repo: `C:/Users/sergu/OneDrive/Desktop/prueba tecnic`, rama `develop`.
Contrato: `tasks/plan.md` (tabla API), `packages/shared/src/schemas.ts`.

## Objetivo
Dejar docs y esqueleto OpenAPI listos para que lanes A/B/C integren sin coordinar.
Cero código producto salvo `openapi.ts` esqueleto.

## Archivos permitidos (SOLO estos)
- `docs/DECISIONS.md`
- `README.md`
- `apps/api/src/infrastructure/http/openapi.ts` (esqueleto: paths, schemas, error shape)
- `tasks/todo.md` (solo marcar R6.4, R9, R11.1 como estado doc, sin cerrar código)

## Prohibido tocar
`apps/api/src/domain/**`, `apps/api/src/application/**`, `apps/api/src/infrastructure/db/**`,
`apps/web/src/**`, `packages/shared/**`, `docker-compose.yml`, `Dockerfile*`.

## Tareas
1. `docs/DECISIONS.md`: supuestos (auth necesaria para "usuario responsable", Vue→React/Next por `.md` línea 89, Vitest en vez Jest, terminales estrictas, `EN_PROGRESO→PENDIENTE` permitido, no-op rechazado, no edit en terminales, notificaciones fuera).
2. `README.md`: instalar, env (tabla desde `.env.example`), DB (migrate/seed), dev (`:4000/:3000`), decisiones link, supuestos.
3. `openapi.ts` esqueleto: todos endpoints de `tasks/plan.md` (auth, users, tickets CRUD, status, cancel, history, docs), paginación, error shape `{ error: { code, message, details? } }`, sin handlers.
4. Registrar contradicción PDF vs `.md` y divergencia `origin/develop` monolito vs monorepo actual.

## Criterios aceptación
- [ ] README permite setup limpio sin adivinar.
- [ ] OpenAPI compila (`tsc`) aunque sin implementar rutas.
- [ ] Sin secretos, sin `console.log`.

## Verificación
```bash
npm run typecheck --workspace @soporte/api
npm run lint -- docs README.md apps/api/src/infrastructure/http/openapi.ts
```

## Commit
`docs: document setup, architecture and technical decisions` en rama `docs/contracts`.
