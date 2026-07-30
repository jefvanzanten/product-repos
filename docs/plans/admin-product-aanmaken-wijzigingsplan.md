# Wijzigingsplan — product aanmaken spec-compleet maken

Bron: `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md`.

## Statusinschatting

Grotendeels aanwezig:

- backend `POST /products` met transactionele create-flow;
- contracts voor create-product request en created response;
- categorieboom kiezen, inline categorie maken en verwijderen;
- merk zoeken/kiezen/inline aanmaken;
- productnaam en eerste verpakking invullen;
- backendtests voor product aanmaken en duplicate-regels.

Belangrijkste gaps ten opzichte van de spec:

- succesvolle UI toont nu een aangemaakt-blok met JSON in plaats van redirect naar productdetail;
- productdetailroute bestaat nog niet;
- routecontext gebruikt nog `merk` voor brandzoekterm, maar de spec noemt expliciete `brandId` en `categoryId`;
- `brandId` prefill vereist een manier om het merk bij id op te halen of mee te geven;
- cataloguspagina/search mag een typed `q` nooit als prefill meesturen;
- endpointdocument `ProductPackageDto.id` is mogelijk nog niet gelijk aan de actuele contracts/schema-keuze.

## Doel

Maak de bestaande vertical slice volledig conform de spec zonder nieuwe catalogusfeatures in deze pagina te trekken.

## Buiten scope

- Producten bewerken.
- Extra verpakkingen toevoegen of bewerken op de aanmaakpagina.
- Echte cataloguszoekresultaten.
- Productfoto, barcode/EAN, status/publicatie/archief.

## Uitvoerplan

### Stap 1 — Productdetail-minimum beschikbaar maken

- Implementeer of stub eerst `/product-catalogus/producten/:productId` met minimaal read-only gegevens.
- Voeg backend `GET /products/:productId` en contract toe als productdetail nog niet bestaat.
- Deze stap is nodig omdat product-aanmaken volgens de spec moet redirecten naar productdetail.

### Stap 2 — Context-prefill contract kiezen

- Ondersteun `/product-catalogus/producten/nieuw?categoryId=<id>` door bestaande `GET /categories` te gebruiken.
- Ondersteun `/product-catalogus/producten/nieuw?brandId=<uuid>` met één expliciete backendkeuze:
  - voorkeur: `GET /brands/:brandId`; of
  - alternatief: laat de verwijzende pagina voldoende brandcontext server-side resolvebaar maken.
- Leg de gekozen endpointvorm vast voordat frontend hier hard op leunt.

### Stap 3 — Loader/action aanpassen

- Lees `brandId` en `categoryId` uit de URL; gebruik `q` nooit voor prefill.
- Selecteer bestaande categorie wanneer `categoryId` geldig is; toon gewone formulierfout/state wanneer de id niet meer bestaat.
- Selecteer bestaand merk wanneer `brandId` geldig is; laat merk wijzigbaar.
- Vervang succesvolle action-result rendering door `redirect('/product-catalogus/producten/' + created.id)`.
- Verwijder de tijdelijke `CreatedProduct` JSON-eindstate zodra redirect werkt.

### Stap 4 — Formuliergedrag hard maken

- Behoud ingevulde product- en verpakkingsvelden bij fouten van:
  - product opslaan;
  - categorie maken;
  - categorie verwijderen;
  - merk maken.
- Blokkeer opslaan wanneer er tekst in het merkveld staat zonder gekozen bestaand merk of expliciet nieuw merk.
- Normaliseer komma-decimalen naar punt vóór verzending; backend blijft canonicaliseren.

### Stap 5 — Contract- en docdrift controleren

- Controleer `packages/contracts/src/products.ts`, backendresponse en frontendservice op hetzelfde `ProductPackageDto.id`-type.
- Als `docs/backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md` afwijkt, plan een gerichte docs-update in dezelfde slice of vóór implementatie.

### Stap 6 — Tests

- Backend: behoud en breid `apps/backend/tests/product-create.test.ts` uit waar nodig.
- Frontend route/action tests:
  - create zonder context opent leeg;
  - create met `categoryId` selecteert categorie;
  - create met `brandId` selecteert merk;
  - create met `q` doet geen prefill;
  - succesvolle create redirect naar detail;
  - API-fout behoudt ingevulde waarden.
- Service-test blijft bewijzen dat het shared contract geparsed wordt.

## Acceptatiecriteria

- `/product-catalogus/producten/nieuw` opent zonder verplichte zoekstap.
- `brandId` en `categoryId` in de URL worden vooraf geselecteerd en blijven wijzigbaar.
- `q` wordt nooit productnaam-, merk- of categorie-prefill.
- Succesvolle create navigeert naar `/product-catalogus/producten/:productId`.
- De tijdelijke created-JSON is geen eindstate meer.
- Backend- en frontendtests plus typecheck slagen via `corepack pnpm`.
