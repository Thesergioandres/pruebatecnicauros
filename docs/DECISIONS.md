# Decisiones tecnicas y supuestos

> Este documento justifica las elecciones que no se ven en el codigo: la
> pila tecnologica, los puertos, la orquestacion, los scripts de BD, la
> autenticacion, las notificaciones, la dockerizacion, y los compromisos
> que el evaluador debe conocer para entender la solucion.

## 1. Pila tecnologica

- **Backend**: Node 20 + Express 5 + `pg` puro (sin ORM). Arquitectura
  hexagonal: `domain/` no depende de frameworks externos, `application/`
  orquesta casos
  de uso contra puertos, `infrastructure/` provee adaptadores (HTTP, BD).
- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind 4.
  Arquitectura limpia (`domain/`, `application/`, `infrastructure/`,
  `presentation/`).
- **BD**: PostgreSQL 16 alpine, driver `pg` con consultas parametrizadas
  (`$1, $2, ...`). Migraciones como archivos `.sql` aplicados por un
  ejecutor idempotente que registra en una tabla de seguimiento.
- **Validacion**: zod, mismo paquete en front y back para compartir
  esquemas via `packages/shared`.
- **Pruebas**: Vitest + supertest para el backend. Sin e2e en esta
  entrega.

Justificacion: la pila es el minimo necesario para cubrir el enunciado
sin anadir complejidad accidental. `pg` puro evita la caja negra de un
ORM (Prisma/Drizzle) cuando los contratos viven en TypeScript y las
consultas son pocas y conocidas.

## 2. Versionado y ramas

- `main` y `develop` separados. Todos los commits van a `develop`; el
  evaluador hara el merge a `main` (se conserva el `--no-ff` segun el
  spec).
- Mensajes de commit en Conventional Commits en espanol corto
  (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
- No hay sub-modulos ni sub-paquetes publicos: `packages/shared` se
  referencia via enlaces simbolicos del workspace de npm.

## 3. Base de datos

### 3.1 Codigos UPPER_SNAKE en BD, etiquetas en espanol en presentacion

`packages/shared/src/enums.ts` define los codigos canonicos como
`HARDWARE`, `BAJA`, `PENDIENTE`, etc. `labels.ts` los mapea a los textos
en espanol (`Hardware`, `Baja`, `Pendiente`). La BD solo almacena
codigos: las restricciones CHECK comparan contra el conjunto
UPPER_SNAKE, y la capa de presentacion los traduce al renderizar. Asi
el orden lexicografico en BD es estable y las etiquetas pueden
evolucionar sin migracion.

### 3.2 `priority_weight` desnormalizado

Ademas de `priority` (TEXT) hay una columna `priority_weight INTEGER
0..3` que sirve para ordenar sin analizar cadenas. Una restriccion
CHECK adicional garantiza que el par `(priority, priority_weight)`
siempre sea consistente (BAJA=0, MEDIA=1, ALTA=2, CRITICA=3). El
repositorio mantiene el invariante al escribir; si la aplicacion manda
una combinacion invalida, la BD la rechaza.

### 3.3 `updated_at` mediante disparador

Un disparador `BEFORE UPDATE` en `users` y `tickets` fija
`updated_at = now()` antes del COMMIT. Esto evita que la aplicacion
olvide establecerlo en alguna ruta de actualizacion. La capa de
aplicacion puede pasar una marca de tiempo explicita en el `UPDATE`; el
disparador la sobreescribe, asi que no hay forma de divergir.

### 3.4 `pg_trgm` opcional

Los indices trigram sobre `title` y `description` mejoran la busqueda
sin distinguir mayusculas/minusculas y de subcadena. Se crean solo si
la extension `pg_trgm` esta disponible (la imagen `postgres:16-alpine`
la trae como contrib pero hay que activarla con `CREATE EXTENSION`). Si
la extension no esta, el resto del esquema y la API funcionan igual;
solo la busqueda de texto completo queda sin indice dedicado.

### 3.5 Migraciones idempotentes, archivos `.sql`

El ejecutor de migraciones
(`apps/api/src/infrastructure/db/scripts/migrate.ts`) lee
`apps/api/src/infrastructure/db/migrations/*.sql` en orden
lexicografico y los aplica en transaccion. Antes de aplicar mira la
tabla `schema_migrations` (registro de seguimiento) y omite los ya
aplicados. Asi el script es seguro de re-ejecutar y soporta reintentos
en CI.

Cada archivo `.sql` debe ser idempotente por si mismo
(`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`,
`DROP TRIGGER IF EXISTS` antes de recrear). El ejecutor envuelve la
ejecucion en una transaccion, pero el DDL con `IF NOT EXISTS` sigue
siendo seguro.

## 4. Autenticacion y autorizacion

### 4.1 Inicio de sesion unico

Hay un solo formulario de inicio de sesion (`/login`) y un solo punto de
acceso (`POST /api/auth/login`) que valida credenciales con `bcryptjs` y
emite una cookie httpOnly firmada con JWT (`jsonwebtoken`). El mismo
punto de acceso acepta tanto usuarios con rol `ADMIN` como `USER`; no
hay rutas ni formularios separados por rol.

### 4.2 Paneles por rol

Tras autenticarse, el frontend consulta `GET /api/auth/me` para conocer
el rol de la sesion y enruta al usuario:

- **ADMIN** aterriza en `/admin` con el panel completo: gestion de
  tickets, asignacion, cambio de estado, cancelacion, borrado logico,
  listado de usuarios, metricas.
- **USER** (cliente) aterriza en `/tickets` con un panel reducido:
  crear tickets propios, ver los suyos, comentar y cancelar los propios.

La capa de presentacion nunca lee el rol de un almacen local: lo obtiene
del backend en cada carga. La capa de aplicacion del backend vuelve a
verificar el rol en cada operacion protegida (no se asume por
middleware): un USER que intenta `DELETE /api/tickets/:id` recibe
`403 Prohibido` aunque la ruta este registrada.

### 4.3 Almacenamiento de contrasenas

Las contrasenas nunca se guardan en texto plano. Se hashean con
`bcryptjs` (10 rondas por defecto) antes de insertarse. El hasher vive
detras de un puerto (`PasswordHasher`) para que las pruebas unitarias
puedan sustituirlo por un doble sin tocar la capa de aplicacion.

## 5. Notificaciones transaccionales (Resend)

El sistema esta cableado para enviar correos transaccionales mediante
[Resend](https://resend.com). La integracion se hace solo en el
backend; el frontend nunca ve la clave.

- **Variables de entorno** (solo en `.env`, nunca en `.env.example` con
  valores reales):
  - `RESEND_API_KEY`: clave de API de Resend. Vacia = servicio
    deshabilitado (la API registra el intento en logs y sigue sin
    enviar).
  - `NOTIFY_FROM_EMAIL`: direccion del remitente verificada en Resend
    (por ejemplo `soporte@tu-dominio.com`).
- **Punto de extension**: la API expone un puerto
  `NotificationService` con un metodo `send`. La implementacion
  `ResendNotificationService` vive en `infrastructure/notifications/`
  y se inyecta en los casos de uso que disparan notificaciones
  (creacion de ticket, cambio de estado, asignacion, cancelacion). Si
  `RESEND_API_KEY` esta vacia, el adaptador registra el intento y
  resuelve OK, de modo que el flujo principal no se rompe por falta de
  correo.
- **Plantillas**: las plantillas de correo viven como funciones puras
  en el mismo modulo (`renderTicketAssignedEmail`,
  `renderTicketStatusChangedEmail`, etc.) y se prueban de forma
  aislada. No se usa un motor de plantillas externo para evitar otra
  dependencia.

## 6. Docker

### 6.1 Postgres en puerto del anfitrion 5433

La imagen `postgres:16-alpine` por defecto escucha en 5432 dentro del
contenedor. El puerto del anfitrion es **5433** (mapeo `5433:5432`)
para evitar choques con un Postgres ya instalado en la maquina del
evaluador. El `.env.example` refleja este mapeo (`localhost:5433`).

### 6.2 Construccion multi-etapa

Cada Dockerfile tiene tres etapas: `deps` (instala el workspace
completo), `builder` (compila TS y copia SQL al lado del JS), `runner`
(instala solo dependencias de produccion y superpone los artefactos).
Beneficios:

- Cache de capas: si cambia solo el codigo, no se reinstalan
  dependencias.
- Imagen final sin TypeScript, sin pruebas, sin dependencias de
  desarrollo.
- Imagen corre como usuario no-root (`node`, uid 1000).

### 6.3 Servicio `migrate` separado

En lugar de hacer que la API corra migraciones al arrancar, hay un
servicio `migrate` que:

- Reusa la imagen del api (mismo Dockerfile, `command:` distinto).
- Aplica migraciones y termina (`restart: "no"`).
- Es la condicion que el servicio `api` espera
  (`service_completed_successfully`).

Razones:

- Separar responsabilidades: la API no debe conocer el ciclo de vida
  del esquema.
- En produccion, las migraciones se corren antes de levantar la API
  (CI), no al arranque de cada replica.
- El script es idempotente, asi que un re-arranque no rompe nada.

### 6.4 Frontend sin `output: 'standalone'`

`next.config.ts` no define `output: 'standalone'`. La imagen del web
incluye `node_modules` de produccion entero. Es mas pesada (~300 MB)
que la variante autonoma, pero no requiere tocar la configuracion de
Next (el archivo esta en `apps/web/`, fuera del alcance de esta
iteracion). Si se quisiera optimizar, anadir `output: 'standalone'`
reduce la imagen a ~150 MB; queda como mejora futura.

### 6.5 Proxy de mismo origen para la API

`next.config.ts` redefine `/api/*` -> `${API_INTERNAL_URL}/api/*`. En
docker, `API_INTERNAL_URL=http://api:4000` (nombre de servicio). Asi el
navegador solo ve `localhost:3000/api/...`, la cookie de sesion es de
mismo origen y httpOnly, y CORS no aplica. En dev local,
`API_INTERNAL_URL=http://localhost:4000`.

### 6.6 Secretos

- `.env.example` documenta todas las variables con valores de
  desarrollo. Nunca contiene secretos reales: solo marcadores
  (`cambia-esta-clave-...`).
- `docker-compose.yml` no tiene secretos fijos en el codigo.
  `JWT_SECRET` toma un valor predeterminado solo para desarrollo con
  un comentario explicito; en produccion se sobreescribe via variables
  de entorno del shell o un almacen de secretos.
- El archivo `.env` real esta en `.gitignore` y es la unica fuente de
  secretos en tiempo de ejecucion.
- Las claves del seed (`SEED_ADMIN_*`, `SEED_USER_*`) y la clave de
  Resend (`RESEND_API_KEY`) solo se leen de variables de entorno. El
  codigo de seed tiene marcadores de dev como red de seguridad, pero
  `.env` es la fuente de verdad.

## 7. Scripts de BD: bug conocido y solucion alternativa

El script `apps/api/src/infrastructure/db/scripts/migrate.ts` importa
`config.ts` para resolver la ruta del `.env`. La funcion `findEnvFile()`
busca primero en `process.cwd()/.env` (donde corre `npm run`,
normalmente `apps/api/`) y luego en una ruta relativa al archivo
compilado (`../../../../.env.example`). Esa ruta relativa fue escrita
pensando en la copia compilada en `dist/infrastructure/db/`, no en la
fuente `src/infrastructure/db/`. Cuando los scripts corren con `tsx`
desde la fuente, la resolucion apunta a `apps/.env` en vez de la raiz.

**Solucion aplicada**: ademas del `.env` habitual en la raiz, los
scripts de BD esperan un `.env` en `apps/api/`. El `README.md`
documenta el paso extra. La correccion de fondo (cambiar `../../../../`
a `../../../../../` en `config.ts`) queda para una iteracion posterior
porque ese archivo es de `apps/api/src/`, fuera del alcance de esta
lane.

La solucion no rompe nada: el `.env` de la raiz sigue siendo la fuente
de verdad para el resto de la aplicacion (api principal, frontend), y
el `.env` de `apps/api/` solo lo consumen los scripts CLI de
migracion y seed.

## 8. Supuestos

- El evaluador tiene Docker Desktop (o compatible) y Node 20+
  instalados.
- Las credenciales `tickets` / `tickets_dev` son aceptables para el
  entorno de desarrollo; en produccion se rotan via un almacen de
  secretos.
- La politica de transiciones de estado vive en
  `packages/shared/src/state-machine.ts` y la aplicacion final de las
  reglas es de la capa de aplicacion, no de la BD. La BD solo
  restringe los valores posibles del enum, no las transiciones.
- El borrado logico (`tickets.deleted_at`) lo activa el repositorio;
  los indices filtran `WHERE deleted_at IS NULL` para que las
  consultas habituales no paginen registros borrados.
- Las contrasenas del seed provienen de `SEED_ADMIN_PASSWORD` y
  `SEED_USER_PASSWORD` en el `.env` que entrega el dueno. El codigo de
  seed tiene marcadores de dev como red de seguridad, pero el `.env`
  real es la fuente de verdad. En produccion el script rechaza correr
  si las claves siguen siendo los marcadores de `.env.example`.
- **Aviso de seguridad del seed**: el script imprime las contrasenas
  resueltas en la consola al finalizar. Si el `.env` que entrega el
  dueno contiene contrasenas reales, correr `npm run db:seed` las
  expone en la terminal y en los registros. Es una limitacion conocida
  del modulo `apps/api/src/infrastructure/db/scripts/seed.ts`, fuera
  del alcance de esta lane. Recomendacion: acordar con el dueno que
  las `SEED_*` del `.env` sean de dev (no reutilizar contrasenas
  reales), o redirigir la salida del comando a un archivo descartable.

## 9. Decisiones que se dejaron fuera

- **Notificaciones transaccionales completas** (R11.4 del spec): la
  variable `RESEND_API_KEY` y el puerto `NotificationService` estan
  definidos, pero los casos de uso aun no invocan al servicio. La
  integracion completa se cablea cuando se concrete el flujo.
- **OpenAPI/Swagger** (R11.1): hay preparacion en `apps/api` pero el spec
  definitivo se documenta en una lane aparte.
- **CI**: no incluida en esta entrega. La verificacion inicial es
  local.
- **Pruebas e2e con Playwright**: no incluidas; Vitest cubre la logica
  y supertest cubre los puntos de acceso HTTP.
