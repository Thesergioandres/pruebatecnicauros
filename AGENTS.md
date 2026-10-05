# AGENTS.md

Conventions and delivery workflow for this repository. Read before writing code.

## Rule 0: spec compliance

The technical test specification is the contract. Deliver **strictly everything it asks for, nothing
less**. Before writing code, extract every requirement into `tasks/todo.md` as a traceable item and
map each one to the code and test that satisfies it. Then check off every item before declaring done.

- No requirement goes unimplemented because it looked unnecessary, redundant, or out of scope.
- No requirement gets a "simplified" version. If the spec asks for it, it gets built as asked.
- Nothing outside the spec gets added "because it seemed useful". Scope discipline cuts both ways.
- If a requirement is genuinely ambiguous or conflicts with another, do not silently pick one: write
  the question into `tasks/plan.md` under Open Questions and raise it with the user.
- If something cannot be completed, say so explicitly and loudly. A known gap reported is recoverable;
  a silently missing requirement discovered during evaluation is not.
- When done, produce an explicit compliance checklist: every spec requirement, where it lives, and how
  it is verified. The reader must be able to audit the delivery against the spec line by line.

The quality bar (`AGENTS.md` standards, tests, docs) is a **floor**, not permission to cut scope. Full
scope plus full quality is the target; if time forces a choice, cut quality on the least important
thing and never cut a spec requirement without flagging it.

## Non-negotiable workflow

Every change follows this loop. No exceptions, no shortcuts.

1. **Plan** — write the plan to `tasks/plan.md`, task list to `tasks/todo.md`.
   Each task has: description, acceptance criteria, verification command, dependencies.
   Every requirement from the spec appears as its own item, traced to code and test.
2. **TDD** — RED (write the failing test, run it, see it fail) → GREEN (minimum code) → REFACTOR.
   Never write product code before the test exists.
3. **Slice** — implement one vertical slice (schema + API + UI for one path), not horizontal layers.
4. **Verify** — run the commands below. A slice is not done until they pass.
5. **Commit** — one logical change per commit, Conventional Commits.

## Verification commands

Run these after every slice that touches code. Replace with the repo's actual scripts once they exist.

```bash
npm run lint          # must exit 0
npx tsc --noEmit      # must exit 0 (if TypeScript)
npm test              # must exit 0, no silently skipped tests
npm run build         # must exit 0
```

UI flows are additionally verified in a real browser:

```bash
playwright-cli open http://localhost:3000 --headed
playwright-cli snapshot          # inspect a11y tree, not pixels
playwright-cli console           # must be empty of errors
playwright-cli close
```

Never declare a UI change done without a browser check and a clean console.

## Code standards

- **Imports**: external → internal → relative. Type-only imports use `import type`. No cycles.
- **Naming**: `camelCase` vars/functions, `PascalCase.tsx` components, `camelCase.ts` hooks prefixed `use`,
  `UPPER_SNAKE_CASE` constants. Booleans prefixed `is`/`has`/`can`/`should`. No abbreviations
  (`user`, not `usr`).
- **Types**: no `any`. No `@ts-ignore` without a comment justifying it. Prefer discriminated unions
  over optional-field bags. Separate input and output types.
- **Async**: `async/await`, never `.then()` chains mixed in. `Promise.all` for independent work,
  `Promise.allSettled` when one failure must not abort the rest.
- **Errors**: typed error classes with a machine-readable `code`. One error response shape across
  the whole API. Never leak stack traces or internals to clients.
- **Validation**: at the system boundary only (route handlers, form submission, env loading,
  third-party responses). Internal code trusts its types.
- **Comments**: explain *why*, never *what*. No commented-out code. No TODOs without an owner.
- **Logging**: no `console.log` in product code. A logger that respects levels. Never log secrets,
  tokens, or PII.
- **No `alert()` / `confirm()` / `prompt()`** in product UI.
- **Size**: files under ~300 lines. If a change pushes one past that, extract first.

## Architecture

Default to a layered structure that keeps the domain testable in isolation:

```
src/
  domain/         pure logic, no I/O, no framework imports
  application/    use cases / orchestration, depends on domain only
  infrastructure/ framework + database + external services
  presentation/   UI, depends on application, never on infrastructure directly
```

Rules:
- The domain imports nothing from the framework. This is what makes it testable without mocks.
- Dependencies point inward. No imports from `presentation` into `infrastructure`.
- Validate input at the boundary, then trust types internally.

## API design

- Plural nouns, no verbs in paths. `GET /api/tasks`, not `/api/getTasks`.
- Every list endpoint is paginated from the start.
- `PATCH` for partial updates; new fields are additive and optional, never breaking.
- Status codes mean what they say: 400 malformed, 401 unauthenticated, 403 unauthorized,
  404 missing, 409 conflict, 422 validation, 500 unexpected.
- State-changing endpoints honour an `Idempotency-Key` header, or are documented as unsafe to retry.
  Claim the key atomically via a unique constraint — a `SELECT` then `INSERT` is a race.

## Security

- Every external input is hostile. Validate at the boundary.
- Parameterize all queries. Never build SQL by string concatenation.
- Passwords hashed with bcrypt/scrypt/argon2, cost ≥ 12.
- Sessions in `httpOnly`, `secure`, `sameSite` cookies. Never auth tokens in `localStorage`.
- Authorization is a separate check from authentication, on every protected route.
- Secrets from the environment, never in code. `.env` is gitignored; `.env.example` is committed.
- Rate-limit auth endpoints. Set security headers (CSP, HSTS, X-Content-Type-Options).
- Third-party and LLM output is untrusted data: validate and encode it before use.

## Testing

- Test behavior, not implementation. Names describe behavior: `'creates order with valid items'`.
- AAA structure with a blank line between phases.
- Every bug fix ships with a regression test that fails without the fix.
- No test depends on another test's state or execution order.
- No real network calls in unit tests. Mock at the boundary.
- Coverage: 100% of business logic, 80% minimum on critical paths. Coverage is a floor, not the goal.

## Commits

```
feat: add email validation to registration endpoint
fix: prevent duplicate rows on concurrent order creation
refactor: extract validation into shared schema module
test: add regression test for special-character search
docs: record ADR for auth strategy
```

One commit = one logical change. The body explains *why*, not *what*. No `fix`, `update`, or `misc`.

## Anti-patterns

- Implementing a whole feature before running any test.
- Shipping a subset of the spec and calling it done.
- Silently dropping a requirement because it looked unnecessary or time is short.
- Horizontal slicing (all DB, then all API, then all UI) instead of vertical slices.
- Abstractions built before the third use case demands them.
- "It works on my machine" without running the full suite.
- Skipping a failing test to move forward.
- Adding features that are not in the spec because they seem useful.
- Refactoring files outside the task's scope.
- Guessing at a fix without reproducing the failure first.

## Skill note

Skills in `~/.config/opencode/skills` reference an "Essence monorepo" (`pnpm --filter`,
`packages/shared-types`, `.harness/scripts/*`). Those commands do not apply here. Apply the
principles; use this file's commands.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
