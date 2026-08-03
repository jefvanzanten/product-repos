# Product Management Admin

De zelfstandige beheerapp voor de gedeelde productcatalogus. De app bevat de adminroutes, loaders, actions, server-adapters en featurecomponenten die door Calorie Tracker en Inventory worden gebruikt.

## Functionaliteit

- producten zoeken en per categorie door de catalogus bladeren;
- categorieën, merken en producten beheren;
- verpakkingen en inhoudseenheden beheren;
- PNG-, JPEG- en WebP-verpakkingsafbeeldingen uploaden;
- consumptietype en voedingswaarden beheren;
- producten en verpakkingen archiveren en herstellen volgens de featurespecificaties.

Alle inhoudelijke routes vereisen een ingelogde gebruiker met de beheerdersrol.

## Routes

Productie: <https://apps.jefvanzanten.dev/product-management-admin>

De React Router-`basename` is `/product-management-admin`.

| Publieke route | Doel |
| --- | --- |
| `/product-management-admin/login` | Inloggen |
| `/product-management-admin/product-catalogus` | Productcatalogus |
| `/product-management-admin/product-catalogus/nieuw` | Product toevoegen |
| `/product-management-admin/product-catalogus/:productId` | Productdetail |
| `/product-management-admin/locations` | Opbergplaatsen |

De optionele, gesloten queryparameter `source` is `inventory` of `calorie-tracker`. Hiermee toont de bottom-tabbar een veilige terugkeerlink naar de bronapp; de parameter verleent geen toegang.

## Lokale ontwikkeling

De lokale app gebruikt standaard de lokale backend op `http://localhost:3000`. Lokale ontwikkeling en productiegegevens blijven gescheiden.

```bash
corepack pnpm --filter @product-repos/backend dev
corepack pnpm --filter product-management-admin dev
```

Open daarna <http://localhost:5174/product-management-admin>.

Maak `apps/product-management-admin/.env` op basis van `.env.example` wanneer lokale API-configuratie nodig is.

## Verificatie

```bash
corepack pnpm --filter product-management-admin typecheck
corepack pnpm --filter product-management-admin test
corepack pnpm --filter product-management-admin build
```

De app gebruikt gedeelde authenticatie uit `packages/auth-client`, API-contracten uit `packages/contracts` en de applicatieshell uit `packages/shared`.

## Specificaties

- [Productcatalogus-index](../../docs/specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md)
- [Product zoeken](../../docs/specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md)
- [Productcatalogus browsen](../../docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md)
- [Productdetail en verpakkingen](../../docs/specs/admin-dashboard/product-catalogus/product-detail-specificatie.md)
- [Producten en verpakkingen archiveren](../../docs/specs/admin-dashboard/product-catalogus/product-archiveren-specificatie.md)

## Deployment

Coolify bouwt vanuit de repository-root met:

```text
apps/product-management-admin/Dockerfile
```

De resource kijkt uitsluitend naar wijzigingen in:

- `apps/product-management-admin/**`;
- `packages/auth-client/**`;
- `packages/contracts/**`;
- `packages/shared/**`;
- gedeelde workspace- en buildbestanden.
