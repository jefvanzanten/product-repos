# Plan — productcatalogus categorietitel en subcategorie aanmaken

Bron: `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md`.

Status: uitgevoerd.

## Scope

Alleen de categorie-browse state op `/admin/product-catalogus/producten?categoryId=<id>`.

Wel:

- huidige categorienaam als grote titel boven de breadcrumb tonen;
- één secundaire actie `Nieuwe subcategorie aanmaken` tonen onder de subcategoriezone;
- modal met titel, invoerveld, `Toevoegen` en `Annuleren`;
- directe childcategorie aanmaken via bestaand `POST /categories` contract;
- na succes op dezelfde categoriepagina blijven en subcategorieën opnieuw laden;
- foutafhandeling voor lege naam, dubbele siblingnaam en backendvalidatiefouten.

Niet:

- rootcategorieën aanmaken;
- categorieën hernoemen/verwijderen/verplaatsen;
- product-aanmaakflow wijzigen;
- brand/search states wijzigen.

## Uitvoerplan

### Stap 1 — Specificatie bijwerken

- Categorie-browse beschrijft de paginatitel boven breadcrumb.
- Subcategorie-aanmaakmodal, validatie en succesgedrag toevoegen.
- Acceptatiecriteria toevoegen voor titel en subcategorie-aanmaak.
- API-sectie verwijst naar bestaande `POST /categories`.

### Stap 2 — Route-action toevoegen

- Voeg in `product-catalog.tsx` een `action` toe voor `_action=createSubcategory`.
- Parse `categoryId` als positieve integer en `categoryName` als trimmed non-empty string.
- Roep bestaande `createCategory({ name, parentId: categoryId })` aan.
- Return typed actiondata met `createdCategory` of veld-/form-errors.

### Stap 3 — Categorie-browse UI aanpassen

- Render `<h1>` met `browse.category.name` boven `CategoryBreadcrumb`.
- Voeg component voor subcategorie-aanmaak toe bij category browse.
- Toon de knop ook wanneer er nog geen subcategorieën zijn.

### Stap 4 — Modal gedrag

- Open/sluit modal lokaal met React state.
- Submit met `useFetcher` zodat de pagina niet navigeert.
- Sluit modal na succesvol `createdCategory` resultaat.
- Reset invoer bij openen/sluiten/succes.
- Toon errors in de modal en disable submit tijdens pending submit.

### Stap 5 — Styling

- Hergebruik bestaande knopstijl waar passend.
- Voeg CSS toe voor secundaire knop, overlay, modal, velden en fouttekst.

### Stap 6 — Verificatie

- `corepack pnpm --filter inventory typecheck`.
- Gerichte e2e-test uitbreiden of toevoegen voor titel en subcategorie-aanmaak.
- Indien haalbaar: `corepack pnpm test:e2e -- tests/e2e/admin-product-catalog.spec.ts` of gerichte Playwright-test.
