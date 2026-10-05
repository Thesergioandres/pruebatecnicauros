# syntax=docker/dockerfile:1.7
# ----------------------------------------------------------------------------
# Imagen del frontend Next.js 15 (App Router, arquitectura limpia).
# Sin `output: 'standalone'` en next.config.ts: la imagen incluye node_modules
# de produccion. Es mas pesada, pero funciona sin tocar la configuracion.
# ----------------------------------------------------------------------------

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN npm run build --workspace @soporte/shared
WORKDIR /repo/apps/web
# `next build` produce el paquete del cliente (.next/) que el runner
# servira. NEXT_TELEMETRY_DISABLED=1 evita que Next envie estadisticas
# durante la compilacion.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
# Artefactos necesarios en tiempo de ejecucion:
#   - .next/                paquete compilado (cliente + servidor)
#   - public/               recursos estaticos servidos tal cual
#   - next.config.ts        reescrituras/redirecciones se aplican en
#                           tiempo de ejecucion
#   - postcss.config.mjs    procesamiento CSS si Next lo requiere
COPY --from=builder /repo/packages/shared/dist ./packages/shared/dist
COPY --from=builder /repo/apps/web/.next ./apps/web/.next
COPY --from=builder /repo/apps/web/public ./apps/web/public
COPY --from=builder /repo/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder /repo/apps/web/postcss.config.mjs ./apps/web/postcss.config.mjs
COPY --from=builder /repo/apps/web/tsconfig.json ./apps/web/tsconfig.json

USER node
EXPOSE 3000
WORKDIR /repo/apps/web
CMD ["npx", "next", "start", "--port", "3000"]
