# Sustentación — Sistema de Solicitudes de Soporte (IT MANAGEMENT)

## 1. Qué construí (30 segundos)
Aplicación web Full Stack para gestionar solicitudes internas de soporte:
el **cliente** crea y sigue sus tickets; el **admin** gestiona todos los
tickets y crea usuarios. Cada cambio de estado queda en un historial
auditado y cada ticket nuevo avisa por correo con Resend.

## 2. Demostración (flujo feliz)
1. Entro a `http://localhost:3000/login` como cliente
   (`clienteitmanagement@gmail.com`) y creo un ticket
   (título, descripción, categoría, prioridad).
2. Llega un correo a `serguito2003@gmail.com` con toda la información.
3. Entro como admin (`adminitmanagement@gmail.com`), veo el ticket en
   “Todas las solicitudes”, lo paso a `EN_PROGRESO` y luego a `RESUELTA`
   con observación (obligatoria por ser prioridad crítica si aplica).
4. El historial muestra: estado anterior, estado nuevo, fecha/hora,
   responsable y observación.

## 3. Stack y arquitectura
- **Monorepo npm workspaces**: `apps/api`, `apps/web`, `packages/shared`.
- **Backend** (Express 5 + TypeScript, arquitectura hexagonal):
  `domain` (entidades y política de transiciones, sin framework) →
  `application` (casos de uso con inyección por constructor) →
  `infrastructure` (Express, `pg`, migraciones SQL, auth por cookie,
  Resend, OpenAPI). Las dependencias apuntan hacia adentro.
- **Frontend** (Next 15 App Router, arquitectura limpia): `domain`,
  `application`, `infrastructure` (cliente HTTP + contenedor) y
  `presentation` (componentes y rutas). Proxy same-origin `/api` para
  que la cookie de sesión sea `httpOnly`.
- **Contrato compartido** en `packages/shared`: enums, tipos DTO,
  máquina de estados y esquemas zod que usan ambos lados.
- **Base de datos** PostgreSQL 16 en Docker: `users`, `tickets`,
  `ticket_history` con CHECKs, FKs e índices.

## 3b. Por qué hexagonal en backend y limpia en frontend

**Hexagonal (backend):** la lógica que decide si un ticket puede cambiar
de estado vive en `domain`, que no importa Express, `pg` ni zod. Eso
permite probar las 6 reglas de negocio en milisegundos sin base de datos
ni HTTP (46 tests puros). Si mañana se cambia Express por Fastify o
PostgreSQL por otro motor, el dominio no se toca: solo se reescriben
los adaptadores de `infrastructure`. Los casos de uso reciben sus
dependencias por constructor, así que en tests se pasan repositorios
falsos en memoria.

**Limpia (frontend):** `presentation` (lo que se ve) depende de
`application` (casos de uso del cliente) y nunca de `infrastructure`
(HTTP, contenedor), salvo en el punto único de cableado
(`container.ts`). Eso permitió desarrollar toda la UI con datos de
prueba y luego conectar la API real sin reescribir pantallas, y probar
los flujos sin navegador.

**En una frase para el jurado:** las decisiones que cambian poco
(reglas del negocio) están aisladas de lo que cambia mucho (frameworks,
base de datos, UI), por eso el proyecto se prueba rápido y se mantiene
barato.

## 4. Reglas de negocio (la parte que más evalúan)
- `PENDIENTE → EN_PROGRESO` o `CANCELADA`.
- `EN_PROGRESO → PENDIENTE`, `RESUELTA` o `CANCELADA`.
- `RESUELTA` y `CANCELADA` son terminales: sin retorno.
- Pasar dos veces al mismo estado se rechaza (evita historial ruido).
- Resolver una prioridad **CRÍTICA** exige observación no vacía.
- No se edita un ticket `RESUELTA` ni `CANCELADA`.
- Cliente opera solo sus tickets; admin opera todo (autorización por rol
  en cada endpoint, no asumida).

## 5. Autenticación y roles (decisión propia, justificada)
- El enunciado exige auditar el “usuario responsable” de cada cambio,
  así que implementé **login real** con sesión en cookie `httpOnly`.
- **Sin registro público**: solo existe el login. Un admin sembrado
  (`SEED_ADMIN_EMAIL/PASSWORD` en `.env`) crea admins o clientes.
- Dos paneles: cliente (sus tickets) y admin (todos + usuarios).

## 6. Validaciones
- Frontend: zod por campo, errores accesibles por campo.
- Backend: esquemas en el borde (rutas), forma única de error
  `{ error: { code, message, details? } }`, códigos 400/401/403/404/
  409/422/500 con su significado.

## 7. Notificaciones (opcional elegido)
- Email con **Resend** al crear ticket (a `NOTIFY_NEW_TICKET_TO`) y en
  cambios de estado. Envío no bloqueante: si Resend falla, queda en log
  y la operación sigue verde.
- Claves solo en `.env` (ignorado por git); `.env.example` con
  placeholders. Remitente de prueba `onboarding@resend.dev` porque el
  dominio propio no está verificado en Resend.

## 8. Decisiones y supuestos clave
- El PDF sugería Vue y el `.md` fijaba React/Next: seguí el `.md`
  (versión anotada) y lo dejé documentado.
- Tests con **Vitest** en vez de Jest (el enunciado admite equivalente).
- Borrado lógico (soft delete) solo admin + cancelación como transición
  auditada.
- Contradicción resuelta: notificaciones primero marcadas “fuera” y
  luego pedidas por el dueño con Resend → implementadas.

## 9. Cómo correrlo
```bash
docker compose up -d db
npm install
npm run db:migrate --workspace @soporte/api
npm run db:seed --workspace @soporte/api
npm run dev          # api :4000, web :3000
```
Variables en `.env` (ver `.env.example`): `DATABASE_URL`, `JWT_SECRET`,
`RESEND_API_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`,
`NOTIFY_NEW_TICKET_TO`.

## 10. Verificación
- `npm run test --workspace @soporte/api` → 128/128 (dominio, casos de
  uso, HTTP).
- `npm run typecheck`, `npm run lint`, `npm run build` en verde.
- Flujos probados en navegador real con consola limpia: login por rol,
  crear ticket, filtros, detalle, cambio de estado, historial y gestión
  de usuarios.
- Git: trabajo en `develop` (≥5 commits), merge a `main` solo al verde.

## 11. Si preguntan “¿qué mejorarías con más tiempo?”
- Paginación del historial en UI, adjuntos a tickets, recordatorios SLA
  por correo y auditoría de logins. Nada de eso recorta el alcance
  pedido: todo lo del enunciado está implementado.
