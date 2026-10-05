# Lane A — backend-domain · checklist

Scope estricto: `apps/api/src/domain/` + `apps/api/tests/domain/`. TDD RED-GREEN-REFACTOR.

## Plan
- [x] 1. Leer AGENTS.md, tasks/plan.md, tasks/agents/lane-a-backend-domain.md, todo packages/shared/src
- [x] 2. Leer referencia `git show origin/develop:src/server/domain/ticket.ts`
- [x] 3. Construir `packages/shared` para que la API pueda resolver `@soporte/shared`
- [x] 4. RED: escribir `tests/domain/ticket-policy.test.ts` con la matriz completa
- [x] 5. RED: escribir `tests/domain/ticket.test.ts` con invariantes de entidad
- [x] 6. RED: ejecutar vitest y comprobar que fallan (módulos no existen)
- [x] 7. GREEN: implementar `errors.ts` con clases tipadas y códigos de `@soporte/shared`
- [x] 8. GREEN: implementar `ticket.ts` con factorías puras + invariantes
- [x] 9. GREEN: implementar `ticket-policy.ts` que delega en shared + aplica reglas
- [x] 10. GREEN: ejecutar vitest y comprobar que pasan
- [x] 11. GREEN: añadir `ports.ts` con contratos de repositorio
- [x] 12. REFACTOR: revisar naming, mensajes, sin duplicar lógica que ya vive en shared
- [x] 13. Verificación: `npm run typecheck` + `npm test -- tests/domain` + `npm run lint` sobre `apps/api/src/domain`
- [x] 14. Commit `feat(api): add pure ticket domain with transition policy` → `37ab9ea`
- [x] 15. Reporte final (archivos, tests, verificación) → ver respuesta al usuario

## Criterios aceptación
- [x] `domain/` sin imports `express`, `pg`, `next`, `prisma`
- [x] 100% ramas política cubiertas (matriz completa + observación + terminales + same-state)
- [x] Sin `any`, sin `console.log`
- [x] Errores con `code: ErrorCode` (string union, no strings sueltos)
