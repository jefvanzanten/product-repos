# Anti-slop migration plan

## Recommended order

| Phase | Scope | Findings |
|---|---|---:|
| 1 | Shared packages | 11 |
| 2 | Inventory | 6 |
| 3 | Recipe | 21 |
| 4 | Backend | 63 |
| 5 | Product Management Admin | 59 |
| 6 | Calorie Tracker | 66 |
| | **Total** | **226** |

This order establishes shared boundary-parsing patterns first, proves them in the smallest app, and leaves the two largest migrations until the supporting code is ready.

## General migration rules

For every phase:

- Parse HTTP, JSON, storage, form, and navigation input at the boundary.
- Prefer existing Zod schemas from `@product-repos/contracts`.
- Add missing schemas to `packages/contracts` when the data is shared between backend and frontend.
- Use local schemas for application-only state.
- Replace broad return annotations with inference, `satisfies`, or named owner contracts.
- Replace module mocking with dependency injection.
- Remove assertions through parsing or better inference.
- Add `SAFETY:` comments only for genuine framework invariants that cannot be represented in the type system.
- Do not disable or weaken rules.

## Phase 1: shared packages

### `packages/shared` — 2 findings

1. Replace `readUnknownJson(): Promise<unknown>` with a schema-driven helper:
   - Accept a parser/schema.
   - Parse immediately after `response.json()`.
   - Return the schema's concrete output.
2. Remove the `typeof Intl` environment probe:
   - Either treat `Intl` as guaranteed by supported runtimes, or inject a timezone resolver into the browser adapter.
3. Update callers in Recipe and the other frontend applications.

### `packages/auth-client` — 9 findings

1. Define a schema for the minimum Better Auth session projection.
2. Parse `response.json()` directly with that schema.
3. Remove `isRecord`, the `Record<string, unknown>` dictionary, and manual `typeof` checks.
4. Keep `SessionLookupResult` as the public discriminated union.
5. Replace the `Intl`/browser capability check in `session-monitor.tsx` with an injected or browser-specific implementation.
6. Add parser tests for valid, unauthenticated, and malformed session responses.

**Gate:** scoped Oxlint, typecheck, and package tests pass for both shared packages.

## Phase 2: Inventory — 6 findings

1. `backend-api.ts` and `auth-client.ts`
   - Remove runtime capability checks.
   - Reuse the corrected shared browser/auth adapters.
2. `inventory-api.ts`
   - Pass endpoint-specific contract schemas into the shared JSON request helper.
   - Remove helper parameters typed as `unknown`.
3. `inventory-expiry.ts`
   - Replace the widened dictionary annotation with inference or `satisfies` against a named expiry-message contract.
4. `use-inventory-groups.ts`
   - Remove the assertion by preserving the query/result type.
   - If a library invariant truly requires an assertion, document that exact invariant with `SAFETY:`.

**Gate:** Inventory Oxlint, typecheck, unit tests, and existing ESLint pass.

## Phase 3: Recipe — 21 findings

1. `recipe-backend-api.server.ts`
   - Make request bodies contract-derived rather than `unknown`.
   - Use the shared schema-driven response helper.
   - Add or reuse a Zod schema for backend error responses.
   - Delete `readError`, `readFields`, manual `typeof` checks, dictionary casts, and assertions.
2. Command and route parsing
   - Parse `FormData` directly into the existing create/update recipe schemas.
   - Give route error translation a named error union instead of accepting `unknown`.
3. `recipe-form-submission.server.ts`
   - Replace ad hoc runtime checks with schema parsing.
   - Remove the resulting assertion.
4. Tests
   - Parse mocked response bodies with the same contracts used in production.
5. `recipe-form.tsx`
   - Preserve the field/event type rather than asserting it.

**Gate:** Recipe Oxlint, typecheck, tests, and ESLint pass.

## Phase 4: Backend — 63 findings

There are 25 production findings and 38 test findings.

### Production code

1. **Route boundaries**
   - Parse route parameters, query parameters, and request bodies with contract schemas before calling domain/services.
   - Replace helpers accepting `unknown` with schema-derived inputs.
2. **Response boundaries**
   - Replace `unknown` route returns with named response DTOs.
   - Ensure Recipe and Calorie Tracker routes return contract-derived types.
3. **Catalog domain**
   - Replace manual `typeof` guard functions with Zod/domain parser functions.
4. **Database and service projections**
   - Preserve Drizzle inference rather than annotating results with open object/dictionary types.
   - Introduce named service result contracts only where an ownership boundary needs one.
5. **Conditional spreads**
   - Build mutation objects in statements and assign optional properties explicitly.
6. **Assertions**
   - Remove assertions by parsing route input and preserving repository result types.

### Backend tests

1. Create shared test response schemas/helpers so `response.json()` is parsed instead of asserted.
2. Give the test application and migration rows concrete types.
3. Replace reflective property access with typed fixtures or schemas.
4. Replace open callback inputs with repository/contract types.
5. Use `SAFETY:` only where Bun/Hono test APIs provide a real but unexpressed invariant.

**Gate:** Backend Oxlint, typecheck, unit/integration tests, and ESLint pass.

## Phase 5: Product Management Admin — 59 findings

This app's main issue is concentrated in its API/error boundary.

### `product-catalog-api.server.ts`

1. Introduce a schema for the backend error envelope:
   - status/code/message/fields
   - endpoint-specific details where applicable
2. Parse responses once at the HTTP boundary.
3. Replace `getJson`/`postJson`/`patchJson`/`putJson` returning `unknown` with schema-driven request functions.
4. Replace broad request bodies with contract-derived request types.
5. Remove `Reflect.get`, `object`, manual `typeof`, and dictionary assertions.
6. Construct optional error properties explicitly instead of conditional empty-object spreads.

### Error presentation

1. Define a closed product error-code-to-message contract.
2. Replace `Record<string, ...>` return annotations in `product-error-messages.ts` with:
   - inferred literals,
   - a named error-code map, or
   - `satisfies` against the owner contract.
3. Apply the same pattern to location error handling.

### Forms and routes

1. Parse `FormData` using request schemas instead of checking values manually.
2. Parse location commands at route boundaries.
3. Preserve navigation/action result types to eliminate component assertions.
4. Replace environment checks in auth/browser utilities with shared adapters.

### Tests

Parse action results with route result schemas instead of asserting JSON shapes.

**Gate:** Admin Oxlint, typecheck, tests, and ESLint pass.

## Phase 6: Calorie Tracker — 66 findings

There are 27 production findings and 39 test findings.

### Production boundaries

1. `logbook-page.tsx`
   - Create schemas for persisted undo notices and React Router mutation state.
   - Parse session storage/navigation state directly at the read boundary.
   - Remove `isUnknownRecord`, open unknown dictionaries, and manual `typeof` checks.
   - Isolate browser-only storage access instead of probing for `window`.
2. API and command parsers
   - Use existing Calorie Tracker contract schemas for request and response bodies.
   - Remove helpers accepting `unknown`.
3. Route loaders/actions
   - Parse route state, params, and form submissions immediately.
   - Give loader/action results named contracts to eliminate assertions.
4. Presentation maps
   - Replace widened icon, goal, and formatting dictionaries with inference or `satisfies`.
5. Statistics and timezone handling
   - Replace runtime representation checks with parsed domain values.
   - Inject browser timezone behavior where SSR separation is required.

### Tests

1. Replace seven `vi.mock` module mocks with dependency injection:
   - Add factories or dependency parameters for auth lookup and route services.
   - Supply faithful test implementations.
2. Parse route/action responses rather than asserting them.
3. Replace chained assertions in redirect tests with typed request/route helpers.
4. Define schemas for Playwright API payloads and fixture data.
5. Replace reflective E2E payload inspection with parsed DTOs.

**Gate:** Calorie Tracker Oxlint, typecheck, unit tests, E2E typecheck, and ESLint pass.

## Final repository gate

After every scope is clean:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
```

Then run the relevant Calorie Tracker E2E suite separately.
