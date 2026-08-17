# Calorie Tracker frontend architecture

The application is organized by feature. Each feature uses three layers:

- `domain`: framework-independent models and business rules.
- `data`: backend transport, contract validation, command parsing, and DTO mapping.
- `presentation`: React components, route data types, formatting, localized copy, and view models.

Cross-feature code lives under `app/core` and follows the same layer boundaries. `core` is only for Calorie Tracker-wide concerns; workspace-wide reusable code belongs in `packages/shared`.

## Dependency direction

- Domain may depend only on domain code.
- Data may depend on domain code, but not presentation code.
- Presentation may depend on domain code.
- Files under `app/routes` are composition boundaries. They may combine presentation concerns with feature data functions.
- API schemas and DTOs from `@product-repos/contracts/calorie-tracker` may only be imported by data files.

These rules are enforced in `eslint.config.js`.

## Data adapters

The client uses focused, feature-specific API functions. Data adapters validate backend responses and map transport DTOs into frontend domain models. Incoming React Router requests are converted into a neutral `BackendRequestContext` before entering the data layer.
