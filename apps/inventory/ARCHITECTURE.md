# Inventory frontend architecture

Inventory uses feature-oriented domain, data and presentation layers plus an app-wide core.

## Dependency direction

```text
core/domain
    ↓
feature/domain
    ↓
feature/data and feature/presentation
    ↓
routes (composition)
```

More precisely:

- `core/data` owns app-wide browser adapters such as authenticated backend transport.
- `core/presentation` owns app-wide auth and routing integration.
- `features/*/domain` contains framework-independent feature models and rules.
- `features/*/data` validates external contracts and maps DTOs to domain models.
- `features/*/presentation` owns React components, hooks, formatting, and supporting UI logic colocated with the area that owns it.
- `routes` authenticate requests and translate route context into feature capabilities.

Data and presentation are outer layers around domain. Presentation may call feature data adapters through query hooks, but neither layer may redefine domain rules.

## Boundary rules

1. Contract schemas and contract types are imported only by data modules.
2. Domain modules do not import React, React Router, contracts, data or presentation.
3. Data modules do not import React, React Router or presentation.
4. Feature modules do not import route implementation files.
5. Routes can compose core and feature layers but should remain thin.
6. `core` is reserved for app-wide behavior. Feature-specific helpers stay within their feature.

These boundaries are enforced by `eslint.config.js` where practical.

## Inventory feature

The current app has one cohesive physical-inventory feature:

```text
features/inventory/
  domain/          models, validation, expiry and item-edit changes
  data/            HTTP endpoints, contract mapping and query keys
  presentation/    components, pages, hooks, formatting and colocated UI logic
```

List, add, package detail and low-stock threshold behavior remain one feature because they operate on the same model and cache. New bounded capabilities should receive separate feature folders only when they have their own domain language and lifecycle.

## Data strategy

Inventory keeps TanStack Query for browser-side server state. Expected API outcomes remain tagged values and query retries are disabled explicitly. The adapter classifies transport, session, HTTP and protocol failures before presentation receives them.

The physical-package save workflow is data-layer orchestration because it must carry optimistic versions through ordered location, expiry and content endpoints. The domain layer determines which changes are required; the data layer executes them.

## Routing and authentication

React Router route modules remain outside features. The protected layout derives administrator status, while `routes/inventory.tsx` translates it to the `canManageInventory` feature capability. Feature presentation never imports route context types.

Public paths and safe login-return handling live under `core/presentation/routing`.
