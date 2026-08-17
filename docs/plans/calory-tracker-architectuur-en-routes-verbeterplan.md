# Plan — Calorie Tracker-architectuur en routenaamgeving verbeteren

## Status

Uitgevoerd. De architectuur-, routeveiligheids-, projectie-, persistence- en lintfasen zijn verwerkt. De publieke basename en workspace-map blijven bewust ongewijzigd; die naamgevingsmigratie vereist nog steeds een afzonderlijk deploymentbesluit. Voor logupdates is `PUT` canoniek en blijft `PATCH` minimaal één releasecyclus als compatibiliteitsalias beschikbaar.

> **Vervolgnotitie:** de hier ingevoerde persistence-port en Drizzle-adapter zijn later zonder gedragswijziging samengevoegd tot één technologieneutraal repositorybestand per capability. Zie [Backendrepositories en domeingrenzen vereenvoudigen](backend-repository-en-domainvereenvoudigingsplan.md).

## Bronnen

- `docs/specs/calorie-tracker/calorie-tracker-specificatie.md`
- `docs/specs/calorie-tracker/dashboard/calorien-statestieken.md`
- `docs/specs/calorie-tracker/logs/log-overzicht.md`
- `docs/specs/calorie-tracker/logs/log-toevoegen.md`
- `docs/specs/calorie-tracker/logs/log-detail-bewerken.md`
- `docs/domein/calorie-tracker-domeinregels.md`
- `docs/backend/Endpoints/CALORIE_TRACKER_ENDPOINTS.md`
- huidige frontend in `apps/calory_tracker/app`
- huidige backend in `apps/backend/src/calorie-tracker` en `apps/backend/src/routes/calorie-tracker.ts`
- gedeelde contracten in `packages/contracts/src/calorie-tracker.ts`

## Aanleiding

De Calorie Tracker heeft een sterke basis op het gebied van runtimecontracten, authenticatie, eigenaarschap, exacte decimaalberekeningen, idempotentie, optimistic concurrency en soft delete. De huidige architectuur bevat daarnaast technische schuld die routewijzigingen risicovol maakt, frontendfeatures te veel verantwoordelijkheden geeft en backendqueries onnodig breed uitvoert.

De voornaamste verbeterpunten zijn:

1. inconsistente spelling en taal in app-, publieke en API-routes;
2. verspreide hardcoded routekennis;
3. ontbrekend behoud van de oorspronkelijke bestemming bij een server-side loginredirect;
4. routegebonden modals die een tweede instantie van het logboek renderen;
5. grote frontendmodules met meerdere verantwoordelijkheden;
6. stil weggefilterde backendprojectiefouten;
7. directe koppeling van de application service aan de Drizzle-adapter;
8. brede catalogusqueries en filtering in applicatiegeheugen;
9. onzuivere `PATCH`-semantiek;
10. niet-eenduidige tijdzoneregels tussen domein- en featurespecificaties;
11. beperkt gebruik van TanStack Query-fout- en annulatiegedrag;
12. niet-type-aware ESLint-configuratie.

## Wat behouden moet blijven

De verbetering is geen volledige herschrijving. De volgende bestaande keuzes blijven leidend:

- `apps/calory_tracker`, `apps/backend`, `packages/contracts`, `packages/auth-client` en `packages/shared` blijven afzonderlijke workspacegrenzen totdat een expliciete naamgevingsmigratie is goedgekeurd.
- Zod-contracten blijven de runtimegrens voor request-, response- en errorshapes.
- Frontend en backend gebruiken dezelfde contracttypen uit `@product-repos/contracts/calorie-tracker`.
- Verwachte domein- en adapteruitkomsten blijven expliciet en getagd gemodelleerd.
- Exacte decimaalberekeningen blijven buiten JavaScript floating-point plaatsvinden.
- Logs blijven per gebruiker afgeschermd; een onbekend log en een log van een andere gebruiker blijven dezelfde 404-toestand opleveren.
- Client-idempotente create, optimistic concurrency, soft delete, herstel en cleanup blijven behouden.
- De catalogus blijft de actuele bron van waarheid; logs krijgen geen product- of voedingssnapshot.
- CSS Modules, React Router, TanStack Query en de gedeelde authenticatie- en shellpackages blijven in gebruik.
- Route-, component-, style- en testbestanden blijven waar zinvol bij elkaar staan.

## Beslispunten vóór implementatie

### 1. Canonieke product- en basename-spelling

De huidige naamgeving gebruikt drie vormen:

```text
/calory-tracker                 # publieke frontendbasename
/calorie-tracker               # backend-API-prefix
apps/calory_tracker             # appmap en packagenaam
```

**Voorkeursrichting:** gebruik `calorie-tracker` als canonieke Engelse spelling. Migreer de publieke basename alleen met een overgangsperiode waarin `/calory-tracker/*` permanent of tijdelijk naar `/calorie-tracker/*` redirect en queryparameters en fragmenten behouden blijven.

Het hernoemen van `apps/calory_tracker` naar `apps/calorie-tracker` is een afzonderlijk workspacebesluit. Dit kan tegelijk met de publieke migratie, maar hoeft niet dezelfde release te blokkeren.

Voor implementatie moet expliciet worden besloten:

- of de publieke basename mag wijzigen;
- welke redirectstatus en overgangsduur gelden;
- of bestaande bookmarks, cookies, deploymentroutes en E2E-fixtures geraakt worden;
- of ook de appmap en packagenaam worden hernoemd.

### 2. Taal van user-facing routes

De huidige routes mengen Engels en Nederlands:

```text
/logs
/logs/nieuw
/logs/:logId/bewerken
/login
```

Kies één conventie. Mogelijke consistente sets:

```text
/logs
/logs/new
/logs/:logId/edit
```

of:

```text
/logboek
/logboek/nieuw
/logboek/:logId/bewerken
```

**Voorkeursrichting:** gebruik Engelse technische URL-segmenten en Nederlandstalige zichtbare labels. Dit sluit aan op de bestaande resource `logs`, de backendconventie en interne functienamen. Behoud oude user-facing routes tijdelijk als redirects wanneer bestaande deep links ondersteund moeten blijven.

### 3. Tijdzonebetekenis van een bestaande log

De domeinregels stellen dat de opgeslagen browsertijdzone de lokale kalenderdatum van een log blijvend bepaalt. De dashboardspecificatie stelt dat aggregatie plaatsvindt voor de lokale datum in de browsertijdzone van de actuele request.

Deze modellen verschillen wanneer een gebruiker reist of zijn browsertijdzone wijzigt.

Voor implementatie moet één invariant worden gekozen:

- **opslagtijdzonemodel:** een log blijft altijd bij de lokale dag van zijn opgeslagen tijdzone;
- **weergavetijdzonemodel:** een log wordt per request ingedeeld volgens de actuele browsertijdzone.

**Voorkeursrichting op basis van de bestaande domeinregels en backendtests:** behoud het opslagtijdzonemodel en pas de dashboardspecificatie aan zodat duidelijk is dat de requesttijdzone de geldigheid van de gevraagde datum en nieuwe invoer bepaalt, maar bestaande logs niet naar een andere lokale dag verplaatst.

### 4. Update-semantiek

De huidige `PATCH /calorie-tracker/logs/:logId` verwacht alle bewerkbare velden. Kies vóór aanpassing:

- `PUT` voor volledige vervanging van de bewerkbare loginput; of
- een werkelijk gedeeltelijk PATCH-contract met optionele velden en expliciete merge-regels.

**Voorkeursrichting:** gebruik `PUT`, omdat het formulier steeds een volledige nieuwe invoertoestand verstuurt en optimistic concurrency onderdeel van die volledige toestand is.

### 5. API-prefix en versionering

De Calorie Tracker-API gebruikt `/calorie-tracker/*`, terwijl Better Auth onder `/api/auth/*` staat. Bepaal of alle applicatie-API’s later onder een uniforme `/api`-prefix of versie moeten vallen.

**Voorkeursrichting:** voeg niet uitsluitend voor deze refactor een `/api/v1`-migratie toe. Houd `/calorie-tracker` voorlopig stabiel en behandel API-versionering als een afzonderlijk backendbreed besluit.

## Doelarchitectuur

### Frontendlagen

```text
apps/calory_tracker/app/
  routes.ts                         # alleen routeboom en routekoppeling
  routing/
    calorie-tracker-routes.ts       # getypeerde interne route-builders
    tracker-url-state.ts            # datum-/filtercanonicalisatie
  auth/
    auth-client.ts
    auth.server.ts
    public-paths.ts
  api/
    calorie-tracker-api/
      calorie-tracker-api.ts        # HTTP, responsevalidatie en errorclassificatie
      calorie-tracker-query-keys.ts # centrale TanStack Query-keyfactory
  domain/
    dates-and-timezones.ts
    quantities.ts
    goals.ts
    consumption-types.ts
  components/                       # uitsluitend app-breed herbruikbare componenten
  routes/
    statistics/
      statistics-route.tsx
      statistics-overview.tsx
      statistic-card.tsx
      goals-dialog.tsx
      goals-draft.ts
    logs/
      logs-layout.tsx               # lijst plus <Outlet /> voor routegebonden overlays
      logs-route.tsx
      log-item.tsx
      logbook-state.ts
      logbook-scroll.ts
      new-log-route.tsx
      log-detail-route.tsx
      edit-log-route.tsx
      log-form/
        log-form.tsx
        package-search.tsx
        quantity-fields.tsx
        consumption-moment.ts
```

De exacte bestandsnamen mogen tijdens implementatie worden vereenvoudigd. De grenzen zijn belangrijker dan het aantal bestanden.

### Backendlagen

```text
apps/backend/src/calorie-tracker/
  domain.ts                         # pure berekeningen en invarianten
  calorie-tracker-store.ts          # kleine persistence-port
  calorie-tracker-service.ts        # use cases en foutmodellering
  calorie-tracker-projections.ts    # responseprojecties
  drizzle-calorie-tracker-store.ts  # gerichte Drizzle-queries

apps/backend/src/routes/
  calorie-tracker.ts                # HTTP parsing, auth en result-to-response mapping
```

De HTTP-router mount één lokale routeboom onder de vaste contextprefix:

```ts
app.route("/calorie-tracker", calorieTrackerRoutes());
```

De routefactory gebruikt daarna lokale paden zoals `/logs` en `/statistics`, zodat de contextprefix niet in iedere handler wordt herhaald.

## Implementatieplan

### Fase 1 — Specificaties en routebesluiten vastleggen

1. Beslis over de canonieke spelling, user-facing routetaal, tijdzone-invariant en PUT/PATCH-semantiek.
2. Werk na goedkeuring de relevante specificaties bij voordat gedrag wijzigt:
   - algemene navigatie en publieke basename;
   - logoverzicht, toevoegen en detail/bewerken;
   - dashboardtijdzonegedrag;
   - endpointcontracten.
3. Leg redirects en compatibiliteitsduur vast wanneer publieke routes wijzigen.
4. Maak een route-inventaris van frontendlinks, serverredirects, assets, auth-returnpaths, E2E-fixtures en deploymentconfiguratie.

Deze fase bevat nog geen routewijziging in productiecode.

### Fase 2 — Centrale frontendroutecontracten invoeren

1. Voeg getypeerde route-builders toe voor:
   - statistieken;
   - logboek;
   - nieuw log;
   - logdetail;
   - log bewerken;
   - login met veilige `returnTo`;
   - externe Product Management Admin-bestemming.
2. Laat de builders `URLSearchParams` gebruiken en de canonieke datum-/filterstate accepteren.
3. Vervang verspreide strings in `Link`, `NavLink`, `navigate()` en authcode door deze builders.
4. Houd routepatronen en builders dicht bij elkaar en voeg contracttests toe die aantonen dat gegenereerde paden bij `app/routes.ts` passen.
5. Vervang layoutcontroles zoals `pathname.endsWith("/bewerken")` door geneste layouts of React Router route handles en `useMatches()`.
6. Gebruik één basenameconfiguratiebron waar buildconfiguratie dit toestaat; voeg anders een test toe die afwijking tussen routerbasename en publieke routeconstant detecteert.

### Fase 3 — Login-returnpath herstellen

1. Laat `requireUser(request)` bij een ontbrekende sessie het actuele app-interne pad, de queryparameters en waar toegestaan het fragment als `returnTo` opnemen.
2. Parse de bestemming uitsluitend via de bestaande allowlistlogica in `public-paths.ts`.
3. Voorkom protocol-relative URLs, externe origins en niet-ondersteunde routes.
4. Behoud netwerk- en authenticatiebeschikbaarheidsfouten als herstelbare fouttoestand zonder redirectloop.
5. Test directe toegang tot statistieken, logboek, nieuw log, detail en bewerken vanuit een verlopen sessie.

### Fase 4 — Logroutes nesten en routegebonden overlays corrigeren

1. Maak `/logs` een parentroute die de echte logboeklijst één keer rendert.
2. Render toevoegen en bewerken via een child-`Outlet` boven de gemounte lijst.
3. Verwijder het direct importeren en opnieuw renderen van `LogsRoute` uit `log-new` en `log-edit`.
4. Behoud refresh, deep linking, browser terug/vooruit, datum en filter.
5. Gebruik routerstate en de gemounte lijst voor scrollbehoud; beperk `sessionStorage` tot informatie die routelevensduur bewust moet overleven, zoals de tijdelijke undo-capability.
6. Zorg dat de achtergrond bij een modal niet focusbaar of bedienbaar is en gebruik waar passend `inert` naast correcte dialogsemantiek.
7. Houd mobiel full-screen en desktop compact/modal volgens de bestaande featurespecificaties.

Gewenste routeboom na een Engelse routekeuze:

```text
layout
  index                              # statistieken
  logs                               # gemounte logboeklayout
    index                            # lijstinhoud
    new                              # toevoegoverlay
    :logId                           # detail
    :logId/edit                      # bewerkoverlay
```

De definitieve nesting van detail hangt af van de gekozen desktopweergave; detail moet in ieder geval één eigen deelbare route behouden.

### Fase 5 — Frontendfeatures gericht opsplitsen

1. Splits `statistics.tsx` in routecoördinatie, statistiekenpresentatie, doelenmodal en pure doelvalidatie.
2. Splits `log-form.tsx` in formuliercoördinatie, packagezoekresultaten, hoeveelheid/eenheid en consumptiemoment.
3. Splits `logs.tsx` in routecoördinatie, view-state-afleiding, logitem en scrollgedrag.
4. Verdeel `calorie-tracker-domain.ts` op stabiele domeinonderwerpen in plaats van op technische hulpfuncties.
5. Gebruik `ConsumptionTypeFilter` uit het gedeelde contract en verwijder lokale duplicaten of verzwakte `string`-parameters.
6. Houd routes dun: URL-state, query/use-case aanroepen, expliciete viewstate en compositie.
7. Verplaats alleen componenten naar `app/components` wanneer minimaal meerdere features ze werkelijk delen.

### Fase 6 — TanStack Query- en API-grens aanscherpen

1. Voeg een centrale query-keyfactory toe voor statistieken, lijsten, logdetail, packages en inputeenheden.
2. Maak invalidatie gericht op betrokken datum, lijst, detail en statistieken in plaats van standaard de volledige `calorie-tracker`-cache ongeldig te maken.
3. Kies één consistente foutstrategie:
   - verwachte HTTP-/protocolfouten als getagde waarden met bewust uitgeschakelde automatische retries; of
   - getypeerde exceptions aan de querygrens zodat TanStack Query retries en errorstate beheert.
4. Documenteer netwerkretrygedrag expliciet; voorkom een toevallige combinatie van beide modellen.
5. Geef query-`AbortSignal`s door aan `fetch` zoals nu al gebeurt.
6. Maak mutationsignalen optioneel of beheer de daadwerkelijke `AbortController`; maak geen controller aan die nooit kan worden geannuleerd.
7. Gebruik gedeelde arrayschema’s uit het contractpackage of `z.array(...)` aan de boundary en verwijder de lokale handmatige arrayschemaparser wanneer die geen aanvullende domeinwaarde heeft.
8. Verwijder ongebruikte clientfuncties of gebruik ze via één bewuste queryflow.

### Fase 7 — Backendprojectiefouten expliciet maken

1. Vervang het wegfilteren van mislukte `projectLog`-resultaten in lijsten en statistieken.
2. Classificeer een ontbrekende of incompatibele referentie als geschonden invariant of expliciete application failure.
3. Retourneer nooit stil een gedeeltelijk logboek of te lage statistieken.
4. Log bij een onverwachte invariantbreuk uitsluitend veilige operationele context en een correlation ID.
5. Voeg tests toe waarin een projectie bewust faalt en bewijs dat de endpoint geen gedeeltelijk succes retourneert.

### Fase 8 — Persistence-port en gerichte Drizzle-queries invoeren

1. Definieer een kleine `CalorieTrackerStore`-port op basis van de werkelijk gebruikte operations.
2. Laat `CalorieTrackerService` van deze port en de bestaande `Clock` afhangen, niet van de concrete Drizzle-class.
3. Maak een fake store voor pure service- en foutpadtests; behoud integratietests voor de echte Drizzle-adapter.
4. Vervang `findCatalogPackage()` dat alle packages laadt door een gerichte query op package-ID.
5. Verplaats packagezoeken, actieve filtering, limiet en stabiele sortering zoveel mogelijk naar SQL.
6. Lees bij loglijsten alleen de catalogus- en unitreferenties die voor de gevonden logs nodig zijn.
7. Onderzoek met realistische volumes of de brede UTC-zoekwindow voldoende blijft. Voeg alleen een opgeslagen/geïndexeerde `localDate` toe wanneer het gekozen tijdzonemodel en metingen dit rechtvaardigen.
8. Behoud databaseconstraints voor positieve waarden, invoermodus, user ownership-relaties en soft-delete-indexen.

### Fase 9 — Backendroutes modulair mounten en HTTP-semantiek corrigeren

1. Mount de Calorie Tracker-router onder één centrale `/calorie-tracker`-prefix.
2. Houd handlers beperkt tot:
   - sessiecontext lezen;
   - headers, params, query en body parsen;
   - application service aanroepen;
   - getagde resultaten naar HTTP vertalen.
3. Voer de goedgekeurde PUT/PATCH-keuze door in router, client, contracts, endpointdocs en tests.
4. Behoud pragmatische commandroutes zoals `POST /logs/:logId/restore`, tenzij een backendbrede conventie anders bepaalt.
5. Overweeg `GET /packages?query=...` in plaats van `/packages/search` alleen wanneer een compatibele migratie of redirect/alias beschikbaar is; deze wijziging heeft lagere prioriteit dan correctness.
6. Voeg geen API-versie toe zonder backendbreed besluit.

### Fase 10 — Naamgevingsmigratie uitvoeren

Deze fase wordt alleen uitgevoerd na goedkeuring van de beslispunten.

1. Voeg de nieuwe publieke basename en gekozen user-facing routes toe.
2. Laat oude paden hun volledige resterende pad en queryparameters naar de canonieke bestemming doorsturen.
3. Pas auth-successpaden, returnpathallowlist, assets, externe adminlinks, deploymentconfiguratie en E2E-fixtures atomair aan.
4. Gebruik overal de productnaam `Calorie Tracker` in zichtbare tekst.
5. Beslis afzonderlijk over het hernoemen van:
   - `apps/calory_tracker`;
   - package `calory_tracker`;
   - `calory-tracker.schema.ts`;
   - bestaande scripts zoals `ct:*`.
6. Verwijder compatibiliteitsroutes pas na de afgesproken overgangsperiode en controle op resterende verwijzingen.

### Fase 11 — Type-aware linting invoeren

1. Migreer de Calorie Tracker ESLint-configuratie naar minimaal `recommendedTypeChecked` of een bewust gekozen strengere set.
2. Configureer `parserOptions.project` en `tsconfigRootDir` passend bij React Router-typegen.
3. Voeg regels gefaseerd toe om een grote ongerichte formatterings- of lintdiff te voorkomen.
4. Behoud de bestaande strikte TypeScriptopties.
5. Los alleen relevante overtredingen per fase op; combineer dit niet met een brede cosmetische rewrite.

## Verwachte bestandsimpact

Waarschijnlijke frontendwijzigingen:

```text
apps/calory_tracker/react-router.config.ts
apps/calory_tracker/app/routes.ts
apps/calory_tracker/app/routing/*
apps/calory_tracker/app/auth/auth.server.ts
apps/calory_tracker/app/auth/public-paths.ts
apps/calory_tracker/app/layout/layout.tsx
apps/calory_tracker/app/api/calorie-tracker-api/*
apps/calory_tracker/app/domain/*
apps/calory_tracker/app/routes/statistics/*
apps/calory_tracker/app/routes/logs/*
apps/calory_tracker/app/routes/log-new/*
apps/calory_tracker/app/routes/log-edit/*
apps/calory_tracker/app/routes/log-detail/*
apps/calory_tracker/app/routes/log-form/*
apps/calory_tracker/eslint.config.js
apps/calory_tracker/tsconfig.json
```

Waarschijnlijke backend- en contractwijzigingen:

```text
packages/contracts/src/calorie-tracker.ts
apps/backend/src/app.ts
apps/backend/src/routes/calorie-tracker.ts
apps/backend/src/calorie-tracker/domain.ts
apps/backend/src/calorie-tracker/calorie-tracker.ts
apps/backend/src/calorie-tracker/drizzle-calorie-tracker.ts
apps/backend/tests/calorie-tracker.test.ts
apps/backend/tests/calorie-tracker-coverage.test.ts
```

Mogelijke deployment- en testwijzigingen bij een basename- of mapmigratie:

```text
package.json
pnpm-lock.yaml
apps/calory_tracker/package.json
apps/calory_tracker/Dockerfile
tests/e2e/calorie-tracker.*
deployment- en proxyconfiguratie buiten de repository, indien aanwezig
```

## Teststrategie

Draai niet handmatig de volledige testsuite. Verifieer per implementatiefase uitsluitend de geraakte grenzen en laat de doorlopende suite intact.

### Route- en authcontracttests

- iedere route-builder genereert een pad dat door de routeboom wordt ondersteund;
- datum en type blijven canoniek behouden;
- oude routes redirecten naar de gekozen canonieke route met behoud van queryparameters;
- een unauthenticated deep link keert na login veilig terug naar dezelfde interne bestemming;
- externe, protocol-relative en niet-ondersteunde returnpaths vallen terug op `/`;
- navbar- en layoutgedrag komt uit routemetadata of nesting en niet uit fragiele stringmatches.

### Frontendcomponenttests

- de loglijst blijft gemount terwijl toevoegen of bewerken als overlay opent;
- er bestaat niet gelijktijdig een tweede interactieve logboekinstantie;
- focus blijft in de modal en keert na sluiten logisch terug;
- browser terug/vooruit en refresh behouden routecontext;
- querykeys bevatten alle gegevens die de response bepalen;
- gerichte invalidatie ververst betrokken lijst-, detail- en statistiekdata;
- mutationfailures bewaren formulierinvoer;
- datum-, hoeveelheid-, doel- en DST-validatie blijven werken.

### Backendservicetests

- de service werkt tegen een fake `CalorieTrackerStore` en geïnjecteerde klok;
- ownership, idempotentie, optimistic concurrency, archiefregels, soft delete en herstel blijven gelijk;
- projectiefouten leveren geen gedeeltelijk succes;
- exacte macroberekeningen blijven onveranderd;
- gekozen tijdzone-invariant is expliciet gedekt met instanties die in opgeslagen en actuele tijdzones op verschillende kalenderdagen vallen.

### Drizzle-integratietests

- package lookup en zoeken gebruiken gerichte correcte queries;
- sortering en limieten zijn deterministisch;
- alleen benodigde logs en catalogusreferenties worden geprojecteerd;
- gebruikersgegevens blijven gescheiden;
- constraints, soft-deletefilters en cleanup blijven werken.

### Gerichte verificatiecommando’s

Pas de exacte testbestanden aan de betreffende fase aan. Gebruik uitsluitend `corepack pnpm` voor workspacecommando’s, bijvoorbeeld:

```text
corepack pnpm --filter calory_tracker typecheck
corepack pnpm --filter calory_tracker exec vitest --run app/auth app/routing app/routes/logs app/routes/statistics
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter @product-repos/backend test -- calorie-tracker
```

Stop wanneer pnpm om het verwijderen of opnieuw opbouwen van `node_modules` vraagt. Dependencyherstel is geen bijwerking van deze architectuurverbetering.

Een gerichte Calorie Tracker-E2E is vereist na een publieke route- of basenamewijziging. Controleer daarin minimaal login-return, redirects, deep links, browsernavigatie, toevoegen, detail, bewerken en het behoud van datum en filter.

## Fasering en prioriteit

### Prioriteit 1 — correctness en routeveiligheid

- beslispunten vastleggen;
- centrale route-builders;
- server-side `returnTo` herstellen;
- stil weggefilterde backendprojectiefouten verwijderen;
- tijdzonespecificaties eenduidig maken.

### Prioriteit 2 — router- en featurearchitectuur

- geneste logroutes;
- grote frontendmodules gericht opsplitsen;
- query-keyfactory en gerichte invalidatie;
- mutation- en foutstrategie verduidelijken.

### Prioriteit 3 — backendonderhoudbaarheid en performance

- persistence-port;
- gerichte SQL-queries;
- router onder één contextprefix mounten;
- PUT/PATCH-semantiek corrigeren.

### Prioriteit 4 — migratie en kwaliteitsversterking

- publieke naam- en routemigratie;
- eventueel appmap- en packagerename;
- type-aware linting;
- compatibiliteitsroutes na de overgangsperiode verwijderen.

## Risico’s en mitigaties

| Risico | Mitigatie |
| --- | --- |
| Publieke routewijziging breekt bookmarks en login-successpaden. | Tijdelijke redirects, centrale route-builders en gerichte E2E-dekking. |
| Een brede rename raakt deploymentconfiguratie buiten de repository. | Vooraf inventariseren en map-/basenamewijziging als afzonderlijke release behandelen. |
| Geneste routes veranderen scroll- of modalgedrag. | Eerst gedragstests vastleggen en de bestaande responsive presentatie behouden. |
| Opsplitsen veroorzaakt veel verplaatsingsdiff zonder functionele waarde. | Per feature één verantwoordelijkheid tegelijk extraheren en gedrag ongewijzigd testen. |
| Store-interface wordt een generieke repositorylaag. | Alleen operations modelleren die de Calorie Tracker-service werkelijk nodig heeft. |
| Gerichte SQL-query verandert projecties of sortering. | Bestaande contract- en integratietests behouden en queryresultaten deterministisch sorteren. |
| Een projectiefout die eerder verborgen bleef veroorzaakt nu een 500. | Dit bewust als dataintegriteitsdefect behandelen, veilig loggen en de onderliggende invariant herstellen. |
| PUT/PATCH-migratie breekt oudere clients. | Tijdelijk beide methoden accepteren of de wijziging versioneren wanneer meerdere clients bestaan. |
| Tijdzonekeuze verandert historische dagindeling. | Geen codewijziging uitvoeren vóór een expliciet domeinbesluit en regressietests met grensgevallen. |
| Type-aware linting creëert een grote ongerichte diff. | Gefaseerd activeren en niet combineren met functionele route- of datalaagwijzigingen. |

## Buiten scope

- Nieuw calorie- of macrogedrag.
- Nieuwe logboekfilters of statistiekperiodes.
- Een visueel redesign.
- Vervanging van React Router, TanStack Query, Hono, Drizzle of SQLite.
- Een generiek repositoryframework voor alle backendfeatures.
- Automatische API-versionering zonder backendbreed besluit.
- Wijziging van catalogus-als-bron-van-waarheid.
- Volledige offline synchronisatie of realtime infrastructuur.

## Definition of done

- Er bestaat één goedgekeurde canonieke spelling en één conventie voor user-facing routes.
- Oude publieke routes hebben waar nodig een gedocumenteerde compatibiliteitsmigratie.
- Frontendnavigatie en veilige returnpaths gebruiken centrale route-builders.
- Een server-side loginredirect behoudt een gevalideerde interne deep link.
- Toevoegen en bewerken renderen via geneste routes zonder een tweede logboekinstantie.
- Layout- en navbarlogica hangen niet af van verspreide pathname-stringchecks.
- Grote frontendmodules zijn opgesplitst langs featureverantwoordelijkheden zonder generieke componentdump.
- TanStack Query-keys, invalidatie, retries en annulatie volgen één expliciete strategie.
- Backendlijsten en statistieken verbergen geen projectiefouten of onvolledige data.
- De application service hangt af van een kleine persistence-port en een klok.
- Packagezoeken en lookups vinden gericht in SQL plaats.
- PUT/PATCH-semantiek, API-documentatie, client en tests zijn onderling consistent.
- Tijdzonegedrag is in domeinregels, featurespecificaties, backend en tests eenduidig.
- Strikte contractvalidatie, exacte decimalen, ownership, idempotentie, concurrency en soft delete blijven aantoonbaar intact.
- Gerichte typechecks, tests en de relevante Calorie Tracker-E2E zijn groen zonder de doorlopende volledige testsuite te onderbreken.
