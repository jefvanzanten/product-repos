# Product Repos Backend

De gedeelde backend-API voor Calorie Tracker, Inventory en Product Management Admin. De applicatie is een modulaire Hono-monoliet op Bun, met Better Auth, Drizzle ORM en SQLite.

## Verantwoordelijkheden

- authenticatie, sessies en rollen;
- productcatalogus, categorieën, merken, verpakkingen en voedingswaarden;
- verpakkingsafbeeldingen;
- persoonlijke consumptielogs, voedingsdoelen en dagstatistieken;
- gedeelde HTTP-contracten voor de afzonderlijke frontendapplicaties.

Persoonlijke consumptiegegevens blijven per gebruiker afgeschermd. Product Management Admin vereist de beheerdersrol.

## Publieke API

Productie: <https://api.jefvanzanten.dev>

Belangrijke routes:

- `GET /health` — proceshealthcheck;
- `GET /health/db` — databasehealthcheck;
- `/api/auth/*` — Better Auth;
- `/products/*` — productcatalogusbeheer;
- `/calorie-tracker/*` — Calorie Tracker-API;
- `/package-images/*` — opgeslagen verpakkingsafbeeldingen.

Zie de [endpointdocumentatie](../../docs/backend/Endpoints/) en [ERD's](../../docs/backend/ERD/) voor de uitgewerkte contracten en gegevensmodellen.

## Lokale ontwikkeling

De lokale backend gebruikt uitsluitend de lokale SQLite-database. Productiegegevens en de productiedatabase worden niet vanuit lokale processen benaderd.

```bash
cp apps/backend/.env.example apps/backend/.env
corepack pnpm --filter @product-repos/backend dev
```

Standaard luistert de API op `http://localhost:3000`. De SQLite-database staat standaard in `apps/backend/db/sqlite.db`; lokaal geüploade verpakkingsafbeeldingen staan daarnaast in `apps/backend/db/package-images/`.

## Veelgebruikte opdrachten

```bash
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter @product-repos/backend test
corepack pnpm --filter @product-repos/backend build
corepack pnpm --filter @product-repos/backend db:migrate
corepack pnpm --filter @product-repos/backend db:seed
```

## Architectuur

De composition root staat in `src/composition.ts`. Modules bezitten hun eigen routes, services en repositories; gedeelde API-shapes komen uit `packages/contracts`.

Lees verder in [Backendarchitectuur](../../docs/backend/BACKEND_ARCHITECTUUR.md).

## Deployment

Coolify bouwt vanuit de repository-root met:

```text
apps/backend/Dockerfile
```

De productiecontainer gebruikt `/data/sqlite.db` en `/data/package-images/` in één persistent Docker-volume. Een nieuwe image of deployment vervangt deze data niet.

De backendresource kijkt uitsluitend naar wijzigingen in:

- `apps/backend/**`;
- `packages/contracts/**`;
- gedeelde workspace- en buildbestanden.
