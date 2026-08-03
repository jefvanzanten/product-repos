# Implementatieplan — Calorie Tracker volgens Figma

## Status en scope

Dit plan brengt de Calorie Tracker als één samenhangende feature tot leven. De mobiele Figma-schermen zijn leidend voor interactie en responsive gedrag. De desktopframes worden gebruikt voor de brede layout waar zij niet botsen met mobiel of de featurespecificaties.

Binnen scope:

- Caloriestatistieken voor vandaag of een eerdere geselecteerde kalenderdag;
- persoonlijke calorie- en macrodoelen;
- consumptielogboek met datum- en typefilter;
- log toevoegen, detail, bewerken, verwijderen en herstellen;
- echte backend-, contract- en databasekoppeling;
- responsive mobiele en desktopweergave;
- Vitest-, backend- en Playwright-dekking, inclusief edge cases.

Buiten scope blijven de onderwerpen die de featurespecificaties al uitsluiten, waaronder meerdaagse trends en week- of maandgrafieken, barcodezoeken, vrije producten, offline synchronisatie en automatische voorraadmutaties.

## Bronnen

### Figma

Bestand `Calorie Tracker – Productcatalogus stijl`, key `ZHBgt4mwfMdE4tqyWfuuA9`.

Mobiel:

- `17:317` — Caloriestatistieken, normaal;
- `39:61` — Persoonlijke dagdoelen als modal;
- `17:441` — Doel overschreden;
- `17:487` — Lege dag;
- `2:184` — Consumptielogboek;
- `2:282` — Log toevoegen;
- `2:347` — Logdetail;
- `2:409` — Log bewerken.

Desktop:

- `17:67` — Statistieken;
- `17:120` — desktopreferentie voor het dagdoelenpaneel;
- `2:2` — Logboek;
- `2:110` — Log toevoegen als routegebonden modal.

### Specificaties en domeindocumenten

- `docs/specs/calorie-tracker/calorie-tracker-specificatie.md`;
- `docs/specs/calorie-tracker/dashboard/calorien-statestieken.md`;
- `docs/specs/calorie-tracker/logs/log-overzicht.md`;
- `docs/specs/calorie-tracker/logs/log-toevoegen.md`;
- `docs/specs/calorie-tracker/logs/log-detail-bewerken.md`;
- `docs/domein/calorie-tracker-domeinregels.md`;
- `docs/domein/productcatalogus-domeinregels.md`;
- `docs/specs/shared/bottom-tabbar-specificatie.md`.

## Controle ERD en endpoints

De benodigde documenten bestaan al:

- `docs/backend/ERD/CALORIE_TRACKER_ERD.md` bevat `consumption_log`, `user_nutrition_goal` en `product_macro_profile`;
- `docs/backend/ERD/PRODUCT_ERD.md` bevat producten, verpakkingen, eenheden, consumptietype, archivering en macroprofielen;
- `docs/backend/Endpoints/CALORIE_TRACKER_ENDPOINTS.md` bevat package search/input-units, CRUD en restore voor logs, statistieken en doelen.

Er hoeft daarom geen nieuw ERD- of endpointdocument te worden aangemaakt. De documentatie is op de volgende punten uitgelijnd:

1. `product_package.id` en `consumption_log.product_package_id` zijn vastgelegd als integer, in lijn met schema, migratie `0005_product_package_integer_ids.sql` en contracts.
2. Package search zonder zoekterm retourneert de recent gebruikte actieve verpakkingen van de ingelogde gebruiker.
3. Dagstatistieken gebruiken `GET /calorie-tracker/statistics?date=YYYY-MM-DD` voor vandaag of een eerdere datum.

Het actuele databaseschema mist nog de Calorie Tracker-tabellen uit het ERD en catalogusvelden zoals archivering en `individual_package_type_id`. Dit is implementatiewerk, geen reden voor een tweede ERD.

## Vastgelegde keuzes voor verschillen tussen spec en Figma

### 1. Gedeelde geselecteerde datum

De datumcontrol op Caloriestatistieken is interactief. De gebruiker kan vandaag of een eerdere kalenderdag kiezen. Caloriestatistieken en Consumptielogboek nemen dezelfde `date`-context via hun navbarlinks mee. Toekomstige datums blijven uitgesloten. Week-, maand- en trendweergaven blijven buiten scope.

### 2. Dagdoelen als modal zonder route

`Doelen instellen` en `Doelen wijzigen` openen de compacte modal uit mobiel Figma-node `39:61`. De statistieken blijven onder een scrim zichtbaar. De URL verandert niet en er bestaat geen `/goals`-route. De desktopweergave gebruikt hetzelfde modalgedrag en het doelenpaneel uit de desktopreferentie.

### 3. Geen logteller

Het logboek toont geen aparte tekstuele teller voor zichtbare logs. De lijst en lege toestand communiceren het resultaat; filters wijzigen alleen de zichtbare lijst.

### 4. Responsieve contentbreedte

De Calorie Tracker gebruikt maximaal 430 px voor compacte content. Vanaf het desktopbreakpoint mag de routecontainer verbreden tot maximaal 1208 px. De gedeelde bottom-tabbar blijft onafhankelijk maximaal 430 px breed.

## Huidige codebasis

- De actieve app gebruikt React 19, React Router 8, TanStack Query en CSS Modules.
- `app/routes/dashboard.tsx` is nog een placeholder; alleen `/` en `/login` bestaan.
- De code onder `apps/calory_tracker/src/` is niet op de actieve router aangesloten en gebruikt verouderde numerieke/legacy nutritioncontracts en modulemocks.
- De gedeelde `BottomTabBar`, authloader en publieke baseroute zijn al bruikbaar en worden hergebruikt.
- De backend gebruikt Hono, Drizzle en SQLite. Authenticatie bestaat, maar de nieuwe `/calorie-tracker/*`-routes hebben een eigen sessiegebonden autorisatieboundary nodig.
- De productcontracts gebruiken Zod 4. Nieuwe Calorie Tracker-contracten sluiten daarop aan.

## Doelarchitectuur

### Domeinmodules

Pure modules beheren:

- positieve decimale hoeveelheden met komma- en puntinvoer;
- invoermodi `PACKAGE`, `INDIVIDUAL_UNIT` en `CONTENT_UNIT`;
- eenheidscompatibiliteit en omrekening naar basiseenheden;
- lokale kalenderdag en toekomstcontrole op basis van een IANA-tijdzone;
- macro- en calorieberekening met hoge interne precisie;
- doelvoortgang, resterend en overschreden;
- URL-parsing en canonicalisatie voor datum en typefilter.

Verwachte fouten worden als precieze tagged values gemodelleerd. Geldige IDs, decimalen, tijdzones en datums worden aan de boundary geparsed.

### Application services

Cohesieve services orkestreren:

- `ConsumptionLogbook` — lijst en detail van uitsluitend de ingelogde gebruiker;
- `ConsumptionLogMutations` — idempotent toevoegen, optimistic-concurrency-update, soft-delete en restore;
- `DailyStatistics` — aggregatie voor de geselecteerde lokale kalenderdag;
- `NutritionGoals` — ophalen en atomisch vervangen van de vier optionele doelen;
- `LoggablePackages` — recente verpakkingen, zoeken en beschikbare invoereenheden.

Ports staan bij de service die ze nodig heeft. Bestaande catalogusrepositories worden eerst op hergebruik onderzocht; alleen concrete querymechaniek wordt uitgebreid of apart gehouden.

### Adapters

- Hono-routes parsen headers, params, query en body en vertalen typed outcomes naar het gedocumenteerde HTTP-contract.
- Drizzle-adapters joinen actuele product-, verpakking-, merk-, unit- en macrodata.
- De frontend-API-adapter parseert iedere JSON-response met gedeelde Zod-contracten en vertaalt netwerk-, HTTP- en parsefouten naar view outcomes.
- React Router-loaders/actions of TanStack Query gebruiken uitsluitend geparseerde application/protocoltypes.

## Implementatiefasen

### Fase 0 — Documentalignment

1. Gebruik de vastgelegde datum-, modal-, teller- en responsive keuzes als implementatiebron.
2. Houd ERD, endpointcontracten en featurespecificaties tijdens de uitvoering gelijk aan de gekozen integer package-ID en datumcontracten.
3. Vervang de verouderde spec-planverwijzingen door dit plan.
4. Leg vaste tijd-/ID-generators voor tests vast; productietijd en random UUID's blijven geïnjecteerde capabilities.

### Fase 1 — Contracts en databasefundament

1. Voeg `packages/contracts/src/calorie-tracker.ts` toe met strict Zod 4-schema's voor alle endpointshapes en errorresponses.
2. Voeg `@product-repos/contracts` als directe dependency van de Calorie Tracker toe.
3. Breng productschema en ERD eerst in lijn voor archivering, individuele verpakkingstypen en timestamps.
4. Vervang de niet-gebruikte legacy `macro_nutrients`-tabel door migraties voor `consumption_log` en `user_nutrition_goal`; hergebruik de bestaande `product_macro_profile`.
5. Voeg databasechecks en indexes uit het ERD toe.
6. Bewaar decimalen canoniek; voorkom binaire floating-pointafronding in domeinberekeningen.

### Fase 2 — Backend verticale basis

1. Voeg sessie-auth toe voor `/calorie-tracker/*`; leid `userId` altijd uit de sessie af.
2. Implementeer package search, recente verpakkingen en input-units.
3. Implementeer loglijst/detail met actuele catalogusjoins, typefilter en stabiele chronologische sortering.
4. Implementeer create met client-ID-idempotentie:
   - identieke retry geeft hetzelfde log;
   - afwijkende inhoud met hetzelfde ID geeft conflict.
5. Implementeer update met `expectedUpdatedAt`.
6. Implementeer soft-delete en restore binnen vijf seconden; plan fysieke cleanup na dertig dagen als afzonderlijke operationele taak.
7. Implementeer doelen en `GET /calorie-tracker/statistics?date=YYYY-MM-DD`.
8. Voeg veilige structured context toe aan fouten; log geen sessietokens of persoonsgegevens.

### Fase 3 — Appshell, routes en responsive fundament

Registreer minimaal:

```text
/?date=YYYY-MM-DD
/logs?date=YYYY-MM-DD&type=all|food|drink|supplement
/logs/nieuw?date=YYYY-MM-DD&type=<filter>
/logs/:logId?date=YYYY-MM-DD&type=<filter>
/logs/:logId/bewerken?date=YYYY-MM-DD&type=<filter>
```

Verder:

1. Bouw één Calorie Tracker-navbar voor `Caloriestatistieken` en `Consumptielogboek`; beide links nemen de geselecteerde datum mee.
2. Hergebruik de gedeelde `BottomTabBar`; kopieer deze niet uit Figma.
3. Zet Figma-kleuren, spacing, radii en schaduwen in route-eigen CSS custom properties totdat gedeelde designtokens bestaan.
4. Download exacte Figma-SVG-assets naar `apps/calory_tracker/public/calorie-tracker/`; tijdelijke MCP-URL's worden niet gecommit.
5. Gebruik semantische flex/gridlayout in plaats van absolute Figma-coördinaten.
6. Mobiel is de standaard. Vanaf het overeengekomen desktopbreakpoint schakelen kaarten, headers en modals naar de desktopcompositie.
7. Respecteer safe-area-insets, tekstzoom, toetsenbordnavigatie en `prefers-reduced-motion`.

### Fase 4 — Caloriestatistieken en doelen

1. Canonicaliseer de datumparameter, blokkeer toekomstige datums en neem de geselecteerde datum mee naar het logboek.
2. Haal één backendaggregaat voor de geselecteerde lokale kalenderdag op; bereken totalen niet opnieuw uit een frontendloglijst.
3. Modelleer viewstates als tagged union: `Loading`, `LoadFailed`, `Ready` en `EmptyDay`.
4. Render per waarde:
   - totaalkaart zonder actief doel;
   - voortgangskaart met doel;
   - tekstuele overschrijding en alleen het overschrijdende segment rood.
5. Laat null nutritionwaarden niet als nuldata meetellen; een echte opgeslagen nul blijft wel nul.
6. Open doelen als compacte modal zonder routewijziging; gebruik een scrim, focus trap, `Escape`, `Annuleren` en focusherstel naar de openingsactie.
7. Toggle per doel; uitgeschakelde input is disabled en wordt als `null` opgeslagen.
8. Pas dashboardstate pas aan na succesvol opslaan; bij fout blijft conceptinvoer behouden.
9. Ververs na relevante logmutaties. Schakel bij lokale middernacht alleen automatisch naar de nieuwe datum wanneer vandaag geselecteerd was.

### Fase 5 — Consumptielogboek

1. Canonicaliseer ontbrekende of ongeldige URL-state met `replace`.
2. Bewaar filter bij datumwissel en context bij toevoegen/detail/bewerken.
3. Gebruik querykeys met datum, filter en tijdzone en geef `AbortSignal` door aan `fetch`.
4. Render `Loading`, `LoadFailed`, `EmptyDate`, `EmptyFilter` en `Ready` expliciet.
5. Toon alleen compacte gegevens uit de spec; geen calorieën of macro's in lijstitems.
6. Sorteer vroeg naar laat, daarna op `createdAt`.
7. Bewaar scrollpositie per canonieke datum/filtercontext.
8. Plaats de mobiele CTA sticky boven de bottom-tabbar zonder overlap; desktop gebruikt alleen de headeractie.

### Fase 6 — Toevoegen

1. Gebruik een full-screen route op mobiel en een routegebonden modal met scrim/focus trap op desktop.
2. Zonder zoekterm worden recente actieve verpakkingen getoond; vanaf twee getrimde tekens wordt debounced gezocht.
3. Annuleer verouderde zoekrequests en voorkom dat late responses de actuele resultaten vervangen.
4. Selecteer een verpakking, haal passende invoereenheden op en toon consumptietype alleen-lezen.
5. Parse hoeveelheid als positief decimaal; accepteer komma en punt.
6. Blokkeer toekomstmomenten in de meegestuurde tijdzone en behandel DST-overgangen expliciet.
7. Disable submit tijdens opslag, maar gebruik de client-ID ook als harde backendgarantie tegen dubbele logs.
8. Behoud formulierinput bij netwerk- of serverfout.
9. Keer na succes terug naar de juiste datum/filtercontext en toon of het nieuwe item binnen het filter zichtbaar is.

### Fase 7 — Detail, bewerken, verwijderen en undo

1. Detail toont actuele catalogusdata, oorspronkelijke invoer, afgeleide hoeveelheid en actuele beschikbare macro's.
2. Eigen onbekend ID en ID van een andere gebruiker leveren identiek `Log niet gevonden`.
3. Bewerken hergebruikt dezelfde parsers, package search en unitkeuze als toevoegen.
4. Een gearchiveerde huidige verpakking blijft zichtbaar en beperkt bewerkbaar; vervanging zoekt alleen actieve verpakkingen.
5. Bij updateconflict blijft formulierinput bestaan en kan de gebruiker actuele data herladen.
6. Na datumverplaatsing navigeert de app naar de nieuwe datum met hetzelfde filter.
7. Verwijderen gebeurt direct en toont vijf seconden een toegankelijke `Ongedaan maken`-actie.
8. Restore zet het item terug op de juiste chronologische positie en ververst statistieken.

### Fase 8 — Legacy-opruiming en release

1. Verwijder de ongebruikte `apps/calory_tracker/src/`-featurecode pas nadat `rg` bevestigt dat geen actieve import resteert.
2. Verwijder modulemocktests en vervang ze door tests op echte seams.
3. Seed alleen anonieme, resetbare gastdata voor acceptatieomgevingen.
4. Rol contracts/schema/backend vóór of compatibel met de frontend uit.
5. Monitor typed errorcodes, conflicten en parsefouten zonder gevoelige data.

## Tests

Tests worden niet vooraf als `todo`, skip of mock-scaffold toegevoegd. Iedere verticale implementatieslice levert tegelijk de productiecode en actieve tests tegen de dan bestaande publieke seam. Zo blijft de suite betekenisvol en groen, zonder niet-bestaande functionaliteit als testdekking te presenteren.

Beoogde locaties zodra de bijbehorende code bestaat:

- Vitest naast de pure domein-, URL-, state- en routecomponentmodules onder `apps/calory_tracker/app/`;
- backendintegratietests onder `apps/backend/tests/` tegen tijdelijke SQLite;
- Playwrightconfiguratie pas bij de eerste uitvoerbare end-to-end slice;
- Playwrightscenario's onder `tests/e2e/` zodra auth-, backend- en frontendfixtures samen kunnen draaien.

### Vitest en gerichte integratietests

Dekking omvat minimaal:

- URL-canonicalisatie, geldige leap day, ongeldige datum, toekomst en onbekend filter;
- doelstates zonder doelen, gemengde doelen, nul, exact doel, boven doel en zeer grote waarden;
- doelvalidatie, toggle/disabled gedrag, annuleren, serverfout en succesvolle opslag;
- logboek laden, fout/retry, lege datum, leeg filter, ready en stale-responsebescherming;
- sortering bij gelijke tijd, één actief typefilter en archiefstatus;
- zoeken bij 0/1/2 tekens, trimmen, debounce, geen resultaten en late response;
- hoeveelheid `0`, negatief, komma, punt, whitespace, extreem hoog en niet-numeriek;
- package-, individual- en content-unitconversie plus incompatibele dimensie;
- toekomstcontrole, lokale middernacht en DST-overgangen;
- create-idempotentie, createconflict, updateconflict, soft-delete, restore en verlopen undo;
- gegevensscheiding en identieke not-foundstate;
- gedeeltelijke macroprofielen, expliciete calorieën, 4/4/9-fallback en afronden na sommeren;
- toegankelijke namen, live regions, focusherstel, keyboardgebruik en één actieve filterchip.

Backendgedrag wordt tegen tijdelijke SQLite getest via echte routes, migraties, repositories en sessiecookies. Geen `vi.mock` of modulemocks.

### Playwright

Twee Chromiumprojecten:

- mobiel: 390 × 844;
- desktop: 1440 × 1024.

De E2E-fixture gebruikt een tijdelijke database en twee testgebruikers. De suite doorloopt:

1. inloggen en uitsluitend eigen data zien;
2. statistieken normaal, leeg en overschreden;
3. doelen in de modal wijzigen, sluiten en na refresh behouden;
4. gedeelde datumcontext tussen statistieken en logboek, typefilter en sortering;
5. log toevoegen met zoeken, packagekeuze, hoeveelheid en datum/tijd;
6. idempotent gedrag bij dubbele submit/retry;
7. detail openen, bewerken en een updateconflict herstellen;
8. verwijderen, undo binnen vijf seconden en verlopen undo;
9. gearchiveerd item in bestaand detail versus niet beschikbaar bij nieuw log;
10. browser terug/vooruit, deep links en contextbehoud;
11. mobiele CTA/tabbar zonder overlap en desktopmodal met focus trap;
12. screenshots van de belangrijkste mobiele en desktopstates.

Laad- en serverfouten worden vooral in Vitest/integratie getest. Alleen deterministische serverfixtures worden in E2E gebruikt; kunstmatige netwerkflakiness hoort niet in de hoofdflow.

## Gerichte verificatie tijdens uitvoering

Voer niet handmatig de volledige workspacesuite uit. Activeer en draai per slice alleen de relevante commando's:

```text
corepack pnpm --filter @product-repos/contracts typecheck
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter @product-repos/backend test -- <gericht-testbestand>
corepack pnpm --filter calory_tracker typecheck
corepack pnpm --filter calory_tracker exec vitest --run app/routes/statistics app/routes/logs
corepack pnpm exec playwright test tests/e2e/calory-tracker.acceptance.spec.ts --project=mobile-chromium
corepack pnpm exec playwright test tests/e2e/calory-tracker.acceptance.spec.ts --project=desktop-chromium
corepack pnpm run test:specs
```

Stop wanneer pnpm om een node_modules purge/recreate vraagt en volg `docs/dependency-management.md`.

## Definition of done

- De vastgelegde datum-, modal-, teller- en responsive keuzes zijn geïmplementeerd zoals gespecificeerd.
- Database, contracts en endpoints volgen de bestaande ERD- en endpointdocumenten na package-ID-alignment.
- Iedere route is refreshbaar, deep-linkbaar en sessiegebonden.
- Mobiele schermen volgen de Figma-compositie; desktop gebruikt de beschikbare brede frames zonder mobiele regressie.
- Alle functionele states en genoemde edge cases hebben actieve, groene tests.
- Playwright slaagt tegen een geïsoleerde echte backend op mobiel en desktop.
- Browsercontrole toont geen consolefouten, mislukte requests, focuslekken of overlap met de bottom-tabbar.
- Exacte Figma-assets zijn lokaal opgeslagen en hun buiten- en binnenmaten zijn visueel gecontroleerd.
- Oude legacycode en modulemocks zijn verwijderd zodra de vervangende slices actief zijn.
