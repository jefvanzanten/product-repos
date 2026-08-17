# Plan — YAGNI, DRY en Single Responsibility aanscherpen

**Status:** historisch vervolgplan
**Scope:** uitsluitend de actuele staged architectuurwijzigingen opschonen zonder functioneel gedrag, publieke routes, API-contracten of UI te wijzigen.

> **Supersession voor persistence:** de capabilitygerichte splitsing uit dit plan blijft behouden, maar de losse `calorie-tracker-store.ts`- en `drizzle-*`-bestanden zijn vervangen door één technologieneutraal repositorybestand per capability. Zie [Backendrepositories en domeingrenzen vereenvoudigen](backend-repository-en-domainvereenvoudigingsplan.md) voor de uiteindelijke naamgeving, bestandsimpact en definition of done.

## Aanleiding

De modulaire backend- en Calorie Tracker-refactor brengt duidelijke grenzen aan tussen composition, routes, services, domain en persistence. In de huidige uitwerking blijven echter enkele concrete afwijkingen bestaan van drie repositoryregels:

- **YAGNI:** ongebruikte clientcode en tijdelijke interne compatibilitylagen blijven bestaan;
- **DRY:** dezelfde public-pathnormalisatie en dezelfde gekoppelde cache-invalidatie staan op meerdere plaatsen;
- **Single Responsibility:** enkele bestanden combineren persistence, pure domeinlogica of meerdere zelfstandig veranderende use-casegroepen.

Dit plan trekt uitsluitend die waargenomen afwijkingen recht. Het is een gerichte vervolgopschoning op:

- `docs/plans/backend-fundament-modulaire-architectuurplan.md`;
- `docs/plans/calory-tracker-architectuur-en-routes-verbeterplan.md`.

De functionele requirements en bestaande featurespecificaties blijven leidend en ongewijzigd.

## Doelen

1. Verwijder code waarvoor in de huidige repository geen gebruiker bestaat.
2. Verwijder tijdelijke interne doorgeeflagen die binnen dezelfde wijziging kunnen worden vervangen door directe imports.
3. Deel alleen logica die minimaal twee actuele, inhoudelijk gelijke toepassingen heeft.
4. Houd repositories bij persistence en pure categoriepadlogica buiten repositories.
5. Splits Calorie Tracker-persistence en application services langs actuele verantwoordelijkheden.
6. Behoud alle huidige endpoints, foutcodes, redirects, authregels, cache-uitkomsten en gebruikersflows.

## Niet-doelen

- Geen nieuwe feature of gedragswijziging.
- Geen visuele of layoutwijziging.
- Geen wijziging van publieke basenames of canonieke routes.
- Geen verwijdering van de gedocumenteerde legacyroute-redirects.
- Geen verwijdering van de tijdelijke `PATCH`-compatibiliteitsalias zolang de afgesproken releasecyclus niet is verstreken.
- Geen generiek routing-, repository-, cache- of serviceframework.
- Geen nieuwe gedeelde auth-loaderabstractie; de huidige apps verschillen in returnpath-, bron- en autorisatieregels.
- Geen bestanden splitsen op een arbitrair maximaal aantal regels.
- Geen dependency-installatie of herstel van `node_modules`.

## Scopepoort

Voor iedere voorgestelde abstractie geldt vóór implementatie:

1. Benoem de actuele duplicaten met bestand en functie.
2. Bevestig met `git grep` dat minimaal twee inhoudelijk gelijke gebruikers bestaan.
3. Kies de kleinste helper die alleen het gedeelde mechanisme bevat.
4. Houd app-specifieke policy, labels, basenames en route-allowlists bij de app.
5. Voeg geen configuratieoptie toe waarvoor nog geen actuele gebruiker bestaat.

Wanneer één van deze voorwaarden niet geldt, blijft de logica lokaal.

## Huidige observaties

### YAGNI

| Observatie | Bestand | Gewenste richting |
| --- | --- | --- |
| `getNutritionGoals()` heeft geen consumer; statistieken leveren de actuele doelen al mee. | `apps/calory_tracker/app/api/calorie-tracker-api/calorie-tracker-api.ts` | Verwijderen inclusief uitsluitend daarvoor benodigde imports. Het backendendpoint blijft bestaan. |
| De brede querykey `calorieTrackerQueryKeys.all` wordt niet gebruikt. | `apps/calory_tracker/app/api/calorie-tracker-api/calorie-tracker-query-keys.ts` | Verwijderen totdat een actuele brede onderhoudsoperatie hem nodig heeft. |
| De compatibility barrel exporteert vier gesplitste domeinonderwerpen en alle gebruikers zitten in dezelfde repositorywijziging. | `apps/calory_tracker/app/domain/calorie-tracker-domain/calorie-tracker-domain.ts` | Consumers rechtstreeks uit `consumption-types`, `dates-and-timezones`, `goals` of `quantities` laten importeren en de barrel verwijderen. |
| `toCaloryTrackerPublicPath()` geeft alleen door aan `toCalorieTrackerPublicPath()`. | `apps/calory_tracker/app/auth/public-paths.ts` | De canonieke public-pathfunctie rechtstreeks gebruiken en de wrapper verwijderen. |

### DRY

| Observatie | Actuele toepassingen | Gewenste richting |
| --- | --- | --- |
| Normalisatie van een app-intern pad en prefixing met een basename is driemaal gelijk. | Calorie Tracker, Inventory en Product Management Admin | Eén pure helper in het bestaande `@product-repos/shared` package toevoegen. Basenames en app-specifieke routebouwers blijven lokaal. |
| Invalidatie van loglijsten en statistieken voor dezelfde lokale datum wordt bij logmutaties herhaald. | Logformulier en logdetail | Eén Calorie Tracker-cachehelper toevoegen die precies deze twee queryfamilies voor één datum invalideert. Aanvullende detail- of package-invalidatie blijft bij de caller. |

### Single Responsibility

| Observatie | Bestand | Gewenste richting |
| --- | --- | --- |
| De categorierepository bevat databasebewerkingen én pure padopbouw en formattering. | `apps/backend/src/modules/catalog/internal/category.repository.ts` | Pure categoriepadfuncties naar catalogus-domain verplaatsen; de repository houdt uitsluitend persistence-operaties. |
| Eén Drizzle-bestand implementeert zowel log- als nutrition-goalpersistence. | `apps/backend/src/modules/calorie-tracker/repositories/drizzle-calorie-tracker.ts` | Splitsen in een logrepository-adapter en een nutrition-goalrepository-adapter. |
| Eén application-servicefactory bezit packagekeuze, loglevenscyclus, cleanup, doelen en dagstatistieken. | `apps/backend/src/modules/calorie-tracker/services/calorie-tracker.service.ts` | Splitsen langs drie actuele use-casegroepen zonder pass-throughfacade. |

## Doelgrenzen

### Gedeelde public-pathnormalisatie

Voeg in `@product-repos/shared` één pure functie toe met uitsluitend deze verantwoordelijkheid:

```ts
export function toPublicAppPath(basePath: string, internalPath: string): string;
```

Eigenschappen:

- normaliseert één leidende slash;
- maakt de app-root gelijk aan de basename zonder afsluitende slash;
- kent geen Calorie Tracker-, Inventory- of Admin-routes;
- valideert geen returnpaths en neemt geen authbesluiten;
- wordt via één gerichte package-export aangeboden, bijvoorbeeld `@product-repos/shared/public-app-path`.

De bestaande lokale functies `toCalorieTrackerPublicPath`, `toInventoryPublicPath` en `toAdminPublicPath` mogen als app-specifieke named builders blijven bestaan, maar delegeren dan naar deze helper met hun eigen basename. Zo blijven callsites betekenisvol zonder het algoritme te dupliceren.

### Calorie Tracker-cache-invalidatie

Voeg naast de query-keyfactory één kleine helper toe, bijvoorbeeld:

```ts
export function invalidateCalorieTrackerDate(
  queryClient: QueryClient,
  date: string,
): Promise<void>;
```

De helper:

- invalideert alleen `logListsForDate(date)` en `statisticsForDate(date)`;
- bevat geen navigatie, meldingen of mutation-state;
- invalideert geen logdetail of packages;
- ondersteunt meerdere geraakte datums doordat de caller de helper per datum aanroept.

### Pure categoriepadlogica

Voeg onder `apps/backend/src/modules/catalog/domain/` een gericht bestand toe voor bestaande categoriehiërarchie, bijvoorbeeld `category-path.ts`.

Dit bestand bevat:

- een minimaal structureel type met alleen de velden die padopbouw nodig heeft;
- `findCategoryPath()`;
- `formatCategoryPath()`.

De functies blijven puur. `category.repository.ts`, `products.repository.ts` en `catalog-query.service.ts` gebruiken deze domainfuncties rechtstreeks. Hierdoor hoeft een repository geen andere repositorycapability te ontvangen voor pure logica.

### Calorie Tracker-persistence

Gebruik de al bestaande contractscheiding:

```text
repositories/
  calorie-tracker-store.ts                 # bestaande records en capabilitytypen
  drizzle-consumption-log.repository.ts    # ConsumptionLogRepository
  drizzle-nutrition-goal.repository.ts     # NutritionGoalRepository
```

Regels:

- logcleanup blijft bij de logrepository;
- goals kennen geen logqueries;
- beide adapters ontvangen alleen `BackendDatabase`;
- composition maakt beide adapters afzonderlijk en injecteert ze;
- er komt geen nieuwe generieke Drizzle-baseclass of repositoryfactory.

### Calorie Tracker-application services

Splits de huidige factory in drie samenhangende capabilities:

```text
services/
  calorie-tracker-projections.ts
  package-selection.service.ts
  consumption-log.service.ts
  nutrition-summary.service.ts
```

Voorgestelde verdeling:

- `package-selection.service.ts`
  - packages zoeken of recente packages lezen;
  - beschikbare invoereenheden bepalen;
- `consumption-log.service.ts`
  - logs lezen, aanmaken, wijzigen, verwijderen en herstellen;
  - verlopen soft-deleted logs opruimen;
  - mutatie-input en idempotentie bewaken;
- `nutrition-summary.service.ts`
  - doelen lezen en vervangen;
  - dagelijkse statistieken berekenen met de huidige doelen.

Gedeelde projectiecode blijft in `calorie-tracker-projections.ts`. Een aanvullende private helper wordt alleen geëxtraheerd wanneer minimaal twee van deze services exact dezelfde projectiestap nodig hebben.

Er komt geen nieuwe `CalorieTrackerService` die uitsluitend alle methoden opnieuw doorgeeft. `calorie-tracker.routes.ts`, composition en jobs ontvangen de benodigde capabilities expliciet.

## Uitvoeringsfasen

### Fase 1 — Ongebruikte en tijdelijke code verwijderen

1. Bevestig met `git grep` dat `getNutritionGoals()` en `calorieTrackerQueryKeys.all` geen consumer hebben.
2. Verwijder beide en ruim ongebruikte imports op.
3. Vervang imports via de compatibility barrel door directe imports uit de vier stabiele domeinbestanden.
4. Verwijder de compatibility barrel wanneer geen import resteert.
5. Vervang `toCaloryTrackerPublicPath()`-gebruik door de canonieke Calorie Tracker-builder.
6. Verwijder de pass-throughwrapper.

**Acceptatie:** er blijft geen interne compatibilitylaag of export zonder actuele consumer over.

### Fase 2 — Alleen bewezen duplicatie delen

1. Voeg de pure public-app-pathhelper en gerichte package-export toe aan `@product-repos/shared`.
2. Laat de drie app-specifieke public-pathbuilders deze helper gebruiken.
3. Voeg unit tests toe voor root, een pad met en zonder leidende slash, queryparameters en fragmenten.
4. Voeg de datumgerichte Calorie Tracker-cachehelper toe.
5. Vervang de dubbele loglijst/statistiekinvalidatie in logformulier en logdetail.
6. Behoud caller-specifieke logdetail-, package- en navigatielogica lokaal.

**Acceptatie:** de twee gedeelde algoritmen hebben ieder meerdere actuele consumers en geen app-specifieke policy.

### Fase 3 — Categorie-domain en persistence scheiden

1. Leg bestaand gedrag van categoriepadopbouw vast met pure tests, inclusief root, genest pad, ontbrekende categorie en cyclische data.
2. Verplaats padopbouw en formattering naar catalogus-domain.
3. Verwijder deze functies uit `CategoryRepository` en de Drizzle-factory.
4. Laat `catalog-query.service.ts` de pure functies direct gebruiken.
5. Laat `products.repository.ts` geen categorie-repositorycapability meer ontvangen voor padopbouw.
6. Controleer dat databasequeries en responseprojecties ongewijzigd blijven.

**Acceptatie:** de categorierepository bevat uitsluitend persistence en repository-atomiciteit.

### Fase 4 — Calorie Tracker-repositories splitsen

1. Verplaats logqueries en cleanup naar de concrete logrepository.
2. Verplaats goalqueries en upsert naar de concrete goalrepository.
3. Pas composition en de backendtestcomposition aan om beide factories afzonderlijk te maken.
4. Behoud `calorie-tracker-store.ts` als contractbestand zolang beide capabilitytypen daar logisch samen worden gedeeld; splits dit contractbestand alleen wanneer daardoor een concrete ongewenste afhankelijkheid verdwijnt.
5. Verwijder het gecombineerde Drizzle-bestand.

**Acceptatie:** iedere concrete adapter implementeert één repositorycapability en alle storage-uitkomsten blijven gelijk.

### Fase 5 — Application service langs use-cases splitsen

1. Leg de bestaande publieke service-uitkomsten vast met de gerichte servicetests.
2. Verplaats packagekeuze naar `package-selection.service.ts`.
3. Verplaats loglevenscyclus en cleanup naar `consumption-log.service.ts`.
4. Verplaats doelen en dagstatistieken naar `nutrition-summary.service.ts`.
5. Deel alleen projectiehulpmiddelen die aantoonbaar door meerdere services worden gebruikt.
6. Pas route-dependencies aan naar expliciete capabilities.
7. Pas composition, cleanupjob en testfakes aan zonder een facade te introduceren.
8. Verwijder het brede servicebestand zodra geen consumer resteert.

**Acceptatie:** iedere service heeft één samenhangende reden om te wijzigen en routes behouden exact dezelfde HTTP-semantiek.

### Fase 6 — Gerichte verificatie en eindcontrole

Voer geen volledige workspace-testsuite uit. Gebruik uitsluitend de geraakte packages en relevante testbestanden.

Minimale statische verificatie:

```text
corepack pnpm --filter @product-repos/shared typecheck
corepack pnpm --filter calory_tracker typecheck
corepack pnpm --filter inventory typecheck
corepack pnpm --filter product-management-admin typecheck
corepack pnpm --filter @product-repos/backend typecheck
```

Gerichte frontendtests:

```text
corepack pnpm --filter calory_tracker exec vitest --run \
  app/api/calorie-tracker-api \
  app/auth \
  app/routing \
  app/routes/log-form \
  app/routes/log-detail
```

Gerichte backendtests:

```text
corepack pnpm --filter @product-repos/backend exec bun test \
  tests/calorie-tracker-service.test.ts \
  tests/calorie-tracker.test.ts \
  tests/calorie-tracker-coverage.test.ts
```

Aanvullend:

- gerichte lint van de vier geraakte apps/packages;
- `git diff --check`;
- `git grep` op verwijderde symbols en oude compatibility-imports;
- geen devserver starten, stoppen, herstarten of diens proces beïnvloeden;
- stoppen wanneer pnpm dependencyherstel of verwijdering van `node_modules` vraagt.

## Teststrategie

### YAGNI-verwijderingen

- Geen nieuwe gedragstest voor verwijderde ongebruikte exports.
- Bestaande API-, route- en typechecks bewijzen dat geen consumer ontbreekt.

### Public-pathhelper

- Rootpad wordt alleen de basename.
- Paden met nul, één of meerdere leidende slashes leveren dezelfde publieke route.
- Query en fragment blijven behouden.
- Iedere app behoudt haar eigen basename.
- Returnpathallowlists blijven app-lokaal getest.

### Cache-invalidatie

- Eén datum invalidereert precies de loglijst- en statistiekprefix.
- Een create/update met meerdere geraakte datums roept dezelfde helper per unieke datum aan.
- Detail- en package-invalidatie blijven aantoonbaar aanwezig waar nodig.

### Categoriepadlogica

- Root- en geneste paden behouden dezelfde volgorde en formattering.
- Ontbrekende en cyclische referenties blijven begrensd afgehandeld.
- Catalogusbrowse en search behouden dezelfde responsevorm en sortering.

### Repository- en servicesplitsing

- Bestaande idempotentie, optimistic concurrency, ownership, soft delete en restore-window blijven gedekt.
- Goal-upsert en statistiekprojectie behouden exacte decimale uitkomsten.
- Cleanup gebruikt dezelfde inclusieve cutoff.
- Route-integratietests bewijzen ongewijzigde statuscodes en responsecontracten.

## Risico’s en mitigaties

| Risico | Mitigatie |
| --- | --- |
| Een gedeelde helper groeit uit tot een routingframework. | Alleen basename plus intern pad ondersteunen; routepolicy en allowlists blijven lokaal. |
| Een cachehelper wordt een brede cachefacade. | Alleen de twee bewezen datumafhankelijke queryfamilies opnemen. |
| Opsplitsen creëert pass-throughservices en extra indirection. | Routes injecteren capabilities rechtstreeks; geen verzamelservice terugplaatsen. |
| Pure categoriecode blijft via repositorytypen aan Drizzle gekoppeld. | Gebruik een minimaal structureel domaintype zonder Drizzle-import. |
| Repositorysplitsing verbreekt atomiciteit. | Bestaande atomische operaties intact naar één adapter verplaatsen en gericht testen. |
| Serviceverplaatsing verandert foutvolgorde of idempotentie. | Bestaande servicetests vóór verplaatsing behouden en per use-case laten slagen. |
| De compatibility barrel blijkt extern gebruikt. | Voor verwijdering repositorybreed zoeken; bij een echte externe package-export eerst een afzonderlijk migratiebesluit nemen. |
| Te veel kleine bestanden verminderen overzicht. | Alleen de drie benoemde servicegroepen en twee concrete repositorycapabilities splitsen; triviale private helpers lokaal houden. |

## Verwachte bestandsimpact

### Verwijderen

```text
apps/calory_tracker/app/domain/calorie-tracker-domain/calorie-tracker-domain.ts
apps/backend/src/modules/calorie-tracker/repositories/drizzle-calorie-tracker.ts
apps/backend/src/modules/calorie-tracker/services/calorie-tracker.service.ts
```

### Toevoegen

```text
packages/shared/routing/public-app-path.ts
apps/calory_tracker/app/api/calorie-tracker-api/calorie-tracker-cache.ts
apps/backend/src/modules/catalog/domain/category-path.ts
apps/backend/src/modules/calorie-tracker/repositories/drizzle-consumption-log.repository.ts
apps/backend/src/modules/calorie-tracker/repositories/drizzle-nutrition-goal.repository.ts
apps/backend/src/modules/calorie-tracker/services/package-selection.service.ts
apps/backend/src/modules/calorie-tracker/services/consumption-log.service.ts
apps/backend/src/modules/calorie-tracker/services/nutrition-summary.service.ts
```

### Inhoudelijk aanpassen

- `packages/shared/package.json`;
- de drie app-specifieke public-pathmodules;
- Calorie Tracker-imports die nu de compatibility barrel of pass-throughwrapper gebruiken;
- Calorie Tracker-logformulier en logdetail;
- catalogus-queryservice, categoryrepository en productsrepository;
- backend composition, Calorie Tracker-routes, cleanupjob en testcomposition;
- uitsluitend de relevante gerichte tests.

De exacte bestandsnamen mogen tijdens uitvoering klein worden verfijnd. De beschreven verantwoordelijkheidsgrenzen zijn leidend.

## Definition of done

- `getNutritionGoals()` en `calorieTrackerQueryKeys.all` bestaan niet zonder actuele consumer.
- De Calorie Tracker-domaincompatibilitybarrel en public-path-pass-throughwrapper zijn verwijderd.
- Public-pathnormalisatie staat op één plek en heeft drie actuele appconsumers.
- Datumgerichte loglijst/statistiekinvalidatie staat op één plek en heeft minimaal twee actuele mutationconsumers.
- Categoriepadopbouw en formattering zijn pure domainfuncties; de categorierepository bevat alleen persistence.
- Productpersistence ontvangt geen categorie-repositorycapability voor pure padopbouw.
- Log- en goalpersistence hebben afzonderlijke concrete Drizzle-adapters.
- Packagekeuze, loglevenscyclus en nutritionsamenvatting hebben afzonderlijke application-serviceverantwoordelijkheden.
- Er bestaat geen pass-throughfacade die de gesplitste services alleen opnieuw bundelt.
- Publieke routes, redirects, endpoints, methoden, payloads, foutcodes en UI-gedrag zijn ongewijzigd.
- Legacyroutes en de afgesproken tijdelijke `PATCH`-alias blijven behouden.
- Gerichte typechecks, lint en relevante tests zijn groen zonder de doorlopende volledige testsuite te onderbreken.
- Er is geen dependency-installatie, devserveractie of ongerelateerde formatteringsdiff uitgevoerd.
