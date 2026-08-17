# Recipe architecture migration scratchpad

## Goal

Migrate the Recipe frontend to feature-first `domain` / `data` / `presentation` layers with application-wide concerns under `core` and React Router files acting as composition boundaries.

## Decisions

- Treat recipes, ingredient editing, product lookup, archive/restore, and visibility management as one `recipes` feature. Product lookup has no independent user workflow yet.
- Keep API contracts (`@product-repos/contracts/recipes`) inside data files only.
- Keep authentication and backend transport in `core` because they are application-wide.
- Keep route path construction in core presentation routing because links and redirects are presentation concerns.
- Do not create an empty `core/domain`; no application-wide domain concept currently justifies it.
- Preserve the global stylesheet during this migration. CSS-module conversion is orthogonal and would increase visual-regression risk.
- Use React Router resource-route fetchers in the recipe form instead of manual `fetch` calls and transport-contract casts.
- Keep React Router `Response` and redirect translation at route boundaries, outside data adapters.

## Progress

- [x] Analyze the existing Calorie Tracker boundaries.
- [x] Analyze Recipe imports, responsibilities, and test baseline.
- [x] Add architecture documentation and lint boundaries.
- [x] Extract core authentication, backend transport, and routing.
- [x] Introduce recipe-owned domain models.
- [x] Extract and map recipe data adapters.
- [x] Split presentation components and pages.
- [x] Make route files thin composition boundaries.
- [x] Add boundary and behavior tests.
- [x] Run typecheck, lint, tests, and build.

## Baseline

Before migration:

- `pnpm --filter recipe typecheck`: passed (with existing Vite `envFile` deprecation warnings).
- `pnpm --filter recipe lint`: passed.
- `pnpm --filter recipe test`: 1 file, 2 tests passed.

## Completed validation

After migration:

- `pnpm --filter recipe typecheck`: passed.
- `pnpm --filter recipe lint`: passed, including layer import rules.
- `pnpm --filter recipe test`: 6 files, 12 tests passed.
- `pnpm --filter recipe build`: passed for client and SSR bundles.
- Browser smoke test was not run because no browser CDP connection was available. No development server was started or restarted.

## Resulting notes

- Browser resource calls must use public `/recepten/...` paths because native `fetch` does not apply React Router's basename. Presentation path builders explicitly convert these paths with `toRecipePublicPath`.
- Server redirects and React Router links use application-internal paths; React Router applies the configured basename.
- The existing global stylesheet remains unchanged and can be migrated to colocated CSS modules independently.
