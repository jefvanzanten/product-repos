# Plan — Backendrepositories en domeingrenzen vereenvoudigen

## Status

Uitgevoerd.

Dit plan legt een backendbrede architectuurbeslissing vast die de eerdere scheiding tussen losse repositorycontractbestanden en `drizzle-*`-implementatiebestanden vervangt. De functionele module-indeling, composition root, services, pure domeincode en dependency injection blijven behouden.

## Besluit

De backend gebruikt per functionele module de directe keten:

```text
route → service → repository → database
```

Daarbij geldt:

- één repositorybestand bevat de capabilitytypen, persistence-records en huidige Drizzle-implementatie van één samenhangende persistenceverantwoordelijkheid;
- repositorybestanden krijgen technologieneutrale namen zoals `consumption-log.repository.ts`, niet `drizzle-consumption-log.repository.ts`;
- de factory krijgt eveneens een technologieneutrale naam, bijvoorbeeld `createConsumptionLogRepository(database)`;
- services ontvangen het gemaakte repositoryobject via dependency injection en importeren alleen de bijbehorende TypeScripttypen;
- tests mogen een structurele fake maken die aan hetzelfde repositorytype voldoet;
- pure bedrijfsregels staan onder `domain/`, niet in repositories;
- `src/db/` blijft uitsluitend eigenaar van gedeelde database-infrastructuur, schema’s, migraties en seeds;
- repositories blijven functionele factories; er komen geen repositoryclasses, base repository of DI-container.

Een afzonderlijke interfacefile en Drizzle-file worden pas geïntroduceerd wanneer er daadwerkelijk een tweede productie-implementatie of een onafhankelijke packagegrens bestaat. Testfakes alleen zijn daarvoor geen voldoende reden.

## Aanleiding

De huidige backend heeft twee repositoryconventies naast elkaar:

1. enkele catalogusrepositories bevatten hun type en Drizzle-queries al in één bestand;
2. Calorie Tracker, Inventory en Locations scheiden een contract- of storebestand van een `drizzle-*`-bestand.

Daardoor ontstaan onder andere:

- twee bestanden voor één huidige repository-implementatie;
- een brede `calorie-tracker-store.ts` met log-, doel- en gerechtverantwoordelijkheden;
- wisselende namen als `Repository`, `Reader` en `Store` voor vergelijkbare persistencegrenzen;
- factories met `createDrizzle*` terwijl er geen alternatieve productie-implementatie bestaat;
- een `catalog/internal`-map naast `catalog/repositories` zonder blijvend betekenisvol onderscheid;
- architectuurdocumentatie die een compile-time contract als een afzonderlijke laag presenteert;
- een catalogusproductroute die nog rechtstreeks een repository ontvangt en daarmee de gekozen route → service → repository-keten omzeilt.

De extra bestanden leveren op dit moment geen extra runtime-isolatie op. TypeScripttypen worden verwijderd tijdens compilatie en services roepen het geïnjecteerde repositoryobject al rechtstreeks aan.

## Doelen

1. Eén herkenbare repositoryconventie voor de hele backend.
2. Per actuele persistencecapability één technologieneutraal repositorybestand.
3. Pure domeinregels aantoonbaar onder de domeinmap houden of daarheen verplaatsen.
4. Alle functionele HTTP-use-cases via route → service → repository laten lopen.
5. Databaseverbindingen en Drizzle-resources centraal in composition laten ontstaan.
6. Huidig publiek gedrag, transacties, queries, foutcodes en contracten behouden.
7. Eerdere architectuurdocumentatie corrigeren zonder historische plannen stilzwijgend te herschrijven.

## Niet-doelen

- Geen nieuwe feature, endpoint of contractwijziging.
- Geen databasekolom, migratie of seed wijzigen.
- Geen overstap van Drizzle of SQLite.
- Geen repositoryclass of inheritance introduceren.
- Geen generieke repository per tabel maken.
- Geen `ports`, `adapters`, `infrastructure` of `data`-mappenboom toevoegen.
- Geen databaseverbinding in een repository openen of sluiten.
- Geen domeinentiteiten invoeren waar eenvoudige immutable records voldoende zijn.
- Geen repositoryrecords automatisch naar `domain/` verplaatsen alleen omdat services ze gebruiken.
- Geen bestaande module opsplitsen naar een microservice of package.
- Geen frontendwijzigingen.

## Architectuurregels

### 1. Module eerst, lagen daarbinnen

De bestaande functionele modules blijven leidend:

```text
modules/<module>/
  domain/         # pure regels en berekeningen
  repositories/   # data-accesscapabilities en huidige implementatie
  services/       # use-cases en orchestration
  routes/         # HTTP en transportmapping
```

Kleine modules hoeven geen lege map te krijgen. Auth gebruikt bijvoorbeeld een adapter voor Better Auth en Health gebruikt een geïnjecteerde readinessprobe; zij krijgen niet kunstmatig een repository.

### 2. Eén bestand per repositorycapability

Een repositorybestand bevat alleen wat nodig is voor één samenhangende persistenceverantwoordelijkheid:

```ts
export type ConsumptionLogRecord = { /* persistencevorm */ };

export type ConsumptionLogRepository = {
  readonly findLogById: (logId: string) => ConsumptionLogRecord | undefined;
  readonly insertLog: (input: ConsumptionLogRecord) => ConsumptionLogRecord | undefined;
};

export function createConsumptionLogRepository(
  database: BackendDatabase,
): ConsumptionLogRepository {
  // Private Drizzle-queries en het geretourneerde repositoryobject.
}
```

De aanwezigheid van Drizzle-imports in dit bestand is bewust. De technologieneutrale publieke naam beschrijft de rol in de applicatie; de implementatiekeuze is intern aan de backend.

### 3. Geen brede storeverzamelbestanden

Een bestand als `calorie-tracker-store.ts` mag niet meerdere zelfstandig veranderende capabilities verzamelen. Logpersistence, voedingsdoelen en gerechten worden afzonderlijke repositories.

Opsplitsing gebeurt per use-case- en transactiegrens, niet per tabel. Een atomische operatie over meerdere tabellen blijft één repositorymethode.

### 4. Domain blijft puur

Onder `domain/` staan uitsluitend regels die zonder Hono, Drizzle, databaseverbinding of filesystem uitgevoerd kunnen worden, zoals:

- validatie en canonicalisatie;
- exacte decimaalberekeningen;
- hoeveelheids- en voedingsberekeningen;
- datum- en tijdzoneregels;
- boom-, pad- en archiveerprojecties;
- product- en receptinvarianten.

Persistence-records, insert/update-values en transaction-scoped querycapabilities blijven in het repositorybestand. Een `*Record`, `*Row` of `*Transaction` is niet automatisch een domeintype.

Databaseconstraints mogen dezelfde invariant als defensieve opslaggrens bewaken. De deterministische bedrijfsregel blijft desondanks in domain of service; de repository vertaalt geen HTTP-statussen.

### 5. Service is de application boundary

Routes mogen geen repository ontvangen of importeren. Zij:

- parsen transportdata;
- lezen auth- en requestcontext;
- roepen een servicecapability aan;
- vertalen het resultaat naar HTTP.

Services:

- bewaken de use-casevolgorde;
- gebruiken pure domainfuncties;
- ontvangen repositories als objecten;
- importeren repositorytypen met `import type`;
- importeren niet rechtstreeks uit `db/` of `drizzle-orm`.

Een service moet meer zijn dan alleen een naamloze doorgeeflaag. Bestaande requestnormalisatie, use-casevalidatie, foutclassificatie of orchestration die nu in een route of repository zit, wordt waar nodig naar de service/domain-grens gebracht.

### 6. Composition bezit resources

`src/composition.ts` blijft de enige production composition root:

```text
createDatabase(config)
  → createXRepository(database)
  → createXService(repository)
  → xRoutes(service)
```

Repositories ontvangen `BackendDatabase`; zij maken geen verbinding aan, sluiten geen verbinding en lezen geen `process.env`.

### 7. `db/` is geen featuredump

`src/db/` bevat:

- databasefactory en technische verbindingstypen;
- Drizzle-schema’s;
- migraties en migration runners;
- seeds;
- generieke technische databasehelpers als daar meerdere actuele gebruikers voor bestaan.

Featurequeries blijven bij de bezittende module. Een query voor consumptielogs verhuist dus niet naar `db/` alleen omdat hij Drizzle gebruikt.

### 8. Fakes zonder tweede productielaag

Een servicetest mag een objectliteral maken:

```ts
const repository: ConsumptionLogRepository = {
  findLogById: () => undefined,
  insertLog: (input) => input,
};
```

Daarvoor is geen aparte contractfile, mockclass of in-memory repositorymodule nodig. Een gedeelde fake ontstaat alleen wanneer meerdere tests aantoonbaar dezelfde stateful fake nodig hebben.

## Doelstructuur per module

### Calorie Tracker en Recipes

```text
modules/calorie-tracker/
  domain/
    decimals.ts
    dates-and-timezones.ts
    consumption-quantity.ts
    nutrition.ts
  repositories/
    consumption-log.repository.ts
    nutrition-goal.repository.ts
  services/
  routes/

modules/recipes/
  domain/
    recipe-domain.ts                 # alleen als geëxtraheerde pure regels dit rechtvaardigen
  repositories/
    dish.repository.ts
  services/
  routes/
```

Voorgenomen wijzigingen:

- verdeel `calorie-tracker-store.ts` over de drie repositories die de typen daadwerkelijk bezitten;
- voeg contract en queries uit `drizzle-consumption-log.repository.ts` samen in `consumption-log.repository.ts`;
- voeg contract en queries uit `drizzle-nutrition-goal.repository.ts` samen in `nutrition-goal.repository.ts`;
- verplaats gerechtrecords, `DishRepository` en de huidige Drizzle-queries naar `recipes/repositories/dish.repository.ts`, omdat Recipes de CRUD-lifecycle van gerechten bezit;
- laat Calorie Tracker-services de expliciete `DishRepository`-capability uit Recipes ontvangen zolang logs en unified search actuele gerechten moeten projecteren;
- verwijder `calorie-tracker-store.ts` nadat alle imports zijn gemigreerd;
- verwijder `calorie-tracker/services/dish.service.ts` alleen wanneer een repositorybrede importercontrole bevestigt dat de huidige Recipes-service hem volledig heeft vervangen;
- splits `calorie-tracker-domain.ts` uitsluitend langs de vier reeds aanwezige pure verantwoordelijkheden: decimalen, datum/tijdzone, hoeveelheidsconversie en voeding;
- verplaats pure receptnormalisatie en receptvergelijking uit `recipe.service.ts` naar `recipes/domain/recipe-domain.ts` wanneer zij onafhankelijk van contracts/persistence te testen zijn;
- behoud responseprojecties in services zolang zij API-contracten projecteren en geen zelfstandig domeinmodel zijn.

De cross-module afhankelijkheid van Calorie Tracker naar `DishRepository` wordt expliciet gedocumenteerd. Er komt niet aanvullend een `DishReader` naast dezelfde repository zolang die geen concrete ongewenste afhankelijkheid wegneemt.

### Catalog

```text
modules/catalog/
  domain/
  repositories/
    brand.repository.ts
    category.repository.ts
    reference-data.repository.ts
    product-v2.repository.ts
    consumption-catalog.repository.ts
  services/
    catalog-reference.service.ts
    product-v2.service.ts
    product-image.service.ts
  routes/
```

Voorgenomen wijzigingen:

- verplaats de repositorybestanden uit `catalog/internal/` naar `catalog/repositories/`;
- hernoem meervoudige bestandsnamen naar de capabilitynaam waar dit zonder betekenisverlies kan;
- hernoem factories van `createDrizzle*` naar `create*Repository`;
- voeg `consumption-catalog-reader.ts` en `drizzle-consumption-catalog-reader.ts` samen tot `consumption-catalog.repository.ts`;
- behoud een gericht `ConsumptionCatalogReader`-type in dat bestand als dit de werkelijk benodigde readcapability het duidelijkst uitdrukt; de bestandsgrens hoeft niet dezelfde naam als ieder geëxporteerd type te hebben;
- vervang de directe `productV2Routes(repository)`-koppeling door een echte `ProductV2Service`;
- verplaats businessnormalisatie en macro-/productvalidatie uit `product-v2.routes.ts` naar domain/service; Zod- en queryparameterparsing blijven in de route;
- geef `catalog-reference.service.ts` een werkelijke application-verantwoordelijkheid door bestaande normalisatie, foutclassificatie en use-casekeuzes daar te laten plaatsvinden; behoud hem niet uitsluitend als object-spreadfacade;
- laat productafbeeldingen als huidige filesystemservice bestaan zolang er geen persistencecontract nodig is. Niet iedere I/O-operatie hoeft geforceerd een repository te worden.

### Inventory

```text
modules/inventory/
  domain/
    inventory-domain.ts
  repositories/
    inventory.repository.ts
    inventory-mutation.repository.ts
  services/
  routes/
```

Voorgenomen wijzigingen:

- voeg `inventory-reader.ts` en `drizzle-inventory.repository.ts` samen tot `inventory.repository.ts`;
- behoud `InventoryReader` als gericht type of hernoem het naar `InventoryRepository` wanneer alle actuele methoden gezamenlijk één readrepository vormen;
- voeg `inventory-mutation-store.ts` en `drizzle-inventory-mutation.repository.ts` samen tot `inventory-mutation.repository.ts`;
- hernoem `InventoryMutationStore` en `InventoryMutationTransaction` naar repositorynamen wanneer dit alle callsites duidelijker maakt;
- behoud de transaction-scoped capability intern/publiek in hetzelfde bestand, omdat de service de atomische callback gebruikt;
- behoud alle decimaal-, voorraad-, ratio- en houdbaarheidsregels in `domain/inventory-domain.ts`;
- verplaats geen read-modelprojecties naar domain wanneer zij uitsluitend contractresponses bouwen.

### Locations

```text
modules/locations/
  domain/
    location-domain.ts
  repositories/
    location.repository.ts
  services/
  routes/
```

Voorgenomen wijzigingen:

- voeg `location-store.ts` en `drizzle-location.repository.ts` samen tot `location.repository.ts`;
- hernoem `LocationStore` en `LocationTransactionStore` naar `LocationRepository` en `LocationTransactionRepository` als dit de gekozen conventie consequent maakt;
- behoud boomprojectie, naamnormalisatie, cyclus- en archiveerregels in `domain/location-domain.ts`;
- behoud unieke-constraintclassificatie bij de persistence/application boundary zonder databasespecifieke errors naar routes te lekken.

### Auth en Health

Auth en Health krijgen geen repository alleen voor symmetrie.

Voorgenomen wijzigingen:

- verplaats de pure rolregel uit `auth/services/role.service.ts` naar bijvoorbeeld `auth/domain/role.ts`;
- behoud sessieresolutie als service en Better Auth als externe adapter;
- behoud database-readiness als geïnjecteerde technische capability voor Health;
- voeg geen authrepository rond Better Auth toe zolang de backend die opslag niet zelf bezit.

## Bestandsimpact

### Samenvoegen en hernoemen

| Huidige bestanden | Doelbestand |
| --- | --- |
| `calorie-tracker-store.ts` + `drizzle-consumption-log.repository.ts` | `calorie-tracker/repositories/consumption-log.repository.ts` |
| `calorie-tracker-store.ts` + `drizzle-nutrition-goal.repository.ts` | `calorie-tracker/repositories/nutrition-goal.repository.ts` |
| `calorie-tracker-store.ts` + `drizzle-dish.repository.ts` | `recipes/repositories/dish.repository.ts` |
| `consumption-catalog-reader.ts` + `drizzle-consumption-catalog-reader.ts` | `catalog/repositories/consumption-catalog.repository.ts` |
| `inventory-reader.ts` + `drizzle-inventory.repository.ts` | `inventory/repositories/inventory.repository.ts` |
| `inventory-mutation-store.ts` + `drizzle-inventory-mutation.repository.ts` | `inventory/repositories/inventory-mutation.repository.ts` |
| `location-store.ts` + `drizzle-location.repository.ts` | `locations/repositories/location.repository.ts` |

De catalogusbestanden onder `internal/` worden naar `repositories/` verplaatst en behouden hun bestaande inhoudelijke capabilitygrenzen. Exacte singularisering wordt tijdens implementatie repositorybreed gecontroleerd om onnodige renamechurn te voorkomen.

### Waarschijnlijk toevoegen

```text
apps/backend/src/modules/catalog/services/product-v2.service.ts
apps/backend/src/modules/recipes/domain/recipe-domain.ts
apps/backend/src/modules/recipes/repositories/dish.repository.ts
```

De voorgestelde opsplitsing van `calorie-tracker-domain.ts` mag in minder bestanden eindigen wanneer twee onderwerpen na importercontrole niet onafhankelijk wijzigen of gebruiken. De verantwoordelijkheidsscheiding is leidend, niet het genoemde aantal bestanden.

## Implementatiefasen

### Fase 0 — Baseline en actieve wijzigingen beschermen

1. Behandel de huidige staged productmodel-v2-, Inventory-, Recipe- en Calorie Tracker-wijzigingen als actieve user changes; reset, checkout of herschrijf ze niet.
2. Maak een actuele importkaart van alle repository-, store-, reader- en `createDrizzle*`-symbols in `src`, jobs en tests.
3. Leg de huidige typecheck, gerichte moduletests en `git diff --check` vast zonder een devserver te starten.
4. Controleer per voorgenomen samenvoeging dat er exact één productie-implementatie bestaat.
5. Inventariseer transacties en atomische multi-table-operaties zodat geen bestandsmove die grenzen verbreekt.

### Fase 1 — Architectuurbesluit documenteren en lint voorbereiden

1. Werk `docs/backend/BACKEND_ARCHITECTUUR.md` bij met de nieuwe directe keten en één-bestand-per-repositoryconventie.
2. Pas ESLint pas aan nadat de eerste module bewijst dat de nieuwe imports werken.
3. Behoud het verbod op rechtstreekse `drizzle-orm`-, `db/`- en Hono-imports vanuit services/domain.
4. Verwijder regels die services verbieden een bestandsnaam met `drizzle-*` te importeren zodra die bestandsnamen verdwijnen.
5. Verbied routes backendbreed om uit `repositories/` te importeren.
6. Activeer of bevestig `@typescript-eslint/consistent-type-imports`, zodat service-imports van repositorytypen compile-time-only blijven.
7. Behoud het bestaande classverbod; deze migratie introduceert geen classes.

### Fase 2 — Calorie Tracker en Recipes als referentieslice

1. Maak eerst de drie capabilitygerichte doelbestanden zonder gedrag of signatures te wijzigen.
2. Verplaats elk bijbehorend type en record uit `calorie-tracker-store.ts` naar zijn eigenaar.
3. Verplaats de querycode uit de drie `drizzle-*`-bestanden naar dezelfde doelbestanden.
4. Hernoem factories en pas composition, jobs, services en tests mechanisch aan.
5. Verplaats gerechtpersistence naar Recipes en werk de expliciete cross-module type-imports bij.
6. Splits pure Calorie Tracker-domaincode per onderwerp en behoud alle bestaande pure tests; voeg alleen ontbrekende gerichte tests toe.
7. Controleer `dish.service.ts` op echte consumers en verwijder hem alleen als hij dood is.
8. Verwijder de oude store- en Drizzle-bestanden nadat `rg` geen import meer vindt.

**Acceptatie:** Calorie Tracker- en Recipe-routes lopen via services naar technologieneutraal benoemde repositories; geen breed storebestand of `drizzle-*`-repositorybestand resteert in deze modules.

### Fase 3 — Inventory en Locations migreren

1. Voeg per capability contract, records, transactiontypen en queries samen.
2. Hernoem factories en alleen de store/reader-typen waarvan de naam de verantwoordelijkheid aantoonbaar verduidelijkt.
3. Pas services en servicetests aan naar type-only imports uit de nieuwe repositorybestanden.
4. Behoud fakes als objectliterals; introduceer geen fakeclasses.
5. Verifieer transaction callbacks, optimistic versioning, auditwrites, archive inheritance en unique-conflictmapping.
6. Verwijder de oude splitbestanden na importercontrole.

**Acceptatie:** Inventory en Locations volgen dezelfde repositoryconventie zonder wijziging van transacties of domeinregels.

### Fase 4 — Catalogus normaliseren en ontbrekende servicelaag herstellen

1. Verplaats de vier actuele `internal`-repositories naar `repositories` en hernoem alleen factories/imports.
2. Voeg catalogusreadercontract en Drizzle-querycode samen.
3. Introduceer `ProductV2Service` tussen productroutes en productrepository.
4. Verplaats bestaande businessnormalisatie en use-casefoutclassificatie naar catalog domain/service; houd HTTP-parsing in routes.
5. Maak `CatalogReferenceService` inhoudelijk verantwoordelijk of splits hem in bestaande samenhangende servicecapabilities; verwijder een facade die uitsluitend repositories spreadt.
6. Behoud atomische product/composition/macro-operaties in de repository.
7. Controleer dat geen catalogusroute nog een repositorytype ontvangt.
8. Verwijder `catalog/internal` wanneer die map leeg is.

**Acceptatie:** iedere catalogusroute ontvangt alleen services/middleware en iedere repository staat onder `catalog/repositories` met een technologieneutrale naam.

### Fase 5 — Auth, composition en backendbrede consistentie

1. Verplaats pure authrolpolicy naar `auth/domain`.
2. Hernoem alle resterende `createDrizzle*Repository`-calls naar technologieneutrale factories.
3. Houd `createDatabase` uitsluitend in composition, jobs en technische database-entrypoints.
4. Controleer dat repositoryfactories geen environment lezen en geen resources openen.
5. Controleer backendbreed de keten route → service → repository voor functionele endpoints.
6. Leg uitzonderingen vast voor Better Auth, filesystemafbeeldingen en Health; forceer daar geen nep-repository.
7. Verwijder achtergebleven compatibilityexports en lege mappen na repositorybrede importercontrole.

### Fase 6 — Documentatie reconciliëren

Voer de hieronder beschreven documentwijzigingen uit. Historische plannen krijgen een korte supersession-notitie; zij worden niet volledig herschreven alsof hun eerdere besluit nooit bestaan heeft.

### Fase 7 — Gerichte eindverificatie

1. Draai backendtypecheck en lint.
2. Draai pure domain- en servicetests per geraakte module.
3. Draai repository-/route-integratietests per module met de tijdelijke SQLite-testdatabase.
4. Draai backendbuild.
5. Gebruik `rg` om oude bestanden, `createDrizzle*Repository`, `*Store`-namen die bewust vervallen en route-naar-repositoryimports te vinden.
6. Draai `git diff --check`.
7. Start, stop of herstart geen devserver.

## Documentatiewijzigingen

### `docs/backend/BACKEND_ARCHITECTUUR.md`

Dit is de actuele normatieve architectuurdocumentatie en moet inhoudelijk worden aangepast:

- verander het dependencydiagram naar `routes → services → repositories → database`;
- leg uit dat repositorytype en huidige Drizzle-implementatie in hetzelfde capabilitybestand staan;
- verwijder de regel dat services alleen losse repositorycontractbestanden mogen importeren;
- voeg toe dat services repositorytypen uitsluitend met `import type` importeren en repositoryobjecten geïnjecteerd ontvangen;
- vervang verwijzingen naar concrete `drizzle-*`-adapters door technologieneutraal benoemde repositoryfactories;
- beschrijf `domain/` als eigenaar van pure regels en `repositories/` als eigenaar van persistence-records, queries en atomiciteit;
- documenteer waarom featurequeries niet onder `src/db/` staan;
- documenteer de expliciete huidige cross-module afhankelijkheden: consumption catalog en gerechten;
- behoud composition, resourceownership, foutafhandeling en HTTP-shellafspraken.

### `apps/backend/README.md`

Kleine terminologische update:

- vervang “persistence-adapters” door “repositories”;
- behoud de verwijzing naar `BACKEND_ARCHITECTUUR.md`;
- voeg geen tweede architectuuruitleg toe aan de README.

### `docs/plans/backend-fundament-modulaire-architectuurplan.md`

Dit plan bevat het oude normatieve contract/Drizzle-bestandsbesluit. Voorgestelde wijziging:

- markeer de algemene modulaire migratie als uitgevoerde/historische basis waar dat overeenkomt met de actuele code;
- voeg bovenaan een duidelijke notitie toe dat de repositorybestandsconventie, dependencydiagrammen en `drizzle-*`-naamgeving zijn vervangen door dit plan;
- link naar `backend-repository-en-domainvereenvoudigingsplan.md`;
- herschrijf niet alle historische implementatiefasen.

### `docs/plans/yagni-dry-single-responsibility-opruimplan.md`

Dit plan beschrijft expliciet de losse `calorie-tracker-store.ts`- en `drizzle-*`-bestanden. Voorgestelde wijziging:

- voeg een supersession-notitie toe bij “Calorie Tracker-persistence”, fase 4, verwachte bestandsimpact en definition of done;
- leg vast dat de inhoudelijke splitsing per capability behouden blijft, maar contract en Drizzle-code per capability in één repositorybestand samenkomen;
- verwijs naar dit backendbrede plan voor de uiteindelijke naamgeving.

### `docs/plans/calory-tracker-architectuur-en-routes-verbeterplan.md`

Dit uitgevoerde historische plan blijft grotendeels intact. Voorgestelde wijziging:

- voeg alleen een korte vervolgnotitie toe dat de toen ingevoerde persistence-port en Drizzle-adapter later in één repositorybestand worden samengevoegd;
- verander geen historische status, requirements of routebesluiten.

### `docs/plans/specs-implementatieplan-index.md`

Geen verplichte wijziging: deze index koppelt productspecificaties aan featureplannen en dit plan verandert geen productfeature. Voeg alleen een link toe wanneer de repository een algemene architectuurplan-index introduceert; maak daarvoor niet uitsluitend een nieuwe indexsectie.

### Endpoint-, ERD- en domeindocumentatie

Geen inhoudelijke wijzigingen verwacht in:

```text
docs/backend/Endpoints/*
docs/backend/ERD/*
docs/domein/*
docs/specs/*
```

De migratie verandert geen publiek API-gedrag, datamodel of bedrijfsregel. Als implementatie toch een gedragsverschil vereist, stopt die wijziging en krijgt zij eerst een afzonderlijk functioneel besluit plus de bijbehorende documentupdate.

## Teststrategie

### Pure domain

- behoud en verplaats bestaande Calorie Tracker-, Inventory- en Location-domaintests mee met de functies;
- voeg gerichte Recipe-domaintests toe als pure regels uit de service worden geëxtraheerd;
- test geen Drizzle- of responseprojectie via domaintests.

### Services

- gebruik getypeerde objectfakes uit het gecombineerde repositorybestand;
- bewijs dat services zonder echte database samengesteld kunnen worden;
- behoud foutvolgorde, ownership, idempotentie, optimistic concurrency en projectiefouten;
- voeg voor de nieuwe catalogusproductservice tests toe voor de uit routes verplaatste validatie en foutmapping.

### Repositories en routes

- gebruik de echte tijdelijke SQLite-database voor queries, joins, constraints en transacties;
- behoud bestaande route-integratietests als bewijs voor ongewijzigde statuscodes en responsecontracten;
- voeg geen dubbele test toe alleen omdat contract en implementatie nu in één bestand staan.

### Gerichte verificatiecommando’s

```text
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter @product-repos/backend lint
corepack pnpm --filter @product-repos/backend exec bun test <geraakte testbestanden>
corepack pnpm --filter @product-repos/backend build
```

Selecteer per fase alleen de geraakte backendtests. Stop wanneer pnpm dependencyherstel of verwijdering van `node_modules` vraagt.

## Risico’s en mitigaties

| Risico | Mitigatie |
| --- | --- |
| Samenvoegen wordt verward met het verwijderen van dependency injection. | Services blijven repositoryobjecten ontvangen; alleen de bronbestanden worden samengevoegd. |
| Services raken rechtstreeks aan Drizzle gekoppeld. | Alleen `import type` uit repositories; lint verbiedt directe `drizzle-orm`- en `db/`-imports in services. |
| Een gecombineerd repositorybestand wordt te groot. | Splits per capability/use-casegrens, niet opnieuw per interface versus implementatie. Private queryhelpers mogen naar een lokale helperfile wanneer aantoonbaar meerdere repositories ze delen. |
| Pure bedrijfsregels blijven in repositories zitten. | Audit elke repositoryfunctie; deterministische regels gaan naar domain/service, rowmapping en atomiciteit blijven in repository. |
| Repositorytypes lekken ruwe schema-infer-types naar services. | Exporteer expliciete persistence-/read-records waar de service ze nodig heeft; houd onnodige Drizzle-inferred rows private. |
| Gerechtownership veroorzaakt ongewenste cross-moduleimports. | Recipes bezit CRUD-persistence; Calorie Tracker ontvangt dezelfde expliciete capability via composition. Voeg geen tweede adapter toe zonder concrete noodzaak. |
| Nieuwe catalogusservice wordt een pass-throughlaag. | Verplaats bestaande use-casevalidatie en foutclassificatie uit routes; maak geen service als er werkelijk geen applicationverantwoordelijkheid bestaat. |
| Factoryrename creëert een grote moeilijk reviewbare diff. | Migreer per module en houd mechanische rename gescheiden van logicaverplaatsing. |
| Actieve productmodel-v2-wijzigingen worden overschreven. | Werk uitsluitend op de actuele working tree, behoud staged/user changes en gebruik geen reset/checkout. |
| Historische docs spreken de nieuwe norm tegen. | Update de normatieve architectuurdoc en voeg expliciete supersession-notities aan oude plannen toe. |

## Definition of done

- De normatieve backendketen is `route → service → repository → database`.
- Iedere functionele route ontvangt services of middleware, geen repository.
- Per actuele persistencecapability bestaat één technologieneutraal repositorybestand met type, records en huidige Drizzle-factory.
- Er zijn geen `drizzle-*.repository.ts`-bestanden meer.
- Er is geen breed `calorie-tracker-store.ts` meer.
- De catalogus gebruikt niet langer een parallelle `internal`-repositorymap.
- Repositoryfactories openen geen database en lezen geen environment.
- Services importeren geen Hono, Drizzle of `db/` en gebruiken repositorytypen via type-only imports.
- Pure bedrijfsregels staan in module-domainbestanden; persistence-records en transactiecapabilities blijven bij repositories.
- Calorie Tracker, Recipes, Catalog, Inventory en Locations volgen dezelfde conventie.
- Auth en Health hebben alleen repositories wanneer zij daadwerkelijk eigen persistence bezitten.
- Servicefakes blijven eenvoudige getypeerde objecten; er zijn geen mock- of repositoryclasses toegevoegd.
- Publieke endpoints, schemas, databasevorm, transacties, foutcodes en domeingedrag zijn ongewijzigd.
- `docs/backend/BACKEND_ARCHITECTUUR.md` beschrijft de nieuwe norm.
- Eerdere conflicterende plannen bevatten een duidelijke supersession-notitie.
- Backendtypecheck, lint, build en alle geraakte gerichte tests zijn groen.
- Er is geen devserveractie, dependencyherstel of ongerelateerde formatteringsdiff uitgevoerd.
