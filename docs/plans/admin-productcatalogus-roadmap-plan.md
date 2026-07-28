# Roadmap-plan — admin productcatalogus spec-index

Bron: `docs/specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md`.

## Doel

De admin productcatalogus-roadmap in een uitvoerbare volgorde zetten zonder de oude productmanagementmodellen terug te brengen. De UI en contracts blijven beperkt tot:

- categorie;
- merk;
- product/productnaam;
- verpakking/verpakkingstype;
- inhoud/inhoudseenheid;
- aantal per verpakking.

## Huidige situatie

- Routes bestaan voor:
  - `/admin/product-catalogus/producten`;
  - `/admin/product-catalogus/producten/nieuw`.
- Routes ontbreken voor:
  - `/admin/product-catalogus/producten/:productId`;
  - `/admin/product-catalogus/producten/:productId/verpakkingen/nieuw`;
  - `/admin/product-catalogus/producten/:productId/verpakkingen/:packageId`.
- Backend heeft vooral de create-product vertical slice.
- Productdetail, echte cataloguszoekresultaten en browse-states ontbreken nog.

## Uitvoerroute

### Stap 1 — Productdetail als navigatieanker

- Voeg productdetailroute en `GET /products/:productId` toe.
- Toon minimaal read-only productgegevens en verpakkingen.
- Hiermee kunnen productrijen én product-aanmaken redirecten naar een bestaande bestemming.

### Stap 2 — Product aanmaken spec-compleet maken

- Laat `/nieuw?brandId=...` en `/nieuw?categoryId=...` expliciete context vooraf selecteren.
- Redirect na succesvol opslaan naar `/admin/product-catalogus/producten/:productId`.
- Verwijder de tijdelijke aangemaakt-JSON als eindstate.

### Stap 3 — Zoeken en browsen bouwen op gedeelde contracten

- Definieer gedeelde productkaart-/productrij-DTO's met displaynaam, merk, categoriepad en verpakkingssamenvatting.
- Definieer zoekresultaat-DTO's voor producten, merken en categorieën.
- Definieer browse-DTO's voor root, categorie-browse en brand-result state.

### Stap 4 — Verpakkingen beheren

- Voeg aparte verpakking-aanmaak- en detailroutes toe.
- Gebruik dezelfde verpakkingvalidatie als bij de eerste verpakking in product aanmaken.
- Houd verwijderen/archiveren buiten scope.

## Acceptatiecriteria voor de roadmap

- Alle routes uit de spec-index bestaan of hebben een expliciete placeholder met not-found/coming-next zonder oude flow.
- Er is geen UI meer die verwijst naar productvariant, SKU of oude trapsgewijze productmanagementconcepten.
- Product aanmaken, product zoeken, browsen en productdetail gebruiken dezelfde contracts voor productweergave.
- Tests en typecheck draaien via `corepack pnpm`.
