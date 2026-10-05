# Agent-1 (backend e2e en develop) · checklist

Rama: `develop` (sin cambio, sin commit/push). TDD RED-GREEN-REFACTOR.
Convencion: comentarios del codigo 100% en espanol; commits en ingles.

## Fases
- [x] 1. Reconocimiento: leer domain + db layer ya hechos, entender puertos
- [x] 2. Definir errores de aplicacion que extiendan DomainError
- [x] 3. Definir puertos adicionales de aplicacion (PasswordHasher, SessionTokenSigner, IdGenerator, UserRepository, TicketTransitionWriter)
- [x] 4. RED: tests unitarios de cada caso de uso (fakes en memoria)
- [x] 5. GREEN: implementar casos de uso (create, list, get, update, change-status, cancel, history, delete, register, login, current-user)
- [x] 6. Implementar repositorios pg parametrizados (ticket, ticket-history, user)
- [x] 7. Implementar capa HTTP: error-mapper, error-handler, auth-middleware, validate (zod), openapi skeleton
- [x] 8. Implementar rutas: auth, users, tickets, docs/openapi
- [x] 9. Container (composition root) + entrypoint main
- [x] 10. RED: tests de integracion HTTP con supertest (auth + tickets)
- [x] 11. GREEN: ajustar lo necesario hasta que todo pase
- [x] 12. Verificacion: typecheck api + lint + tests
- [x] 13. Reporte final (archivos, tests, resultado)

## Criterios aceptacion
- [x] `domain/` intacto
- [x] `packages/shared` intacto
- [x] HTTP shape unico `{ error: { code, message, details? } }`
- [x] Validacion zod solo en borde (route handlers)
- [x] Auth via cookie httpOnly con JWT, secret de `.env.example`
- [x] Casos de uso con DI por constructor (repos + clock + id + hasher + signer)
- [x] pg parametrizado (placeholders $N), sin concatenacion SQL
- [x] Tests con fakes en app y con supertest en http
- [x] openapi.ts skeleton compilable
- [x] Comentarios en espanol en todos los archivos de codigo
