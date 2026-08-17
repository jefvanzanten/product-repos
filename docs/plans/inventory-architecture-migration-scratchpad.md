# Inventory architecture migration scratchpad

## Goal

Refactor `apps/inventory` to the same core + feature-oriented domain/data/presentation architecture used by Calorie Tracker without changing the Inventory product behavior or replacing TanStack Query with route loaders.

## Decisions

- Keep one `inventory` feature. The current capabilities form one cohesive physical-inventory bounded context; splitting list/add/detail/threshold into artificial features would add coupling.
- Keep React Router routes as composition boundaries outside the feature.
- Keep TanStack Query. Moving to server loaders/actions is a separate architecture and UX decision.
- Own frontend domain models in the feature. Contract/Zod types stop at the data adapter.
- Keep expected API failures as tagged values and disable automatic retries. This matches the existing behavior and makes protocol/network/session failures explicit.
- Split expiry classification (domain) from Dutch labels and tones (presentation).
- Move the multi-request item edit workflow to the data layer so version propagation and partial failure behavior are testable outside React.
- Pass `isAdmin` from the route shell through outlet context into the route and then as a capability prop to the feature page. Feature code must not import route-owned types.
- Add tests, linting, and import-boundary rules in the same migration.

## Progress log

- Baseline inspected. Inventory has no tests and currently mixes generic HTTP, endpoint adapters, contracts, redirects, query orchestration, domain rules and rendering.
- Existing uncommitted physical-inventory changes were treated as the behavioral baseline and preserved.
- Added app-wide core transport, auth and routing boundaries.
- Added feature-owned Inventory models, deterministic expiry rules, validation and item-change derivation.
- Added contract-to-domain data mapping, centralized query keys and version-carrying item persistence.
- Moved all feature UI under presentation and removed contract and route imports from the feature.
- Replaced item prop-to-state synchronization effects with a keyed editor initialized from the loaded item version. Remaining effects only synchronize dialogs and timers with browser APIs.
- Added type-aware ESLint boundary enforcement, Vitest setup and focused domain/data/routing tests.
- Added `apps/inventory/ARCHITECTURE.md` and updated app verification documentation.

## Verification

- `corepack pnpm --filter inventory typecheck` — passed.
- `corepack pnpm --filter inventory lint` — passed.
- `corepack pnpm --filter inventory test --run` — 3 files, 10 tests passed.
- `corepack pnpm --filter inventory build` — passed.
- Browser smoke test was not run because no user-managed server was listening on port 5175; no server was started in accordance with repository instructions.
