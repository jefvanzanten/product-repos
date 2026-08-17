# Product Management Admin frontend architecture

The application is organized by feature. Each feature uses three layers:

- `domain`: framework-independent frontend models and business rules;
- `data`: backend transport, contract validation, command parsing, and DTO mapping;
- `presentation`: React components, route data types, localized copy, hooks, and supporting UI logic colocated with the area that owns it.

Cross-feature code lives under `app/core` and follows the same boundaries. Core is only for Product Management Admin-wide concerns. Workspace-wide reusable code belongs in `packages/shared`.

## Features

- `product-catalog`: catalog browsing, categories, brands, compositions, and concrete products;
- `storage-management`: hierarchical storage location management.

Brands, categories, and products remain parts of one product-catalog feature because its workflows coordinate them directly.

## Dependency direction

- Domain may depend only on domain code.
- Data may depend on domain and core data code, but not presentation.
- Presentation may depend on domain and core presentation code.
- Core must not depend on a feature.
- Files under `app/routes` are composition boundaries. They may coordinate feature data and presentation concerns.
- API schemas and DTOs from `@product-repos/contracts` may only be imported by data files.

These rules are enforced in `eslint.config.js`.

## Backend adapters

Feature data adapters validate untrusted backend responses and return frontend-owned domain models. They receive a neutral `BackendRequestContext`; React Router `Request` objects are converted at the route boundary. Data adapters throw classified errors. Routes use presentation error mappers to translate those failures into localized form errors.

## Routes

Route components authenticate, delegate loaders and actions, and render feature pages. Reusable tree logic, form parsing, projections, and localized error mapping belong to their feature layers rather than route modules.
