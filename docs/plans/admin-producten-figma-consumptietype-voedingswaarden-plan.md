# Plan — Figma-productschermen met consumptietype en voedingswaarden

## Aanleiding

Bronnen:

- Figma: `admin-dashboard-products`, nodes `4:74`, `15:200`, `15:260` en `15:353`;
- feature-specs:
  - `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md`;
  - `docs/specs/admin-dashboard/product-catalogus/product-detail-specificatie.md`;
- HTTP-contract: `docs/backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md`;
- datamodel: `docs/backend/ERD/PRODUCT_ERD.md`;
- domeinregels: `docs/domein/productcatalogus-domeinregels.md`.

De admin-app heeft al catalogus-, productaanmaak-, productdetail- en inline bewerkschermen, maar de create- en edit-flow kennen nog geen `consumptionType` of `macroProfile`. De backendcontracts, Drizzle-schema’s, repositories en routes lopen op die punten achter op de actuele endpoint- en ERD-documentatie. Er bestaat één backendtest voor productaanmaak; een afzonderlijke productbewerkingstest ontbreekt.

## Doel

1. De vier genoemde Figma-schermen herkenbaar en responsief toepassen op Product Management Admin.
2. Consumptietype verplicht opslaan en tonen voor create, detail en edit.
3. Een optioneel productmacroprofiel met referentiebasis, calorieën, eiwit, koolhydraten en vet transactioneel opslaan, tonen, wijzigen en uitschakelen.
4. De bestaande productaanmaaktest uitbreiden met deze velden.
5. Een productbewerkingstest toevoegen met dezelfde velden en bewijzen dat de wijziging na opnieuw ophalen bewaard is.

## Buiten scope

- Product- en verpakkingsafbeeldingen.
- Archiveren en herstellen.
- Calorie Tracker-logs of berekende dashboards.
- Een volledige migratie van `product_package.id` van integer naar UUID.
- Multiverpakkingen en `individualPackageTypeId`, behalve waar later apart gepland.
- Nieuwe dependencies of Tailwind; de implementatie blijft React Router, TypeScript en CSS Modules gebruiken.
- Wijzigingen aan specs, endpointdocs of ERD in deze uitvoering zonder afzonderlijke expliciete opdracht.

## Vast te leggen contractkeuzes

Gebruik in protocol, applicatie en opslag de bestaande gedocumenteerde enumwaarden:

```text
consumptionType: FOOD | DRINK | SUPPLEMENT
referenceBasis: PER_100_G | PER_100_ML | PER_UNIT
caloriesSource: AUTOMATIC | MANUAL | null
unit dimension: MASS | VOLUME | COUNT
```

De UI vertaalt deze waarden naar:

```text
FOOD       -> Voeding
DRINK      -> Drinken
SUPPLEMENT -> Supplement
PER_100_G  -> Per 100 g
PER_100_ML -> Per 100 ml
PER_UNIT   -> Per stuk/dosis
```

Decimale macrovelden worden in HTTP als canonieke strings met een punt verstuurd en als `string | null` teruggegeven. De formulieractie accepteert een Nederlandse komma, normaliseert die naar een punt en bewaart lege velden als `null`, niet als nul.

Request en response volgen de gelijknamige `MacroProfile`-shape uit het endpointcontract:

- `MacroProfile`: referentiebasis, vier nullable voedingswaarden en nullable `caloriesSource`;
- `CreateProductRequest`: verplicht `consumptionType`, optioneel/nullable `macroProfile` en de bestaande eerste verpakking;
- `UpdateProductRequest`: verplicht `consumptionType` en expliciet `macroProfile`, waarbij `null` het profiel verwijdert;
- `ProductCreatedDto`, `ProductDetailDto` en `CatalogProductRow`: voegen `consumptionType` toe; create en detail voegen `macroProfile` toe.

De backend vertrouwt de ingestuurde caloriebron niet blind: `AUTOMATIC` wordt opnieuw berekend en gecontroleerd, `MANUAL` vereist een ingestuurde caloriewaarde en bij ontbrekende calorieën blijft de bron `null` totdat een geldige automatische berekening mogelijk is.

## Bevestigde ontwerpbeslissingen

Figma-node `15:260` is leidend voor de bewuste nieuwe volgorde: `Verpakking` staat vóór `Voedingswaarden`. De create-spec wordt daarop aangepast. Hierdoor wordt de referentiebasis gekozen nadat de verpakkingsinhoud bekend is en is de compatibiliteit begrijpelijker.

De Figma-screenshot toont het macroprofiel ingeschakeld om de uitgeklapte staat te demonstreren. De bestaande spec blijft leidend voor de beginstatus: het profiel start uit. Beide toestanden moeten visueel conform Figma worden uitgevoerd.

## Uitvoerplan

### Fase 1 — Contracts en domeinparsing

Pas `packages/contracts/src/products.ts` en `packages/contracts/src/unit-types.ts` aan:

- voeg enum- en schemas toe voor consumptietype, referentiebasis, caloriebron en eenheiddimensie;
- voeg de gedocumenteerde `MacroProfile`-shape toe en gebruik gerichte request-/response-schemanamen rond diezelfde protocolvelden;
- breid create-, update-, created-, detail- en catalogusshapes strict uit;
- breid `UnitTypeDto` uit met `symbol`, `dimension` en `conversionToBase`;
- laat de backend de ingestuurde caloriebron semantisch controleren en automatische calorieën zelf herberekenen;
- exporteer alleen de contracten die routes, backend en admin daadwerkelijk gebruiken.

Voeg een cohesieve domeinmodule toe voor macroprofielen, bijvoorbeeld `apps/backend/src/product-catalog/product-macro-profile.ts`. Deze module:

- parseert nullable decimale strings naar canonieke waarden;
- eist bij een ingeschakeld profiel minimaal één waarde groter dan nul;
- berekent calorieën alleen met `4 × eiwit + 4 × koolhydraten + 9 × vet` als alle drie macro’s aanwezig zijn;
- markeert een berekende waarde als `AUTOMATIC` en invoer/correctie door een beheerder als `MANUAL`;
- herberekent een automatische caloriewaarde bij gewijzigde macro’s;
- overschrijft een handmatige caloriewaarde niet;
- koppelt `PER_100_G`, `PER_100_ML` en `PER_UNIT` respectievelijk aan `MASS`, `VOLUME` en `COUNT`;
- retourneert verwachte fouten als getypeerde waarden en gebruikt geen exceptions voor normale validatiefouten.

### Fase 2 — SQLite-schema, migratie en seeds

Breid `apps/backend/src/db/schemas/products.schema.ts` uit:

- `product.consumptionType`: non-null tekstkolom met check op `FOOD`, `DRINK`, `SUPPLEMENT`;
- `unit_type.symbol`, `unit_type.dimension` en `unit_type.conversionToBase` volgens de ERD;
- nieuwe tabel `product_macro_profile` met één-op-nul/één-relatie naar `product`;
- nullable macrovelden en caloriebron;
- checks voor niet-negatieve waarden, minimaal één positieve waarde en consistente combinatie van calorieën met caloriebron;
- `createdAt` en `updatedAt` op het macroprofiel.

Maak één nieuwe Drizzle-migratie. De migratie:

1. bouwt `unit_type` opnieuw op en vult de bestaande referentiedata expliciet aan:
   - gram: `g`, `MASS`, `1`;
   - kilogram: `kg`, `MASS`, `1000`;
   - milliliter: `ml`, `VOLUME`, `1`;
   - centiliter: `cl`, `VOLUME`, `10`;
   - liter: `l`, `VOLUME`, `1000`;
   - stuk: `st`, `COUNT`, `1`;
2. voegt `consumption_type` toe en backfillt bestaande producten op basis van de hoofdcategorie: `Dranken`/`Drinken` naar `DRINK`, `Supplementen` naar `SUPPLEMENT` en overige bestaande categorieën naar `FOOD`;
3. maakt daarna de non-null/check-constraint definitief;
4. maakt `product_macro_profile` met alle ERD-checks;
5. behoudt foreign keys en bestaande product- en verpakkingsdata tijdens de SQLite-table rebuilds.

Werk `apps/backend/src/db/seeds/unit-types.seed.ts` en de testfixture in `apps/backend/tests/test-app.ts` bij zodat nieuwe inserts altijd symbool, dimensie en conversiefactor bevatten. Hergebruik de bestaande legacy-tabel `macro_nutrients` niet: die hoort bij het oude variantmodel en heeft niet de productniveau-semantiek uit de actuele ERD.

### Fase 3 — Repository en service

Breid de bestaande productrepository uit in plaats van een repository per tabel te introduceren:

- lees product, merk, categoriepad, verpakkingen en macroprofiel als één productdetailprojectie;
- voeg het macroprofiel in dezelfde transactie toe als product en eerste verpakking;
- update productvelden, consumptietype en macroprofiel in één transactie;
- gebruik upsert bij een ingeschakeld profiel en delete bij `macroProfile: null`;
- lever voor validatie de dimensies van alle verpakkingen van een product;
- projecteer opslagrecords naar de contract-DTO’s en laat ruwe Drizzle-records niet buiten de repository lekken;
- voeg `consumptionType` toe aan catalogusprojecties zonder de catalogus-UI onnodig te wijzigen.

Vervang de huidige pass-through/stubinhoud van `apps/backend/src/services/products.service.ts` door de echte create-, read- en update-operaties. De service:

- ontvangt geparste applicatie-input;
- laat de domeinmodule het macroprofiel normaliseren/berekenen;
- controleert bij create de referentiebasis tegen de eerste verpakking;
- controleert bij edit de referentiebasis tegen alle bestaande verpakkingen;
- roept daarna één transactionele repository-operatie aan;
- retourneert onder meer `PRODUCT_MACRO_PROFILE_INVALID` of `UNIT_DIMENSION_INCOMPATIBLE` als getypeerde foutwaarde.

Laat `apps/backend/src/routes/product.route.ts` alleen HTTP-werk doen:

- JSON met de contractschemas parsen;
- kommavrije/canonieke protocolwaarden doorgeven;
- service-resultaten mappen naar de gedocumenteerde statuscodes;
- `UNIT_DIMENSION_INCOMPATIBLE` als `400` en `PRODUCT_MACRO_PROFILE_INVALID` als `409` teruggeven;
- geen calorieformule, dimensieregel of transactielogica in de route dupliceren.

### Fase 4 — Admin server-adapter en formulierprojectie

Werk `apps/product-management-admin/app/api/admin-dashboard-api.server.ts` bij:

- accepteer de nieuwe create- en update-inputs;
- parse productresponses met de Zod-contractschemas in plaats van alleen een generieke TypeScript-cast;
- vertaal de twee nieuwe backendfouten naar veld- of formulierfouten;
- houd cookies, request cancellation en `source`-context zoals nu intact.

Maak een gedeelde, pure FormData-projectie voor create en edit. Deze projectie:

- eist precies één consumptietype;
- zet `macroEnabled` uit naar `macroProfile: null`;
- normaliseert komma-decimalen;
- bewaart het onderscheid tussen leeg en `0`;
- bewaart bij edit de automatische caloriebron totdat de gebruiker het calorieveld zelf wijzigt;
- geeft veldspecifieke fouten terug zonder ingevoerde waarden te verliezen.

### Fase 5 — Herbruikbare productformuliersecties

Haal de herbruikbare delen uit `routes/new-product/new-product.tsx` naar een gerichte productformulierenmap, zonder een generiek componentenframework te maken:

- categorieboom/selectie;
- merk-combobox;
- productnaam;
- consumptietype-radiogroep;
- optionele voedingswaardensectie met toggle;
- referentiebasis-radiogroep;
- vier macrovelden;
- gedeelde primaire/secundaire acties.

Create behoudt daarnaast de verpakkingssectie. Edit gebruikt dezelfde categorie-, merk-, product-, consumptietype- en macrosecties, maar wijzigt geen verpakkingen.

Alle nieuwe en gewijzigde functies krijgen Engelstalige namen en JSDoc. Native inputs blijven semantisch aanwezig; visuele labels en controls zijn volledig met toetsenbord en screenreader bruikbaar.

### Fase 6 — Figma-layout uitvoeren

Vertaal de Figma-output naar CSS Modules; voeg geen Tailwind toe.

#### Gedeelde visuele basis

- achtergrondgradient: `#0e1022` naar `#3e4b93`, met donker middengebied rond 46%;
- desktop contentbreedte: `672px` voor catalogus/detail en `650px` voor create/edit;
- formulierkaarten: `#3b3f61`, radius `18px`;
- inputhoogte: `44px`, witte achtergrond, radius `8px`;
- primaire kleur: `#20a489`;
- geselecteerde radiotegel: achtergrond `#bfece5`, rand `#20a489`;
- tekstkleuren: wit, `#c7c8d5`, `#111425` en `#505466` volgens Figma;
- create/edit-secties krijgen de Figma-ritmes van 40–42px tussen hoofdkaarten;
- onder de bestaande desktopbreakpoint blijven breedtes vloeibaar en stapelen radio- en macrovelden zonder horizontale overflow.

#### Catalogus — node `4:74`

- behoud de bestaande zoekactie, breadcrumb, categorieboom, editactie en createactie;
- lijn zoekveld/zoekknop, witte cataloguskaart, rijhoogtes, schaduwen en vrije ruimte uit met Figma;
- hergebruik `ProductCatalogPage`, `CategoryTree`, `SearchForm`, `CategoryBreadcrumb` en de bestaande adminbroncontext.

#### Productdetail — node `15:200`

- toon `Consumptietype` in `Productgegevens`;
- plaats `Voedingswaarden` als eigen witte kaart tussen productgegevens en verpakkingen;
- toon zonder profiel `Geen macroprofiel toegevoegd` met de actie `Macroprofiel toevoegen`;
- toon met profiel referentiebasis en alleen bekende waarden, waarbij bekende nulwaarden zichtbaar blijven;
- laat `Product bewerken` de bestaande inline bewerkmodus openen;
- splits de huidige omvattende witte kaart in de drie Figma-kaarten.

#### Product aanmaken — node `15:260`

- gebruik titel, subtitel en categorie-breadcrumb uit Figma;
- volg de kaartvolgorde categorie, productnaam, merk, consumptietype, verpakking, voedingswaarden, opslaan;
- start het macroprofiel uit volgens de spec en render de Figma-uitgeklapte staat na inschakelen;
- behoud categorie-inlineacties en merkzoeken, ook als die niet allemaal in de statische Figma-screenshot zichtbaar zijn;
- behoud ingevulde waarden en geopende macrostatus na een fout.

#### Product bewerken — node `15:353`

- vervang de huidige compacte select/editkaart door dezelfde afzonderlijke Figma-kaarten als create;
- vul categorie, merk, productnaam, consumptietype en macroprofiel vanuit `ProductDetailDto` vooraf in;
- toon `Annuleren` links en `Wijzigingen opslaan` rechts in de Figma-verhouding;
- annuleren wijzigt niets en keert terug naar read-only; succes blijft op productdetail en toont de nieuwe waarden.

#### Figma-assets

Bij uitvoering worden de exacte Figma-assets voor potlood, dropdown, geselecteerde radio en toggle-states lokaal onder de admin-app opgeslagen; tijdelijke Figma-URL’s komen niet in productiecode. Controleer eerst of create- en edit-assets bytegelijk zijn en bewaar duplicaten slechts eenmaal. Vraag ontbrekende togglevarianten opnieuw uit Figma op in plaats van ze te tekenen. Behoud per asset zowel de buitenmaat als de glyphmaat; vervang het huidige handgeschreven potlood alleen door de geëxporteerde 18×18-asset.

### Fase 7 — Backendtests

#### Product aanmaken

Breid `apps/backend/tests/product-create.test.ts` uit. De bestaande happy path stuurt voortaan mee:

```json
{
  "consumptionType": "FOOD",
  "macroProfile": {
    "referenceBasis": "PER_100_G",
    "caloriesKcal": "218",
    "proteinG": "7.4",
    "carbohydratesG": "18",
    "fatG": "13.2",
    "caloriesSource": "MANUAL"
  }
}
```

Assert minimaal:

- status `201`;
- `consumptionType` in de create-response;
- alle canonieke macrovelden en `caloriesSource: MANUAL`;
- dezelfde waarden via een daaropvolgende `GET /products/:id`;
- product, eerste verpakking en macroprofiel zijn gezamenlijk opgeslagen.

Voeg gerichte create-cases toe voor:

- geldig product zonder macroprofiel;
- automatische calorieberekening wanneer alleen de drie macro’s zijn ingevuld;
- incompatibele referentiebasis/verpakkingsdimensie, waarbij geen product wordt aangemaakt;
- ingeschakeld maar leeg macroprofiel.

#### Product bewerken

Maak `apps/backend/tests/product-edit.test.ts`, omdat er nog geen edit-test bestaat. Maak eerst via het echte `POST /products`-endpoint een product aan en wijzig het daarna via `PATCH /products/:productId` met:

- een ander `consumptionType`;
- dezelfde vijf voedingsvelden als de create-test, met een passende referentiebasis;
- bestaande naam, categorie en merk volgens het volledige updatecontract.

Assert minimaal:

- status `200`;
- de PATCH-response bevat de gewijzigde waarden;
- een volgende GET bevat exact dezelfde waarden;
- een tweede edit met `macroProfile: null` verwijdert alleen het macroprofiel en behoudt product, verpakking en consumptietype;
- een incompatibele edit geeft de gedocumenteerde fout en laat de vorige product- en macrodata ongewijzigd.

Breid waar nodig `apps/backend/tests/product-catalog.test.ts` uit zodat detail- en catalogusresponses het nieuwe verplichte consumptietype accepteren.

### Fase 8 — UI-verificatie

Controleer in een echte browser op minimaal desktopbreedte en één smalle viewport:

- catalogus komt overeen met node `4:74`;
- productdetail toont consumptietype en lege/gevulde voedingswaardenkaart;
- create kan alle nieuwe velden invullen, behoudt ze na een fout en redirect na succes;
- edit vult dezelfde velden vooraf in, annuleert zonder mutatie en toont na opslaan de bijgewerkte read-only waarden;
- radiogroepen, toggle, velden en acties zijn met toetsenbord bedienbaar;
- de bottom tabs en geldige `source`-query blijven intact;
- er is geen horizontale overflow en de categorieboom houdt zijn eigen scrollgebied.

## Gerichte verificatiecommando’s

Voer niet de volledige workspace-testsuite handmatig uit. Gebruik alleen de featuregerichte controles:

```text
corepack pnpm --filter @product-repos/backend exec bun test tests/product-create.test.ts tests/product-edit.test.ts tests/product-catalog.test.ts
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter product-management-admin typecheck
corepack pnpm --filter product-management-admin build
corepack pnpm run test:specs
```

Stop wanneer pnpm `node_modules` wil verwijderen of opnieuw opbouwen en volg dan `docs/dependency-management.md`.

## Bekende verificatiebaseline

De eenmalige specsuite faalde tijdens het opstellen van dit plan al op twee niet aan dit plan gekoppelde ontbrekende coveragevermeldingen:

- `docs/specs/admin-dashboard/product-catalogus/product-archiveren-specificatie.md`;
- `docs/specs/calorie-tracker/logs/log-detail-bewerken.md`.

Dit plan introduceert geen nieuwe spec en veroorzaakt die failures niet. Los deze twee bestaande coveragegaps in hun eigen plannen/indexwijziging op voordat `corepack pnpm run test:specs` als groene eindvoorwaarde kan gelden.

## Uitvoervolgorde

1. Pas contracts en pure macroprofielregels aan.
2. Voeg migratie, Drizzle-schema en seeds toe.
3. Bouw repository en service transactioneel uit.
4. Sluit routes en admin server-adapter aan.
5. Voeg eerst de backend create/edit-tests toe en maak ze groen.
6. Refactor de gedeelde formuliersecties.
7. Voer catalogus-, detail-, create- en edit-layout uit met de bevestigde Figma-volgorde.
8. Doe gerichte typechecks, backendtests en browserverificatie.

## Acceptatiecriteria

- De vier adminschermen volgen de opgehaalde Figma-nodes zonder Tailwind of tijdelijke externe assets.
- Create vereist exact één consumptietype en kan met of zonder macroprofiel slagen.
- Edit vult consumptietype en macroprofiel vooraf in en kan beide wijzigen; `null` schakelt het profiel uit.
- Detail toont consumptietype en de juiste lege of gevulde voedingswaardenstaat.
- Macroprofiel en product/packaging worden bij create atomair opgeslagen; product en macroprofiel worden bij edit atomair gewijzigd.
- Referentiebasis en alle verpakkingsdimensies zijn compatibel.
- Automatische en handmatige caloriebronnen volgen de domeinregels.
- `product-create.test.ts` consumeert en controleert consumptietype en voedingswaarden.
- `product-edit.test.ts` bestaat en controleert dezelfde velden via PATCH en een daaropvolgende GET.
- Gerichte backendtests, backendtypecheck, admintypecheck, adminbuild en specsuite slagen.

## Spec impact

Voorgestelde wijziging aan `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md`:

- wijzig de introductietekst in de layout naar `Vul categorie, merk, product, voedingswaarden en verpakking in.`;
- wijzig de create-layoutvolgorde naar `Categorie`, `Productnaam`, `Merk`, `Consumptietype`, `Verpakking`, `Voedingswaarden`, `Product opslaan`;
- leg vast dat Figma’s ingeschakelde macroprofiel de uitgeklapte toestand toont, terwijl de initiële toestand uit blijft;
- voeg de concrete Figma-basismaten toe: contentbreedte 650px, formulierkaarten met radius 18px, 44px controls en 40–42px afstand tussen hoofdsecties;
- voeg responsief gedrag toe voor gestapelde radio- en macrovelden onder de desktopbreedte.

Voorgestelde wijziging aan `docs/specs/admin-dashboard/product-catalogus/product-detail-specificatie.md`:

- leg vast dat read-only productgegevens, voedingswaarden en verpakkingen afzonderlijke witte kaarten zijn;
- leg vast dat inline edit dezelfde losse kaartstructuur als create gebruikt, zonder verpakkingsvelden, met een 180px annuleeractie en een flexibel brede primaire opslaanknop op desktop.

Hiermee leggen specificatie en Figma dezelfde bevestigde visuele volgorde en meetbare layout vast.