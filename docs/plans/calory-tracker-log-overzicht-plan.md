# Implementatieplan — Figma-consumptielogboek

> Status: vervangen door [calory-tracker-figma-implementatieplan.md](./calory-tracker-figma-implementatieplan.md).

## Bronnen

- Figma-bestand `Calorie Tracker – Productcatalogus stijl`:
  - desktop: node `2:2` (`Desktop — Logboek`, 1440 × 1024);
  - mobiel: node `2:184` (`Mobile — Logboek`, 390 × 844).
- Featurespecificatie: `docs/specs/calorie-tracker/logs/log-overzicht.md`.
- Algemene Calorie Tracker-specificatie: `docs/specs/calorie-tracker/calorie-tracker-specificatie.md`.
- Gedeelde shell: `docs/specs/shared/bottom-tabbar-specificatie.md`.
- Gerelateerde, maar afzonderlijke slices:
  - `docs/specs/calorie-tracker/logs/log-toevoegen.md`;
  - `docs/specs/calorie-tracker/logs/log-detail-bewerken.md`.

## Doel en afbakening

Implementeer `/logs?date=YYYY-MM-DD&type=<filter>` als responsief consumptielogboek volgens de desktop- en mobiele Figma-frames. De slice omvat:

- canonieke datum- en filterstate in de URL;
- datumselectie, `Vandaag` en waar passend vorige/volgende dag;
- filters, zichtbaar aantal, chronologische lijst en alle overzichtstoestanden;
- links naar toevoegen en detail met behoud van datum en filter;
- de gedeelde applicatieshell en actieve logboektab;
- Vitest-dekking voor alle viewstates en kernregels;
- één echte Playwright-E2E met backendfixture, uitgevoerd op desktop en mobiel;
- visuele en functionele validatie na implementatie.

De formulieren voor toevoegen, detail, bewerken en verwijderen worden niet in deze slice gebouwd. De overzichtspagina maakt wel de voorgeschreven route-URL's. Deze vervolgroutes mogen pas als werkend worden gepresenteerd zodra hun eigen slices zijn geïmplementeerd.

## Huidige situatie

- De actieve React Router-app heeft alleen `/` en adminroutes; `/logs` bestaat nog niet.
- De tab `Consumptie Logboek` linkt ten onrechte naar `/`.
- `apps/calory_tracker/src/pages/Dashboard.tsx`, `src/hooks/useConsumptionLogs.ts` en `src/api/client.ts` zijn niet aan de actieve `app/`-router gekoppelde legacycode. Ze gebruiken numerieke product-ID's en niet-bestaande `/consumption-logs`-contracten en zijn geen basis voor deze slice.
- De app gebruikt React 19, React Router 8, TanStack Query en CSS Modules. Tailwind wordt niet toegevoegd; de Figma-output is alleen referentie.
- `BottomTabBar` onder `packages/shared` wordt hergebruikt en niet gekopieerd.
- Vitest en Testing Library zijn aanwezig. Playwright staat op workspaceniveau, maar er is nog geen Playwright-configuratie of E2E-structuur.
- Backend, database en contracts bevatten nog geen gebruikers, sessies, consumptietypes of consumptielogs.

## Tegenstrijdigheden en beslispunten vóór implementatie

### 1. Desktopbreedte versus gedeelde shell

Figma toont op 1440 px een logboekpaneel van 1208 px breed. De gedeelde shellspecificatie zegt dat de Calorie Tracker-hoofdpagina maximaal 430 px breed is.

**Aanbeveling:** specificeer de 430 px-grens als compacte/mobiele paginabreedte en sta voor het logboek vanaf de desktopbreakpoint een inhoudsbreedte van maximaal 1208 px toe. Voordeel: trouw aan Figma en bruikbare desktopregels. Nadeel: de gedeelde shell krijgt een pagina-afhankelijke contentbreedte.

Zonder geaccepteerde specwijziging blijft de bestaande 430 px-regel leidend en kan de desktop-Figma niet getrouw worden geïmplementeerd.

### 2. Bottom-tabbar

Figma toont desktop een gecentreerde tabbar van 432 × 50 px met de labels `Calorie Statistieken`, `Consumptie Logboek` en `Admin Dashboard`. De gedeelde spec schrijft 56 px hoogte, maximaal 430 px, een 40%-anker en de labels `Caloriestatistieken`, `Consumptielogboek` en `Admin` voor.

**Aanbeveling:** houd de gedeelde component en spec leidend voor hoogte, breedte, positie en autorisatie. Corrigeer in de Calorie Tracker-layout wel de route en de huidige typefout `Calorie Statestieken`. Laat Figma daarna op de gedeelde navigatiecomponent aansluiten in plaats van deze pagina lokaal afwijkend te maken.

### 3. Zichtbaar aantal op mobiel

De logboekspecificatie vereist altijd het aantal zichtbare logs. Desktop-Figma toont `5 logs`; mobiel-Figma toont geen aantal.

**Aanbeveling:** volg de featurespecificatie en voeg mobiel tussen chips en lijst een compacte teller toe. Laat deze toevoeging ook in Figma verwerken.

### 4. Ontbrekend actueel domein- en datamodel

`docs/backend/ERD/CALORIE_TRACKER_ERD.md` verklaart dat er geen actueel nutritionmodel is, terwijl de nieuwe Calorie Tracker-specificaties concrete regels stellen voor gebruiker, tijdzone, consumptietype, beschikbaarheid, archivering en logs. De backend heeft die velden/tabellen nog niet. Daarnaast noemt `PRODUCT_ERD.md` een UUID voor `product_package.id`, terwijl schema en contracts momenteel een integer gebruiken.

**Aanbeveling:** leg vóór migratie vast:

- de definitieve `ProductPackageId`-vorm;
- user/session- en tijdzonemodellen;
- `consumptionType`, Calorie Tracker-beschikbaarheid, archiefstatus en afbeeldingsbron;
- de consumptielogtabel met oorspronkelijke hoeveelheid/eenheid, `consumedAt`, gebruikte tijdzone, `createdAt` en soft-deletevelden.

De frontend mag deze ontbrekende gegevens niet afleiden uit productcategorieën of legacytypen.

### 5. Authenticatie

De algemene spec vereist persoonlijke gegevensscheiding en een rolgebonden admintab. `app/layout.tsx` gebruikt nu `isAuthed = true` en toont daarmee de admintab ook zonder echte rolcontrole.

**Aanbeveling:** maak sessie-identiteit en tijdzone een backend- en loaderboundary. De lijstendpoint leidt de gebruiker uit de sessie af en accepteert nooit een vrij `userId`. De E2E gebruikt het voorgeschreven gastaccount of een gelijkwaardige geïsoleerde testidentiteit.

### 6. Ontbrekende Figma-frames voor viewstates

Figma bevat de gevulde overzichtstoestand. De featurespecificatie bepaalt daarnaast laden, laadfout, lege datum en leeg actief filter.

**Aanbeveling:** ontwerp deze states binnen hetzelfde lichte paneel- en kaartsysteem. Houd datum, filters en primaire toevoegactie bereikbaar; gebruik bij filterleegte `Alles tonen` en bij fouten `Opnieuw proberen`. Leg de definitieve state-layout in de featurespecificatie en Figma vast.

### 7. Verouderde documentindex

`docs/plans/specs-implementatieplan-index.md` noemt de inmiddels gevulde logspecs nog leeg en verwijst naar een verwijderd dashboard-specpad. Werk deze index in een aparte documentatie-update bij, zonder de implementatieslice ermee te vermengen.

## Doelarchitectuur

### Contract

Voeg in `packages/contracts/src/consumption-logs.ts` Zod-contracten en afgeleide TypeScript-typen toe en exporteer die rechtstreeks via het package. Parse aan iedere netwerkboundary; verspreid geen ongeparseerde JSON of legacytypen.

De listresponse bevat minimaal:

```ts
type ConsumptionLogListResponse = {
  readonly date: string;
  readonly timezone: string;
  readonly totalForDate: number;
  readonly items: ReadonlyArray<{
    readonly id: string;
    readonly consumedAt: string;
    readonly createdAt: string;
    readonly type: "food" | "drink" | "supplement";
    readonly product: {
      readonly name: string;
      readonly brandName: string | null;
      readonly imageUrl: string | null;
      readonly isArchived: boolean;
    };
    readonly productPackage: {
      readonly id: ProductPackageId;
      readonly summary: string;
      readonly isArchived: boolean;
    };
    readonly originalQuantity: {
      readonly value: string;
      readonly unitLabel: string;
    };
  }>;
};
```

`ProductPackageId` wordt pas ingevuld nadat beslispunt 4 is opgelost. `totalForDate` maakt onderscheid mogelijk tussen een lege datum en een filter zonder resultaten. Items worden server-side op `consumedAt` en daarna `createdAt` oplopend gesorteerd.

### Backend

1. Voeg na goedgekeurde modellering een Drizzle-migratie toe voor gebruikers-/loggegevens en benodigde catalogusvelden.
2. Maak een cohesieve logboek-readrepository die actuele product-, merk- en verpakkingsdata joint, inclusief gearchiveerde records.
3. Maak een application service die:
   - de ingelogde gebruiker en tijdzone gebruikt;
   - de lokale dag naar een UTC-interval vertaalt;
   - uitsluitend logs van die gebruiker leest;
   - typefilter en sortering toepast;
   - verwachte database-/parsefouten als getagde waarden retourneert.
4. Voeg `GET /consumption-logs?date=YYYY-MM-DD&type=<filter>` toe. De route parseert invoer, gebruikt de sessie-identiteit en projecteert getagde uitkomsten naar stabiele HTTP-responses.
5. Geef een `AbortSignal`/requestcancellation waar de stack dit ondersteunt door en log alleen veilige contextvelden zoals datum, filter, user-ID en errortag.

Backendtests gebruiken de tijdelijke SQLite-testdatabase en bewijzen persoonlijke scheiding, datum/tijdzonegrenzen, filters, sortering, archiefweergave, `totalForDate` en foutvertaling.

### Frontendstate en netwerkadapter

1. Voeg een kleine API-adapter toe die de listresponse met het contract parseert en netwerk-, HTTP- en parsefouten naar een precieze `Result`-union vertaalt.
2. Gebruik een TanStack Query-key met datum en filter. Geef het ontvangen `AbortSignal` aan `fetch`, zodat een oudere selectie niet in een nieuwere query terechtkomt.
3. Modelleer de viewstate als tagged union, bijvoorbeeld:
   - `Loading`;
   - `LoadFailed`;
   - `EmptyDate`;
   - `EmptyFilter`;
   - `Ready`.
4. Houd de state-afleiding puur: `totalForDate === 0` levert `EmptyDate`; `totalForDate > 0` met nul items levert `EmptyFilter`.
5. Maak bekende failures zichtbaar als waarden. Alleen programmeerdefecten mogen naar de route-errorboundary ontsnappen.

### Router en URL-state

1. Registreer `route("logs", "routes/logs/consumption-logbook.tsx")` in `app/routes.ts`.
2. Parse `date` en `type` in één pure URL-module:
   - ontbrekende parameters → lokale vandaagdatum en `all`;
   - ongeldige of toekomstige datum → vandaag;
   - onbekend type → `all`;
   - schrijf de canonieke URL met `replace`.
3. Baseer “vandaag” op de geparseerde gebruikerstijdzone, niet op impliciete server- of browsertijd.
4. Gebruik normale React Router-navigatie voor datum en filters, zodat refresh, deep links en browser terug/vooruit werken.
5. Genereer toevoegen- en detaillinks met de actuele `date` en `type`.
6. Corrigeer de logboektab naar `/logs`; onderliggende `/logs/*`-routes houden `aria-current="page"`.

## UI-uitwerking vanuit Figma

### Gemeenschappelijk

- Vertaal de absolute Figma-posities naar semantische flex-/gridlayout in een routegebonden CSS Module.
- Gebruik Inter wanneer dit als lokaal/webfont voor de applicatie is vastgelegd; voorkom een ongedocumenteerde fontwissel.
- Neem de Figma-kleuren en geometrie over in route-eigen CSS custom properties zolang er geen gedeelde tokens bestaan:
  - appachtergrond `#0c1026`;
  - paneel `#f7f9fc`;
  - primaire actie `#18a486`;
  - hoofdtekst `#111827`;
  - secundaire tekst `#687386`;
  - randen `#d8e0ea`.
- Download de exacte Figma-assets voor kalender, chevrons, plus, detailpijl en de drie productplaceholders naar een lokale assetmap. Gebruik geen tijdelijke Figma-URL's en teken iconen niet opnieuw.
- Productafbeelding heeft prioriteit; bij ontbrekende of mislukte afbeelding wordt de passende lokale Figma-placeholder gebruikt.
- Gebruik een volledige kaartlink of gelijkwaardig groot klikdoel, met een beschrijvende toegankelijke naam.

### Desktop

- Donkere paginaheader met titel, ondertitel en `Log toevoegen` rechts.
- Licht afgerond paneel met datumregel, optionele vorige-/volgendedagacties, filterchips, teller en loglijst.
- Logkaart circa 92 px hoog: afbeelding links, tijd/product/verpakking in het midden, hoeveelheid en typelabel rechts en detailchevron aan het einde.
- Alleen de lijstregio scrolt wanneer de beschikbare hoogte onvoldoende is; de pagina blijft bruikbaar bij tekstzoom en langere Nederlandse inhoud.

### Mobiel

- Donkere kop met titel en geselecteerde dag, gevolgd door een afgeronde lichte contentsheet.
- Datumveld en `Vandaag` staan naast elkaar; chips zijn horizontaal scrollbaar zonder zichtbare tekst af te kappen.
- Teller staat tussen chips en lijst, conform de spec.
- Logkaarten zijn circa 104 px hoog en herschikken hoeveelheid en typelabel onder de productregels.
- De brede `Log toevoegen`-actie staat fixed/sticky boven de gedeelde 56 px-tabbar. Reserveer lijstonderruimte voor CTA, 8 px tussenruimte, tabbar en safe-area-inset zodat geen kaart wordt bedekt.

### Toestanden

- `Loading`: toegankelijke laadtekst en kaartskeletten met dezelfde buitenmaten als de lijstitems.
- `LoadFailed`: compacte foutkaart met `Opnieuw proberen`; datum, filters en toevoegen blijven bereikbaar.
- `EmptyDate`: melding voor de geselecteerde datum; toevoegen blijft primair bereikbaar.
- `EmptyFilter`: melding voor het actieve type plus `Alles tonen`, zonder automatisch het filter te veranderen.
- `Ready`: teller, chronologische kaarten en initiële scroll naar de laatste zichtbare log.

Bewaar scrollpositie per canonieke datum/filtercontext. Bij eerste opening van een context scrollt de lijst naar het laatste item; een filterwijziging of terugkeer uit detail overschrijft een reeds opgeslagen positie niet.

## Bestandsplan

Waarschijnlijke wijzigingen:

```text
packages/contracts/src/consumption-logs.ts
packages/contracts/src/index.ts
packages/contracts/package.json

apps/backend/src/db/schemas/calory-tracker.schema.ts
apps/backend/drizzle/migrations/<nieuwe-migratie>.sql
apps/backend/src/repositories/consumption-logs.repository.ts
apps/backend/src/services/consumption-logbook.service.ts
apps/backend/src/routes/consumption-logs.ts
apps/backend/src/app.ts
apps/backend/tests/consumption-logbook.test.ts

apps/calory_tracker/app/routes.ts
apps/calory_tracker/app/layout.tsx
apps/calory_tracker/app/routes/logs/consumption-logbook.tsx
apps/calory_tracker/app/routes/logs/consumption-logbook.module.css
apps/calory_tracker/app/routes/logs/consumption-logbook-state.ts
apps/calory_tracker/app/routes/logs/consumption-logbook-url.ts
apps/calory_tracker/app/api/consumption-log-api.ts
apps/calory_tracker/public/consumption-logbook/<figma-assets>.svg
apps/calory_tracker/app/routes/logs/*.test.ts(x)

playwright.config.ts
tests/e2e/fixtures/consumption-logbook.ts
tests/e2e/calory-tracker-consumption-logbook.spec.ts
```

Voeg `@product-repos/contracts` als directe workspace-afhankelijkheid van `calory_tracker` toe wanneer de route het package rechtstreeks importeert. Gebruik daarvoor uitsluitend `corepack pnpm` tijdens de expliciete implementatietaak; een verificatiecommando mag dependencies niet herstellen.

Verwijder of isoleer de oude `src/`-logboekcode pas wanneer met `rg` is bevestigd dat deze niet door een actieve route wordt gebruikt. Neem de legacy `vi.mock`-test niet over; test via geïnjecteerde poorten en echte component-/routerseams.

## Tests met Vitest

Gebruik geen modulemocks. Render de route/view met een echte `QueryClient`, een memory router en een geïnjecteerde fake `ConsumptionLogPort`, of test de pure view met expliciete stateprops.

### URL- en domeintests

- `/logs` canonicaliseert naar vandaag en `type=all` met replace.
- Geldige datum en elk geldig filter blijven behouden.
- Ongeldige datum, toekomstige datum en onbekend filter vallen canoniek terug.
- Datumwissel behoudt het actieve filter.
- Detaillink en toevoeglink behouden datum en filter.
- Sortering gebruikt eerst `consumedAt`, daarna `createdAt`.

### Viewstates

- `Loading` toont laadstatus/skeletten en geen verouderde items.
- `LoadFailed` toont fouttekst en `Opnieuw proberen`; retry gebruikt dezelfde selectie.
- `EmptyDate` toont de datumlege toestand en houdt `Log toevoegen` bereikbaar.
- `EmptyFilter` toont `Alles tonen`; activeren zet alleen `type=all` en behoudt datum.
- `Ready` toont het juiste zichtbare aantal, tijd, actuele product/merk, verpakking, oorspronkelijke hoeveelheid en tekstueel type.
- Het compacte item toont geen calorieën of macro's.
- Gearchiveerde catalogusdata blijft zichtbaar met het afgesproken label.
- Een snel afgeronde oude aanvraag kan de nieuwe querycontext niet overschrijven.
- Scrollhelper kiest bij eerste context het laatste item en bewaart daarna de bestaande positie.

### Interactie en toegankelijkheid

- Precies één filter is actief en programmatisch herkenbaar, bijvoorbeeld via `aria-pressed`.
- Datumveld heeft een label en blokkeert toekomstige invoer.
- Vorige/volgende dag en `Vandaag` schrijven de juiste URL.
- Kaarten en primaire acties zijn met toetsenbord bereikbaar.
- Fout- en succesmeldingen gebruiken een passende live region zonder focusverlies.

## Playwright-E2E

### Inrichting

1. Voeg een rootconfig toe met twee projecten:
   - Chromium desktop: 1440 × 1024;
   - Chromium mobiel: 390 × 844.
2. Start via `webServer` een geïsoleerde backend met tijdelijke SQLite-database en de Calorie Tracker-app. Gebruik vaste poorten en laat de test niet de ontwikkel-database wijzigen.
3. Seed één testgebruiker met tijdzone, vijf logs op `2026-07-29` en representatieve food/drink/supplementproducten. Seed ook een andere gebruiker om gegevensscheiding te bewaken.
4. Gebruik de echte HTTP-, contract-, repository- en renderketen. Route-interception is geen vervanging voor deze E2E.

### Scenario

De ene E2E-spec doorloopt minimaal:

1. open `/logs?date=2026-07-29&type=all` als testgebruiker;
2. controleer canonieke URL, actieve logboektab, teller en chronologische tijden;
3. controleer dat gegevens van de andere gebruiker niet zichtbaar zijn;
4. kies `Drinken`, controleer URL, teller en uitsluitend drinklabels;
5. kies een andere datum en controleer dat `type=drink` behouden blijft;
6. kies `Alles tonen` vanuit de lege filterstate;
7. controleer dat `Log toevoegen` naar `/logs/nieuw` linkt met datum en filter;
8. controleer op mobiel dat CTA, laatste kaart en bottom-tabbar elkaar niet overlappen;
9. controleer op desktop dat de header-CTA zichtbaar is en de mobiele sticky CTA niet dubbel verschijnt;
10. maak goedgekeurde screenshot-snapshots van desktop en mobiel voor regressiedetectie.

De laad-, fout- en beide lege toestanden worden volledig met Vitest getest. Alleen als de E2E-fixture een deterministische foutmodus via de echte testserver biedt, wordt ook retry aan Playwright toegevoegd; netwerkflakiness wordt niet kunstmatig in de hoofd-E2E gebracht.

## Validatie na implementatie

Voer alleen gerichte verificatie uit; start niet handmatig de volledige workspacesuite.

1. Contract- en frontendtypecheck:

```text
corepack pnpm --filter @product-repos/contracts typecheck
corepack pnpm --filter calory_tracker typecheck
```

2. Backendtypecheck en gerichte backendtest:

```text
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter @product-repos/backend test -- consumption-logbook.test.ts
```

3. Gerichte Vitest-bestanden:

```text
corepack pnpm --filter calory_tracker exec vitest --run app/routes/logs
```

4. Alleen de nieuwe E2E:

```text
corepack pnpm exec playwright test tests/e2e/calory-tracker-consumption-logbook.spec.ts
```

5. Open daarna de lokale pagina in een echte browser op 1440 × 1024 en 390 × 844 en verifieer met DOM-metingen:
   - paneel-/kaartmaten en responsive wissel;
   - sticky CTA boven de tabbar zonder overlap;
   - horizontaal scrollbare chips;
   - focus-, toetsenbord- en retrygedrag;
   - geen consolefouten of mislukte netwerkrequests.
6. Vergelijk browsercaptures met Figma-nodes `2:2` en `2:184`. Controleer voor ieder gedeeld assettype zowel bron als buiten- en binnenmaten.
7. Draai vanwege de aangepaste planfile de gerichte documentatiesuite:

```text
corepack pnpm run test:specs
```

Rapporteer per commando pass/fail en verklaar iedere blokkade. Stop bij een pnpm-purge/recreateprompt en volg `docs/dependency-management.md`; herstel dependencies niet als bijwerking van verificatie.

## Definition of done

- De voorafgaande spec-, ID-, auth- en datamodelbesluiten zijn expliciet genomen.
- `/logs` gebruikt canonieke URL-state en echte, gebruikersgescheiden backenddata.
- Desktop en mobiel volgen de overeengekomen Figma-/specprioriteit zonder gekopieerde bottom-tabbar.
- Alle vijf tagged viewstates zijn met Vitest gedekt zonder modulemocks.
- De Playwright-E2E slaagt in desktop- en mobielproject tegen een geïsoleerde echte backend.
- Browsermetingen, screenshots, console en netwerk zijn na implementatie gecontroleerd.
- Oude aanvragen kunnen geen nieuwe selectie overschrijven en geen lijstitem wordt door CTA of tabbar bedekt.
- Afwijkingen van Figma of specs zijn vóór afronding gedocumenteerd en niet stilzwijgend geïmplementeerd.
