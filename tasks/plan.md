# Implementation Plan: Sistema de Solicitudes de Soporte Tecnológico

## Overview
App web Full Stack (Next.js monolito, React + Node + TS + Tailwind + PostgreSQL)
para registrar y dar seguimiento a solicitudes internas de soporte. Backend con
arquitectura hexagonal en `src/server/`, frontend con arquitectura limpia en
`src/app/`. DB Postgres vía docker-compose. Validación con Zod en backend
(DTOs/schemas) y en formularios frontend.

## Architecture Decisions
- **Next.js monolito fullstack** (decisión usuario): 1 proyecto, `npm run dev`
  único. API en Route Handlers `src/app/api/*` → delegan a `src/server/`
  (hexagonal: domain / application / infrastructure). UI en `src/app/*`
  (clean: components / hooks / lib).
- **Prisma + PostgreSQL**: schema versionado, migraciones SQL committeadas,
  seed con datos de ejemplo. Docker-compose solo para la DB.
- **Sin auth real** (spec no la pide): `requester` = texto libre en la solicitud;
  `actor` = texto libre en cambios de estado/historial. Documentado como
  supuesto en README.
- **Eliminar = borrado físico** + alternativa Cancelada como borrado lógico
  (spec dice "Eliminar o cancelar": implemento ambas, justificadas).
- **Reglas extra** (permitidas + justificadas en README):
  - En progreso → Cancelada (soporte puede abortar trabajo iniciado).
  - Resuelta → Cancelada NO; Cancelada/Resuelta son terminales (salvo reapertura NO).
  - Título mín 5 / máx 120, descripción mín 10.
- **Tests**: Jest + Testing Library. Cobertura objetivo: 100% máquina de estados
  (dominio puro), tests integración de API con DB de test, 1 smoke e2e con
  playwright-cli (lista → crear → detalle → cambiar estado) si el tiempo da.
- **Swagger/OpenAPI**: opcional del spec; si sobra tiempo, `swagger-ui` mínimo.
  Si no, README documenta endpoints. (Trade-off explícito.)
- **Notificaciones**: fuera de scope (opcional spec). No se implementa; se
  declara en README.

## Task List (index — detalle en tasks/todo.md)
- Phase 0: T0 plan + repo base
- Phase 1: T1 bootstrap + DB + migraciones + seed
- Phase 2: T2 dominio (estados) + T3 crear + T4 listar/buscar/filtrar/ordenar/paginar
- Phase 3: T5 detalle + T6 editar + T7 cambiar estado + T8 historial + T9 eliminar
- Phase 4: T10 UI páginas + T11 verificación + T12 README + merge a main

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| `create-next-app` descarga plantillas lenta | Med | timeout alto, retry 1 vez, fallback manual mínimo |
| Prisma + Postgres en Docker no levanta | High | verificar `docker compose up -d db` antes de codificar; fallback `DATABASE_URL` local |
| Tiempo 3h vs 20+ requisitos | High | slices verticales, cortar opcionales (swagger/notif) primero, nunca recortar spec |
| Puertos ocupados (3000/5432) | Low | `compose ps`, cambiar puerto y documentar en `.env.example` |

## Open Questions (respondidas por usuario 2026-10-05)
- [x] Arquitectura: Next.js monolito fullstack
- [x] DB: Docker Compose con Postgres
- [x] Repo: clonar fresco y pushear (`Thesergioandres/pruebatecnicauros`)
- [ ] Cross-model second opinion (doubt-driven): ¿la querés en alguna decisión
      crítica o skip? (default: skip por tiempo; avisame y la corro)
