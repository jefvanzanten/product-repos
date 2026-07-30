# Plan — product en merk zoeken

Bron: `docs/specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md`.

## Statusinschatting

Aanwezig:

- cataloguszoekveld bewaart `q` in `/product-catalogus/producten`;
- openen met `?q=cola` vult het zoekveld;
- `Product aanmaken` blijft bereikbaar;
- merkzoeken in product-aanmaken werkt via `GET /brands?query=...` en backend zoekt pas vanaf twee tekens.

Nog niet aanwezig:

- echte cataloguszoekopdracht voor producten/merken/categorieën;
- gegroepeerde zoekresultaten;
- klikgedrag naar productdetail, brand-result state en category-browse state;
- debounced live zoeken op de cataloguspagina;
- geen-resultaten toestand.

## Doel

Zoeken implementeren als duplicaatpreventie en navigatiehulp, zonder dat een zoekterm automatisch een productformulier invult.

## Uitvoerplan

### Stap 1 — Gedeeld zoekcontract definiëren

Definieer in `packages/contracts` een cataloguszoekresponse, bijvoorbeeld:

- `CatalogProductSearchResult`:
  - `id`;
  - `displayName`;
  - `brand` nullable;
  - `categoryPath`;
  - `packageSummary`.
- `CatalogBrandSearchResult`:
  - `id`;
  - `name`;
  - `productCount`.
- `CatalogCategorySearchResult`:
  - `id`;
  - `path`;
  - `productCount`.
- `CatalogSearchResponse` met groepen `products`, `brands`, `categories`.

Leg limieten vast: producten 20, merken 10, categorieën 10.

### Stap 2 — Backend search-adapter bouwen

- Voeg een endpoint toe voor cataloguszoeken, bijvoorbeeld `GET /products/search?query=&productLimit=&brandLimit=&categoryLimit=`.
- Parse query: trim, bij minder dan twee tekens geen zoekopdracht en lege groepen.
- Productmatch: case-insensitive contains op productnaam en merknaam.
- Categoriematch: case-insensitive contains op categorienaam en categoriepad.
- Niet matchen op verpakking, barcode, alias of externe data.
- Bereken category paths en product counts deterministisch.
- Houd SQL/Drizzle-details in backend repository/adaptermodules; expose geen raw rows naar routes.

### Stap 3 — Frontend live zoeken

- Gebruik een debounced fetcher voor `q` vanaf twee tekens.
- Enter/form submit blijft de URL met `q=<zoekterm>` zetten.
- Bij nul of één teken: geen productzoekfetch; toon root/browse-state volgens browseplan.
- Render groepen alleen wanneer ze resultaten hebben.
- Toon geen-resultaten toestand wanneer alle groepen leeg zijn vanaf twee tekens.

### Stap 4 — Klikgedrag implementeren

- Productresultaat linkt naar `/product-catalogus/producten/:productId`.
- Merkresultaat linkt naar `/product-catalogus/producten?brandId=<brandId>` en verwijdert `q`.
- Categorieresultaat linkt naar `/product-catalogus/producten?categoryId=<categoryId>` en verwijdert `q`.
- Na merk/categorie-selectie is de zoekbalk leeg en bestaan er geen filterchips.

### Stap 5 — Product-aanmaken guardrail

- Vanuit typed zoekmodus gaat `Product aanmaken` altijd naar `/nieuw` zonder prefill.
- Alleen expliciete brand/category state mag `brandId` of `categoryId` meesturen.

### Stap 6 — Tests

- Backendtests voor:
  - minder dan twee tekens geeft lege resultaten;
  - productnaammatch;
  - merkmatch;
  - categorienaam/categorypath-match;
  - limieten per groep;
  - geen verpakking/barcode/alias-match.
- Frontendtests voor:
  - `q` blijft zichtbaar;
  - debounced fetch vanaf twee tekens;
  - gegroepeerde resultaten;
  - geen-resultaten state;
  - merk/category click verwijdert `q`;
  - product aanmaken vanuit typed `q` heeft geen prefill.

## Acceptatiecriteria

- AC-01 t/m AC-08 uit de spec zijn afgedekt.
- Merkzoeken in product-aanmaken blijft werken via `GET /brands?query=...`.
- Cataloguszoekresultaten gebruiken geen oude productvariant/SKU-flow.
- Tests en typecheck slagen via `corepack pnpm`.
