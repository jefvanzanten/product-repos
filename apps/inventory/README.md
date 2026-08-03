# Inventory

Een zelfstandige, server-side gerenderde React Router-app voor het inzien en bijwerken van voorraad. Catalogusbeheer blijft eigendom van Product Management Admin.

## Richting en status

Inventory vormt de gebruikersgerichte inventarisatieclient. De huidige featurespecificaties beschrijven:

- voorraad inzien;
- voorraad toevoegen;
- navigatie naar Product Management Admin voor beheerders;
- een gedeelde applicatieshell en bottom-tabbar.

De voorraadfeatures zijn nog in ontwikkeling. Inventory bevat geen eigen productcatalogus- of adminrouteboom.

## Routes

Beoogde productie-URL: <https://apps.jefvanzanten.dev/inventory>

De React Router-`basename` is `/inventory`.

| Publieke route | Doel |
| --- | --- |
| `/inventory` | Inventarisatieclient |
| `/inventory/login` | Inloggen |

Beheerders openen Product Management Admin via `/product-management-admin/product-catalogus?source=inventory`.

## Lokale ontwikkeling

De lokale app gebruikt de lokale backend op `http://localhost:3000`. Lokale ontwikkeling en productiegegevens blijven gescheiden.

```bash
corepack pnpm --filter @product-repos/backend dev
corepack pnpm --filter inventory dev
```

Open daarna <http://localhost:5175/inventory>.

Maak indien nodig `apps/inventory/.env` op basis van `.env.example`.

## Verificatie

```bash
corepack pnpm --filter inventory typecheck
corepack pnpm --filter inventory build
```

Inventory gebruikt gedeelde authenticatie uit `packages/auth-client` en de applicatieshell uit `packages/shared`.

## Specificaties

- [Inventory-specificatie](../../docs/specs/inventory-client/inventory-client-specificatie.md)
- [Voorraad inzien](../../docs/specs/inventory-client/voorraad-inzien-specificatie.md)
- [Voorraad toevoegen](../../docs/specs/inventory-client/voorraad-toevoegen-bottom-sheet-specificatie.md)
- [Gedeelde bottom-tabbar](../../docs/specs/shared/bottom-tabbar-specificatie.md)

## Deployment

De Dockerfile staat op:

```text
apps/inventory/Dockerfile
```

Voor Inventory bestaat nog geen afzonderlijke Coolify-resource. Zodra die wordt toegevoegd, hoort de resource uitsluitend te kijken naar:

- `apps/inventory/**`;
- `packages/auth-client/**`;
- `packages/shared/**`;
- gedeelde workspace- en buildbestanden.
