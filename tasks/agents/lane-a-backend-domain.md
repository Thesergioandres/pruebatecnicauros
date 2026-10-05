# Lane A — Backend Domain puro (hexagonal `domain/`)

## Base
Repo: `C:/Users/sergu/OneDrive/Desktop/prueba tecnic`, rama `develop`.
Contrato: `packages/shared/src/*` (enums, state-machine, schemas, types). No reinventar.

## Objetivo
Entidades puras + política transiciones + errores tipados. Cero imports Express/pg/zod-interno.
Referencia lógica (portar, no copiar): `git show origin/develop:src/server/domain/ticket.ts`.

## Archivos permitidos (SOLO estos)
- `apps/api/src/domain/ticket.ts`
- `apps/api/src/domain/ticket-policy.ts`
- `apps/api/src/domain/errors.ts`
- `apps/api/src/domain/ports.ts`
- `apps/api/tests/domain/*.test.ts`

## Prohibido tocar
`apps/web/**`, `apps/api/src/infrastructure/**`, `apps/api/src/application/**`,
`docker-compose.yml`, `Dockerfile*`, `docs/**`, `README.md`, `packages/shared/**`.

## Tareas
1. RED: tests política (`PENDIENTE→EN_PROGRESO/CANCELADA`, `EN_PROGRESO→PENDIENTE/RESUELTA/CANCELADA`, terminales rechazan, mismo-estado rechaza, crítica→resuelta exige observación).
2. GREEN: entidades + `canTransition/validateTransition` delegando en `packages/shared` + regla observación.
3. REFACTOR: errores tipados `{ code }`, sin strings sueltos.

## Criterios aceptación
- [ ] `domain/` sin imports `express`, `pg`, `next`, `prisma`.
- [ ] 100% ramas política cubiertas.
- [ ] Sin `any`, sin `console.log`.

## Verificación
```bash
npm run typecheck --workspace @soporte/api
npm run test --workspace @soporte/api -- tests/domain
npm run lint -- apps/api/src/domain
```

## Commit
`feat(api): add pure ticket domain with transition policy` en rama `feat/api-domain`.
