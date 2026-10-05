# Lane B — DB + Infra (Postgres 16, migraciones, seed, docker)

## Base
Repo: `C:/Users/sergu/OneDrive/Desktop/prueba tecnic`, rama `develop`.
Contrato: `packages/shared/src/enums.ts`, `packages/shared/src/types.ts`.

## Objetivo
Esquema SQL + migraciones + seed + compose + Dockerfiles. Sin lógica negocio.
Referencia esquema (portar a `pg` puro, sin Prisma): `git show origin/develop:prisma/schema.prisma`.

## Archivos permitidos (SOLO estos)
- `apps/api/src/infrastructure/db/migrations/*.sql`
- `apps/api/src/infrastructure/db/scripts/migrate.ts`
- `apps/api/src/infrastructure/db/scripts/seed.ts`
- `apps/api/src/infrastructure/db/scripts/reset.ts`
- `apps/api/src/infrastructure/db/*.ts` (solo pool, tipos fila)
- `docker-compose.yml`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`

## Prohibido tocar
`apps/api/src/domain/**`, `apps/api/src/application/**`, `apps/api/src/infrastructure/http/**`,
`apps/web/src/**`, `packages/shared/**`, `docs/**`, `README.md`.

## Tareas
1. Tablas `users`, `tickets`, `ticket_history` con CHECKs (5 categorías, 4 prioridades, 4 estados), FKs, índices (`status`, `priority`, `category`, `requester_id`, `created_at`, trigram `title/description` si disponible).
2. `updated_at` vía trigger o UPDATE explícito documentado.
3. Scripts `migrate/seed/reset` idempotentes con `pg`, leen `DATABASE_URL` de `.env.example`.
4. `docker-compose.yml`: `postgres:16-alpine` puerto `5433`, `api`, `web`. Seed con 2 usuarios (admin/user) + 6 tickets variados.
5. Smoke: `docker compose up -d db && npm run db:migrate --workspace @soporte/api && npm run db:seed --workspace @soporte/api`.

## Criterios aceptación
- [ ] Migraciones corren en BD limpia y son re-ejecutables sin romper.
- [ ] CHECKs rechazan enum inválido.
- [ ] Sin SQL concatenado (solo parametrize `$1`).
- [ ] Secrets solo de entorno.

## Verificación
```bash
docker compose up -d db
npm run db:migrate --workspace @soporte/api
npm run db:seed --workspace @soporte/api
npm run typecheck --workspace @soporte/api
```

## Commit
`feat(api): add PostgreSQL schema, migrations and seed script` en rama `feat/api-db-infra`.
