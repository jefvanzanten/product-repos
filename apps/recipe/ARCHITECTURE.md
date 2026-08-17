# Recipe frontend architecture

The application is organized by feature. Each feature uses three layers:

- `domain`: framework-independent models and business rules.
- `data`: backend transport, contract validation, command parsing, and DTO mapping.
- `presentation`: React components, route data types, formatting, localized copy, and supporting UI logic colocated with the area that owns it.

Application-wide code lives under `app/core` and follows the same relevant layer boundaries. A layer directory is created only when it owns real code; an empty `core/domain` is not required. Workspace-wide reusable code belongs in `packages/shared`.

## Dependency direction

- Domain may depend only on domain code.
- Data may depend on domain and core data code, but not presentation code.
- Presentation may depend on domain. Browser interactions may call focused client data adapters when route composition is impossible.
- Files under `app/routes` are composition boundaries. They may combine core presentation concerns, feature data functions, and feature pages.
- Core must never import a feature.
- API schemas and DTOs from `@product-repos/contracts/recipes` may only be imported by data files.

These rules are enforced in `eslint.config.js`.

## Route boundaries

Route components delegate server work to colocated `*-route.server.ts` modules. Server route modules own authentication, parameter checks, cache headers, redirects, and translation of data-layer failures into React Router results. Feature pages receive domain and presentation models rather than transport DTOs.

Internal React Router paths do not include the `/recepten` basename. Public path helpers add the basename only for integrations that operate outside React Router, such as the session monitor.

## Data adapters

The server uses focused recipe API functions. Data adapters validate backend responses and map transport DTOs into frontend domain models. Incoming React Router requests are converted into a neutral `BackendRequestContext` before entering the data layer.

The recipe editor uses small browser data adapters for authenticated resource routes. These adapters validate untrusted JSON before returning domain models to presentation components.
