# Plan — productdetail en verpakkingen

Bron: `docs/specs/admin-dashboard/product-catalogus/product-detail-specificatie.md`.

## Statusinschatting

Nieuw onderdeel. Routes, backend endpoints en contracts ontbreken nog voor:

- productdetail;
- product bewerken;
- verpakkingenlijst;
- verpakking toevoegen;
- verpakkingdetail;
- verpakking bewerken.

Deze feature is ook een dependency voor product-aanmaken, omdat succesvolle create naar productdetail moet navigeren.

## Doel

Productdetail wordt de centrale plek waar een beheerder productgegevens en verpakkingen kan bekijken en beheren, zonder delete/archive-acties in MVP.

## Uitvoerplan

### Stap 1 — Read-only productdetail als eerste slice

- Voeg route toe: `/product-catalogus/producten/:productId`.
- Voeg backend toe: `GET /products/:productId`.
- Definieer `ProductDetail` contract met:
  - `id`, `name`, `displayName`;
  - `category` en `categoryPath`;
  - `brand` nullable;
  - `packages` met verpakkingstype, inhoud, eenheid, unitsPerPackage en summary.
- UI toont header, productgegevens en verpakkingenlijst.
- Onbekend product toont `Product niet gevonden` binnen admin-layout.

### Stap 2 — Product bewerken

- Voeg backend `PATCH /products/:productId` toe.
- Definieer patchrequest voor categorie, merk nullable en productnaam.
- Gebruik dezelfde duplicate-regels als product aanmaken; huidig product telt niet als duplicaat.
- Frontend schakelt op dezelfde detailpagina naar bewerkmodus.
- Annuleren keert terug naar read-only zonder opslag.
- Succes blijft op detail en toont bijgewerkte gegevens.

### Stap 3 — Verpakkingenlijst verdiepen

- Zorg dat productdetail alle verpakkingen toont, niet alleen de eerste.
- Maak verpakkingssamenvatting één gedeelde formatter, bruikbaar door detail, browse en search.
- Toon corrupte/lege data state: `Geen verpakkingen gevonden voor dit product.` met `Verpakking toevoegen`.

### Stap 4 — Verpakking toevoegen

- Voeg route toe: `/product-catalogus/producten/:productId/verpakkingen/nieuw`.
- Voeg backend `POST /products/:productId/packages` toe.
- Reuse validatie van eerste verpakking:
  - packageTypeId verplicht;
  - amount positieve decimal string;
  - unitTypeId verplicht;
  - unitsPerPackage positief geheel getal.
- Na succes redirect naar verpakkingdetail.

### Stap 5 — Verpakkingdetail en bewerken

- Voeg route toe: `/product-catalogus/producten/:productId/verpakkingen/:packageId`.
- Voeg backend toe:
  - `GET /products/:productId/packages/:packageId`;
  - `PATCH /products/:productId/packages/:packageId`.
- Read-only toont type, inhoud, aantal per verpakking, eventuele eenheidsoort en samenvatting.
- Bewerken blijft op dezelfde pagina; huidige verpakking telt niet als duplicaat.
- Product of verpakking niet gevonden krijgt de states uit de spec.

### Stap 6 — Contracts en foutcodes

Leg vast in `packages/contracts` en backendroutes:

- `PRODUCT_NOT_FOUND`;
- `PRODUCT_PACKAGE_NOT_FOUND`;
- `PRODUCT_ALREADY_EXISTS`;
- `PRODUCT_PACKAGE_ALREADY_EXISTS`;
- `REFERENCE_NOT_FOUND`;
- `VALIDATION_ERROR`.

Gebruik expected errors als waarden in services/repositories en vertaal pas in HTTP-routes naar statuscodes.

### Stap 7 — Tests

- Backendtests voor alle endpoints, duplicate-regels en not-found states.
- Frontend route/action tests voor:
  - productdetail openen;
  - product bewerken/annuleren/opslaan;
  - verpakkingenlijst;
  - verpakking toevoegen redirect;
  - verpakking bewerken;
  - geen delete/archive acties zichtbaar.

## Acceptatiecriteria

- AC-01 t/m AC-07 uit de spec zijn afgedekt.
- Product-aanmaken kan succesvol redirecten naar deze detailroute.
- Verpakkingsvalidatie is consistent met de eerste verpakking in product-aanmaken.
- Voorraad- of inventarisatie-informatie wordt niet op productdetail getoond.
