# Soporte Tecnico

Aplicacion completa para gestion de solicitudes internas de soporte
tecnico. Backend Express 5 + PostgreSQL 16 con arquitectura hexagonal;
frontend Next.js 15 con arquitectura limpia. Contratos compartidos en
`packages/shared` (zod + tipos).

> Detalles de arquitectura, decisiones y supuestos:
> [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## Requisitos

- **Node.js 20.11+** (LTS) y npm 10+.
- **Docker Desktop** (o Docker Engine + compose v2) para PostgreSQL y,
  opcionalmente, para correr la pila completa en contenedores.
- **PostgreSQL 16** (opcional si usas Docker).

## 1. Instalar dependencias

```bash
npm install
```

Esto resuelve los workspaces de npm (`packages/shared`, `apps/api`,
`apps/web`) y deja `node_modules` solo en la raiz.

## 2. Configurar variables de entorno

> **Los archivos `.env` con secretos reales NO se generan a partir de
> `.env.example`**. El dueno del repositorio entrega los archivos
> `.env` (raiz y `apps/api/`) por un canal separado, fuera de git.
> Si no los tienes, pidelos al dueno: no los crees tu copiando
> `.env.example`.

`.env.example` es la **plantilla publica** del esquema: documenta que
variables existen y con que proposito, pero solo contiene marcadores
(`cambia-esta-clave-semilla`, `RESEND_API_KEY=` vacio, etc.). Nunca
debe llevar secretos reales.

El archivo `.env` (raiz) y `apps/api/.env` los entrega el dueno con
los valores reales. Ambos estan en `.gitignore` y jamas se suben al
repositorio.

Si necesitas ejecutar los scripts CLI (`db:migrate`, `db:seed`) sin
disponer del `.env` del dueno, puedes pasar las variables en linea:

```bash
DATABASE_URL=postgresql://tickets:tickets_dev@localhost:5433/tickets \
  npm run db:migrate --workspace @soporte/api
```

> Ver seccion 7 de [`docs/DECISIONS.md`](docs/DECISIONS.md) para el
> detalle del bug del cargador de rutas y por que el dueno entrega
> tambien un `.env` en `apps/api/`.

### Variables clave

| Variable | Proposito | Notas |
|---|---|---|
| `DATABASE_URL` | Cadena de conexion PostgreSQL | `localhost:5433` en dev |
| `DATABASE_POOL_MAX` | Tamano maximo del pool de conexiones | `10` por defecto |
| `API_PORT` | Puerto del API | `4000` |
| `JWT_SECRET` | Firma de la cookie de sesion (min 32 caracteres) | obligatorio en produccion |
| `SESSION_COOKIE_NAME` | Nombre de la cookie httpOnly | `soporte_session` |
| `SESSION_TTL_HOURS` | Duracion de la sesion | `8` |
| `CORS_ORIGIN` | Origen permitido por CORS | `http://localhost:3000` en dev |
| `WEB_PORT` | Puerto del frontend | `3000` |
| `API_INTERNAL_URL` | URL del API vista por el servidor de Next | `http://localhost:4000` |
| `RESEND_API_KEY` | Clave de API de Resend para correos transaccionales | vacia = notificaciones deshabilitadas |
| `NOTIFY_FROM_EMAIL` | Direccion del remitente de los correos | debe estar verificada en Resend |
| `SEED_ADMIN_EMAIL` | Email del primer administrador (solo seed) | solo desarrollo |
| `SEED_ADMIN_PASSWORD` | Contrasena inicial del administrador (solo seed) | solo desarrollo |
| `SEED_USER_EMAIL` | Email del usuario cliente (solo seed) | solo desarrollo |
| `SEED_USER_PASSWORD` | Contrasena del usuario cliente (solo seed) | solo desarrollo |

> En produccion el dueno del repositorio entrega los archivos `.env`
> con valores reales: `JWT_SECRET` aleatorio de al menos 32 caracteres,
> credenciales de la BD rotadas, y `RESEND_API_KEY` /
> `NOTIFY_FROM_EMAIL` apuntando al servicio de Resend de produccion.
> Las variables `SEED_*` no se usan fuera del script de seed.

## 3. Levantar la base de datos

Con Docker (recomendado):

```bash
docker compose up -d db
```

Esto arranca `postgres:16-alpine` en el puerto del anfitrion `5433`
(mapeo a `5432` interno). La primera vez tarda unos segundos en estar
`healthy`. Verifica con:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

El nombre del contenedor es `soporte-db`.

Sin Docker, instala PostgreSQL 16 localmente, crea el rol y la base de
datos:

```sql
CREATE USER tickets WITH PASSWORD 'tickets_dev';
CREATE DATABASE tickets OWNER tickets;
GRANT ALL PRIVILEGES ON DATABASE tickets TO tickets;
```

Y ajusta `DATABASE_URL` en `.env` apuntando a `localhost:5432`.

## 4. Aplicar migraciones y seed

Migraciones (idempotente; se puede re-ejecutar sin romper):

```bash
npm run db:migrate --workspace @soporte/api
```

Seed de desarrollo (2 usuarios, 6 tickets variados, 11 entradas de
historial). Re-ejecutable, no duplica datos. Las credenciales que crea
se leen de `SEED_ADMIN_*` y `SEED_USER_*` en `.env`:

```bash
npm run db:seed --workspace @soporte/api
```

Para resetear todo a estado limpio (borra tablas, re-migra y
re-siembra):

```bash
npm run db:reset --workspace @soporte/api
```

> Las credenciales del seed **nunca se documentan en el repositorio**.
> Quedan en el `.env` que entrega el dueno por fuera de git. Si no las
> recuerdas, consulta los valores de `SEED_ADMIN_EMAIL` /
> `SEED_ADMIN_PASSWORD` y `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` en
> ese archivo.

## 5. Autenticacion y paneles

Hay **un solo inicio de sesion** para toda la aplicacion. El mismo
formulario y el mismo punto de acceso (`POST /api/auth/login`) aceptan
tanto usuarios con rol `ADMIN` como `USER`. Tras autenticarse, la API
emite una cookie httpOnly firmada con JWT.

El frontend consulta `GET /api/auth/me` y enruta segun el rol:

| Rol | Destino | Capacidades |
|---|---|---|
| `ADMIN` | `/admin` | Gestion completa: tickets, asignacion, cambio de estado, cancelacion, borrado logico, listado de usuarios |
| `USER` (cliente) | `/tickets` | Crear tickets propios, ver los suyos, comentar, cancelar los propios |

La autorizacion se vuelve a verificar en cada operacion protegida: un
cliente que intenta una operacion de admin recibe `403 Prohibido`. El
frontend nunca confia solo en la cookie: cada llamada sensible va al
backend y el backend revalida el rol.

> Ver seccion 4 de [`docs/DECISIONS.md`](docs/DECISIONS.md) para el
> detalle de la politica de autenticacion y autorizacion.

## 6. Notificaciones por correo (Resend)

El sistema envia correos transaccionales (asignacion, cambio de
estado, cancelacion) usando [Resend](https://resend.com). La clave de
API vive solo en el backend y solo en `.env` (nunca en
`.env.example`).

- `RESEND_API_KEY`: clave de la API de Resend. Si esta vacia, el
  servicio queda deshabilitado: la API registra el intento en logs y
  la operacion principal sigue su curso sin enviar correo.
- `NOTIFY_FROM_EMAIL`: direccion del remitente, debe estar verificada
  en el panel de Resend antes de usarse.

Las plantillas de correo viven como funciones puras dentro del modulo
de notificaciones, testeables de forma aislada. El adaptador
`ResendNotificationService` se inyecta en los casos de uso que lo
requieran.

> Ver seccion 5 de [`docs/DECISIONS.md`](docs/DECISIONS.md) para el
> detalle de la integracion.

## 7. Ejecutar en modo desarrollo

```bash
npm run dev
```

Esto arranca API y web en paralelo (concurrently):

- API: <http://localhost:4000>
- Web: <http://localhost:3000>

El navegador nunca habla directo con la API en `4000`: todo pasa por
el proxy de mismo origen que define `apps/web/next.config.ts`
(`/api/*` -> `API_INTERNAL_URL/api/*`).

Para arrancar solo una parte:

```bash
npm run dev:api   # solo Express + tsx watch
npm run dev:web   # solo Next.js dev server
```

## 8. Ejecutar la pila completa en Docker

```bash
docker compose up --build
```

Servicios:

| Servicio | Puerto del anfitrion | Descripcion |
|---|---|---|
| `db` | `5433` | PostgreSQL 16 (datos en volumen `soporte-pgdata`) |
| `migrate` | - | De un solo arranque: corre `db:migrate` y termina. La API espera a que termine correctamente. |
| `api` | `4000` | API REST |
| `web` | `3000` | Frontend Next.js |

El servicio `migrate` es idempotente: si ya esta aplicado, no hace
nada y la API arranca igual.

Para parar y limpiar:

```bash
docker compose down            # detiene contenedores, conserva volumen
docker compose down -v         # tambien borra el volumen (datos perdidos)
```

## 9. Pruebas y verificacion

```bash
npm test                       # Vitest en apps/api
npm run typecheck              # tsc --noEmit en todos los workspaces
npm run lint                   # eslint
```

## 10. Estructura del repositorio

```
.
├── apps/
│   ├── api/                   Backend Express 5 (hexagonal)
│   │   ├── src/
│   │   │   ├── domain/        Entidades y reglas de negocio puras
│   │   │   ├── application/   Casos de uso + puertos
│   │   │   └── infrastructure/
│   │   │       ├── auth/      Adaptadores de autenticacion
│   │   │       ├── db/        Pool pg, migraciones SQL, scripts CLI
│   │   │       ├── http/      Express, middlewares, rutas
│   │   │       └── notifications/  Adaptador Resend y plantillas
│   │   └── tests/             Vitest + supertest
│   └── web/                   Frontend Next.js 15 (limpia)
│       └── src/
│           ├── domain/        Tipos y reglas de UI
│           ├── application/   Ganchos y casos de uso de UI
│           ├── infrastructure/ Clientes HTTP, adaptadores
│           └── presentation/  Componentes, paginas
├── packages/
│   └── shared/                Enums, tipos, esquemas zod, maquina de estados
├── docs/
│   └── DECISIONS.md           Decisiones y supuestos
├── tasks/
│   └── todo.md                Trazabilidad requisito -> codigo
├── docker-compose.yml
├── apps/api/Dockerfile
├── apps/web/Dockerfile
├── .env.example
└── README.md
```

## 11. Decisiones tecnicas

Todas las decisiones de arquitectura (pila tecnologica, esquema,
autenticacion, notificaciones, dockerizacion, soluciones alternativas)
estan justificadas en [`docs/DECISIONS.md`](docs/DECISIONS.md). Ahi se
documentan tambien los supuestos y los puntos que se dejaron fuera del
alcance.
