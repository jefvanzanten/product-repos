# Plan — browsbare productcatalogus

Bron: `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md`.

## Statusinschatting

Huidige frontendroute `/product-catalogus/producten` bevat alleen:

- titel `Producten`;
- zoekveld met `q`;
- link `Product aanmaken`.

Nog niet aanwezig:

- categorie-root/browse;
- directe producten per categorie;
- brand-result state;
- productrijen/kaarten;
- productdetaillinks;
- meer-laden;
- lege catalogus en lege categorie states.

## Doel

De productcatalogus-hoofdpagina wordt de centrale browse- en zoekpagina zonder platte lijst van alle producten op root.

## Uitvoerplan

### Stap 1 — Browse-contracten vastleggen

Definieer contracts voor de pagina-states:

- root browse:
  - rootcategorieën die relevant zijn voor de catalogus;
  - indicator of catalogus leeg is.
- category browse:
  - gekozen categorie;
  - breadcrumb/path;
  - directe subcategorieën;
  - directe producten, max 50;
  - cursor/hasMore.
- brand result:
  - gekozen merk;
  - producten gegroepeerd onder categorieheaders;
  - max 50 per getoonde lijst of cursor per groep.
- product row/card:
  - `id`;
  - `displayName`;
  - `brand` nullable;
  - `packageSummary`;
  - optioneel `categoryPath` wanneer de state dat nodig heeft.

### Stap 2 — Backend endpoints maken

Waarschijnlijke endpointvormen:

- `GET /products?categoryId=&brandId=&cursor=` voor browse/result states;
- `GET /products/search?...` voor tekstzoeken volgens het zoekplan.

Backendregels:

- Zonder query/context retourneert rootcategorieën, geen platte productlijst.
- Met `categoryId`: directe subcategorieën en directe producten in die categorie; geen producten uit subcategorieën.
- Met `brandId`: producten van merk, gegroepeerd per categorie.
- Productlimiet eerste versie: 50 per productlijst.
- Bereken verpakkingssamenvatting uit `product_package`, `package_type`, `unit_content`, `unit_type`.
- Sorteer deterministisch, bijvoorbeeld categoriepad en productdisplaynaam case-insensitive.

### Stap 3 — Frontend state-machine per URL

Modelleer de route als expliciete states:

- `root` wanneer geen `q`, `brandId` of `categoryId`;
- `textSearch` wanneer `q` minimaal twee tekens heeft;
- `brandResult` wanneer `brandId` aanwezig is;
- `categoryBrowse` wanneer `categoryId` aanwezig is;
- `invalidContext` wanneer gekozen brand/category niet bestaat.

Regels:

- `brandId` en `categoryId` winnen alleen wanneer `q` niet aanwezig is; klikken vanuit zoekresultaten verwijdert `q`.
- Zoekbalk is leeg in brand/category-state.
- Geen filterchips of inline merkexpand.

### Stap 4 — UI bouwen

- Root:
  - titel `Productcatalogus` / `Producten`;
  - zoekveld;
  - rootcategorieën;
  - `Product aanmaken` of lege catalogus `Eerste product aanmaken`.
- Categorie-browse:
  - breadcrumb/path;
  - subcategorieën;
  - directe producten;
  - `Product aanmaken in <laatste categorienaam>`.
- Brand-result:
  - `Producten van <merk>`;
  - categorieheaders met productrijen;
  - `Product aanmaken voor <merk>`.
- Productrijen linken naar productdetail.
- Meer-laden per productlijst wanneer `hasMore` true is.

### Stap 5 — Contextueel product aanmaken

- Root/typed search: link naar `/nieuw` zonder query.
- Categorie-browse: link naar `/nieuw?categoryId=<id>`.
- Brand-result: link naar `/nieuw?brandId=<id>`.
- Gebruik typed zoekterm nooit als product-, merk- of categorie-prefill.

### Stap 6 — Tests

- Backend:
  - root zonder platte productlijst;
  - directe producten per categorie;
  - parentcategorie toont geen subcategorieproducten;
  - brand-result gegroepeerd per categorie;
  - productlimiet en cursor/hasMore.
- Frontend:
  - AC-01 t/m AC-08;
  - URL-state transitions;
  - contextuele create links;
  - productrijlink naar detail.

## Acceptatiecriteria

- Root toont categorieën en geen platte lijst met alle producten.
- Category browse toont directe subcategorieën en directe producten.
- Brand result toont producten van merk gegroepeerd per categorie, zonder merkchip.
- Er is altijd één primaire `Product aanmaken` actie met alleen expliciete context.
- Geen oude trapsgewijze productmanagement-flow keert terug.
