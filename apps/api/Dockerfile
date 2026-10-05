# syntax=docker/dockerfile:1.7
# ----------------------------------------------------------------------------
# Imagen del API REST (Express 5 + pg, arquitectura hexagonal).
# Compilacion en 3 etapas: deps -> builder -> runner (solo prod).
# ----------------------------------------------------------------------------

FROM node:20-alpine AS deps
WORKDIR /repo
# Copiamos solo manifests para que npm resuelva el grafo completo del
# workspace. Sin esto, npm no sabria que @soporte/shared es un enlace
# simbolico del workspace.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /repo
# Reusamos node_modules resuelto en la etapa deps; ahorra re-instalar.
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
# El api depende de los contratos emitidos por shared. tsc no resuelve
# fuentes cruzadas, por lo que hay que compilar shared primero.
RUN npm run build --workspace @soporte/shared
RUN npm run build --workspace @soporte/api
# tsc no copia archivos no-TS. Los archivos .sql de migraciones deben
# quedar junto a los .js compilados para que el script de migracion los
# encuentre (el runner resuelve ../migrations relativo a su URL).
RUN mkdir -p apps/api/dist/infrastructure/db/migrations \
    && cp apps/api/src/infrastructure/db/migrations/*.sql \
          apps/api/dist/infrastructure/db/migrations/

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
# Para npm workspaces los enlaces simbolicos de node_modules/<pkg> -> <pkg>
# se crean leyendo los package.json de cada workspace. Copiarlos vacios
# basta.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
# --omit=dev: sin typescript, vitest, etc. --ignore-scripts: nada de
# scripts de postinstalacion.
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
# Superposicion de los artefactos compilados. Orden importante: primero el
# arbol de node_modules para que los enlaces simbolicos de workspace apunten
# a directorios ya existentes, luego los dist que esos enlaces serviran.
COPY --from=builder /repo/packages/shared/dist ./packages/shared/dist
COPY --from=builder /repo/apps/api/dist ./apps/api/dist

# Usuario no-root: principio de minimo privilegio. La imagen base alpine
# ya incluye el usuario `node` (uid 1000).
USER node
EXPOSE 4000

# Por defecto arranca la API. El servicio `migrate` de docker-compose
# sobreescribe este comando con el script de migraciones.
CMD ["node", "apps/api/dist/main.js"]
