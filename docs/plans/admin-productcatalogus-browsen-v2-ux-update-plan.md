# Plan v2 — productcatalogus categorie-browse UX update

Bron: `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md`.

## Aanleiding

De browsbare productcatalogus is al geimplementeerd. Deze update gaat alleen over de huidige categorie-browse UX:

- het volledige categoriepad wordt te veel herhaald;
- zoeken binnen een actieve categoriecontext voelt verwarrend;
- de breadcrumb is nu tekst in plaats van navigatie;
- `Product aanmaken in <diepe categorie>` maakt de primaire knop onnodig groot.

## Scope

Alleen aanpassen op `/product-catalogus/producten` wanneer `categoryId` actief is.

Niet opnieuw doen:

- backend-browsecontracten bouwen;
- productzoeken opnieuw ontwerpen;
- brand-result state wijzigen;
- product aanmaken flow wijzigen behalve de bestaande `categoryId`-prefill behouden.

## Uitvoerplan

### Stap 1 — Categoriecontext niet als titel herhalen

- Toon geen volledige breadcrumb/categoriepad als paginatitel in categorie-browse.
- Houd de context zichtbaar via:
  - breadcrumb;
  - sectietitel `Producten in <huidige categorie>`.
- Verwijder ongebruikte titelhelpercode als die alleen nog het pad oplevert.

### Stap 2 — Zoekbalk verbergen in categorie-browse

- Render het zoekformulier niet wanneer `loaderData.mode === "browse"` en `browse.state === "category"`.
- Laat het zoekformulier wel staan op root, search-state en brand-result state.
- Laat URL-regels ongewijzigd: `q` blijft search-state; `categoryId` blijft browse-state.

### Stap 3 — Breadcrumb klikbaar maken

- Vervang de platte breadcrumbtekst door een `nav` met segmenten.
- Voeg vooraan `Alle categorieën` toe met link naar `/product-catalogus/producten`.
- Maak ancestorcategorieën klikbaar naar `/product-catalogus/producten?categoryId=<id>`.
- Toon de huidige categorie als laatste segment; deze hoeft niet klikbaar te zijn.

### Stap 4 — Aanmaakknop verkorten

- In categorie-browse blijft de href `/product-catalogus/producten/nieuw?categoryId=<id>`.
- Wijzig alleen het label naar `Product aanmaken`.
- Laat brand-result state ongewijzigd: `Product aanmaken voor <merk>`.

### Stap 5 — Productrijcontext opruimen waar nodig

- In categorie-browse hoeft een productrij het categoriepad niet opnieuw te tonen.
- In zoekresultaten blijft categoriepad wel nuttig en zichtbaar.

## Verificatie

Controleer minimaal:

- categorie-browse toont geen zoekbalk;
- breadcrumb bevat `Alle categorieën`, ancestors en huidige categorie;
- `Alle categorieën` opent de rootcatalogus zonder queryparameters;
- ancestorlinks openen de juiste `categoryId`;
- primaire aanmaaklink behoudt `categoryId`, maar label is `Product aanmaken`.

Gebruik workspace-commando's alleen via `corepack pnpm`.
