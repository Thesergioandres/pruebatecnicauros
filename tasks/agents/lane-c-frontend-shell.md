# Lane C — Frontend shell (Next 15 clean + login + layout)

## Base
Repo: `C:/Users/sergu/OneDrive/Desktop/prueba tecnic`, rama `develop`.
Contrato: `packages/shared/src/*` para validación cliente (zod). Mock data con misma forma DTO.

## Objetivo
Shell Next App Router + arquitectura limpia + login/register + layout Tailwind.
NO lista/form/detalle tickets (eso es lane posterior). Solo cascarón navegable.
Referencia UI (portar estilo, no copiar monolito): `git show origin/develop:src/app --stat`.

## Archivos permitidos (SOLO estos)
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/presentation/**`
- `apps/web/src/application/**` (puertos + casos cliente con mock)
- `apps/web/src/infrastructure/http-client.ts`
- `apps/web/src/infrastructure/container.ts` (único wiring permitido)
- `apps/web/src/domain/**` (tipos cliente puros)
- `apps/web/app/globals.css` o equivalente Tailwind v4

## Prohibido tocar
`apps/api/**`, `packages/shared/**`, `docker-compose.yml`, `docs/**`, `README.md`,
`apps/web/src/app/(tickets)/**` (reservado lane posterior).

## Tareas
1. Layout root con estados carga/error/vacío, `lang="es"`, labels asociados, foco visible.
2. Login/register con validación zod por campo (`loginSchema`, `registerSchema` de shared), errores accesibles (`aria-describedby`), sin `alert/confirm`.
3. `http-client` contra proxy same-origin `/api → API_INTERNAL_URL`, cookie `httpOnly` (nunca `localStorage` para token).
4. Proxy Next rewrites `/api/:path*` según `.env.example`.
5. A11y: keyboard nav, contraste, sin CLS.

## Criterios aceptación
- [ ] `presentation` no importa `infrastructure` salvo `container.ts`.
- [ ] Consola browser limpia.
- [ ] Responsive mobile-first.

## Verificación
```bash
npm run typecheck --workspace @soporte/web
npm run lint -- apps/web/src
npm run build --workspace @soporte/web
playwright-cli open http://localhost:3000/login --headed
playwright-cli snapshot
playwright-cli console
playwright-cli close
```

## Commit
`feat(web): add Next.js clean architecture shell with login` en rama `feat/web-shell`.
