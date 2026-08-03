# Plan — Backendfundament naar een functionele modulaire architectuur

## Status

Voorstel, nog niet uitgevoerd. Dit plan maakt expliciete backendbrede architectuurkeuzes en is na goedkeuring de leidende doelarchitectuur voor nieuwe backendcode en de migratie van bestaande code.

Dit plan vervangt voor de backend de structurele doelbeelden uit featureplannen die nog verwijzen naar globale mappen zoals `src/routes`, `src/services` en `src/repositories`. De functionele requirements, endpointcontracten, domeinregels en ERD's uit die documenten blijven ongewijzigd leidend.

## Bronnen

- huidige backend onder `apps/backend/src`;
- huidige backendtests onder `apps/backend/tests`;
- `docs/domein/productcatalogus-domeinregels.md`;
- `docs/domein/calorie-tracker-domeinregels.md`;
- `docs/backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md`;
- `docs/backend/Endpoints/CALORIE_TRACKER_ENDPOINTS.md`;
- `docs/plans/calory-tracker-architectuur-en-routes-verbeterplan.md`;
- relevante repository- en serviceafspraken uit bestaande productcatalogusplannen.

## Aanleiding

De backend gebruikt momenteel meerdere structuren en dependencyrichtingen naast elkaar:

- merken, categorieën, eenheden en producten staan horizontaal verdeeld over globale `routes`, `services` en `repositories`;
- de Calorie Tracker staat grotendeels als featuremodule onder `src/calorie-tracker`, terwijl de HTTP-route elders staat;
- sommige routes roepen services aan, andere routes roepen repositories of de database rechtstreeks aan;
- repositories importeren andere repositories en combineren opslag, domeinregels, transacties en DTO-projecties;
- de Calorie Tracker heeft betere repositorycontracten en dependency injection, maar gebruikt andere namen en grenzen dan de productcatalogus;
- database, Better Auth en enkele productionservices worden bij module-import als globale singletons aangemaakt;
- er bestaan meerdere `Result`- en foutmodellen;
- routes bevatten nog invoernormalisatie en statusmapping die per route wordt herhaald;
- ongebruikte stubs en tijdelijke bestanden maken de bedoelde architectuur onduidelijk.

De mappen suggereren daardoor een lagenarchitectuur, maar de imports handhaven die lagen niet. Alleen bestanden verplaatsen zou dit niet oplossen.

## Bewijslast en scopepoort

Een **aantoonbaar huidig probleem** is geen voorspelling dat iets later lastig kan worden. Het is een toestand die vóór de wijziging rechtstreeks is aan te wijzen in actuele code, imports, tests of dubbel uitgevoerde logica en nu al één van deze gevolgen heeft:

- een afgesproken dependencygrens wordt omzeild;
- één wijziging vereist kennis van meerdere niet-samenhangende modules;
- een unit kan niet geïsoleerd worden samengesteld of getest door een concrete/global dependency;
- dezelfde technische primitive of foutvorm bestaat nu in meerdere afwijkende varianten;
- een bestand combineert nu onafhankelijke verantwoordelijkheden;
- dode of tijdelijke code maakt de actieve implementatie onduidelijk.

Geen geldige onderbouwing zijn: “modern”, “best practice”, “schaalbaar”, “misschien voor Inventory”, “mogelijk later nodig” of alleen een persoonlijke voorkeur voor extra symmetrie.

Voor deze migratie zijn uitsluitend de volgende actuele problemen en kleinste toegestane reacties vooraf vastgesteld:

| Actuele observatie | Aanwijsbare locatie | Kleinste toegestane reactie |
| --- | --- | --- |
| Globale horizontale mappen en een losse Calorie Tracker-featuremap gebruiken twee structuren. | `src/routes`, `src/services`, `src/repositories`, `src/calorie-tracker` | Actieve code per huidig domein bijeenbrengen onder `src/modules`, zonder lege of toekomstige modules. |
| Meerdere routes importeren repositories of de database rechtstreeks. | `routes/brands.ts`, `routes/categories.ts`, `routes/product.route.ts`, `routes/units.ts`, `routes/health.ts` | De actuele route-use-cases via een geïnjecteerde service/querycapability laten lopen. |
| Repositories importeren andere repositories en mengen zo query-, projectie- en transactieverantwoordelijkheden. | `product-catalog.repository.ts`, `products.repository.ts`, `product-packages.repository.ts` | Alleen de bestaande verantwoordelijkheidgrenzen ontwarren; geen repository per tabel introduceren. |
| Database, Better Auth en productionservices worden tijdens imports geconstrueerd. | `db/index.ts`, `auth/auth.ts`, `calorie-tracker-runtime.ts` | Bestaande resourcecreatie naar expliciete factories en één composition root verplaatsen. |
| Dezelfde environmentconfiguratie wordt verspreid en verschillend geparsed. | `index.ts`, `app.ts`, `db/index.ts`, `auth/auth.ts` | Alleen de nu gebruikte environmentwaarden één keer in `config.ts` valideren. |
| De globale error boundary gebruikt een Calorie Tracker-contract voor alle modules. | `app.ts` | De bestaande generieke defectresponse lokaal typeren zonder nieuw errorframework. |
| De testharness is afhankelijk van environmentmutatie gevolgd door dynamische import. | `tests/test-app.ts` | De tijdelijke database en testconfig expliciet aan dezelfde factories geven. |
| Catalogus en Calorie Tracker hebben verschillende `Result`-typen en constructors. | `src/domain.ts`, `calorie-tracker/calorie-tracker.ts` | Alleen het generieke `Result<T, E>` en zijn constructors delen; foutunions modulelokaal houden. |
| Eén Calorie Tracker-storecontract bevat catalogusreads, logs en doelen, waardoor een gerichte fake alle drie moet implementeren. | `calorie-tracker/calorie-tracker-store.ts`, `tests/calorie-tracker-service.test.ts` | Het huidige contract langs deze drie bestaande capabilities splitsen. |
| De Calorie Tracker-adapter bezit queries over catalogustabellen die ook de catalogusmodule bezit. | `calorie-tracker/drizzle-calorie-tracker.ts` | Eén actuele `ConsumptionCatalogReader`-grens maken en via composition injecteren. |
| Catalogusautorisatie wordt bepaald via een globale hardcoded padlijst. | `auth/catalog-authorization.ts` | De bestaande policy op de catalogusrouter mounten; geen generiek policyframework bouwen. |
| De gekozen functionele dependencyregels worden niet automatisch bewaakt. | huidige `eslint.config.js` en de eerder geïntroduceerde Calorie Tracker-classes | Alleen bestaande ESLintmogelijkheden configureren voor de nu afgesproken import- en classregels. |
| Er bestaan aantoonbaar ongebruikte stubs en tijdelijke bestanden. | `repositories/tmp`, `routes/product-package.route.ts`, brand- en unitservice-stubs | Alleen na importercontrole verwijderen. |

Voor iedere implementatiestap geldt een stopregel:

1. wijs de actuele locatie en concrete ongewenste koppeling aan;
2. beschrijf welke huidige use-case of test daardoor geraakt wordt;
3. kies de kleinste wijziging die dat probleem oplost;
4. behoud publiek gedrag;
5. sla de wijziging over wanneer de observatie door eerdere stappen al niet meer bestaat.

Een planregel is dus geen verplichting om een abstractie te bouwen wanneer de actuele code het genoemde probleem op het uitvoeringsmoment niet meer heeft.

## Vaststaande architectuurkeuzes

### 1. Modulaire monoliet per bounded context

De backend blijft één deploybare Hono-service en één database gebruiken. Code wordt primair per functioneel domein gegroepeerd, niet in backendbrede verzamelmappen voor routes, services en repositories.

De eerste modules zijn:

- `auth` — authenticatie, sessieresolutie en autorisatiebeleid;
- `catalog` — producten, verpakkingen, merken, categorieën en referentiedata;
- `calorie-tracker` — consumptielogs, doelen en statistieken;
- `health` — de bestaande liveness- en database-readinessroutes.

Er wordt nu geen Inventory-module aangemaakt: de backend bevat daarvoor nog geen actieve routes of use-cases. Het bestaande inventorydatabaseschema blijft staan waar het staat.

Producten, verpakkingen, merken, categorieën en eenheden blijven samen in `catalog`, omdat zij één cataloguscontext vormen. Er komt geen kunstmatige module per tabel.

### 2. Functional core, imperative shell

Applicatie-eigen code is functioneel opgebouwd:

- pure domeinfuncties voor berekeningen en invarianten;
- factoryfuncties voor services, repositories, externe adapters en middleware met dependencies;
- structurele capabilitytypen voor repository- en externe dependencygrenzen;
- expliciete composition aan de procesrand;
- geen applicatie-eigen classes zonder aantoonbare identity-, lifecycle- of frameworknoodzaak.

Frameworkobjecten zoals Hono, Better Auth, Drizzle, `Date`, `URL`, `Map` en `Set` vallen niet onder dit verbod.

### 3. Geen anticiperende abstracties

De migratie volgt YAGNI:

- alleen abstraheren voor een huidige use-case, huidige externe grens of minimaal twee actuele gelijksoortige toepassingen;
- geen lege mappen, facades, capabilities of configuratieopties voor mogelijk toekomstig gebruik;
- bestaande modulelokale hulpmiddelen zoals de Calorie Tracker-klok blijven lokaal zolang er geen tweede actuele gebruiker is;
- geen generieke logger-, ID-generator-, event- of lifecyclecapability zonder actuele noodzaak;
- een nieuwe abstractie vermeldt in de implementatiediff welk bestaand probleem zij oplost.

### 4. Functionele services en repositories zonder framework

Services hangen af van kleine repository- en externe capabilities. Concrete Drizzle-repositories en Better Auth-adapters implementeren die capabilities functioneel. Er komt geen DI-container, decoratorframework, base repository of generiek repositoryframework.

Een repositorycontract wordt gemodelleerd als een readonly record van functies, bijvoorbeeld:

```ts
export type ConsumptionLogRepository = {
  readonly findById: (logId: string) => ConsumptionLogRecord | undefined;
  readonly insert: (input: InsertConsumptionLogRecord) => ConsumptionLogRecord | undefined;
};
```

De concrete Drizzle-repository wordt met een factory gemaakt:

```ts
export function createDrizzleConsumptionLogRepository(database: Database): ConsumptionLogRepository {
  // Private query functions and returned capabilities.
}
```

### 5. Eén composition root

Alle productiondependencies worden in één composition root samengesteld:

- getypeerde configuratie;
- databaseverbinding en sluitfunctie;
- Better Auth-adapter;
- repositories en module-readers;
- services;
- autorisatiemiddleware;
- routes;
- achtergrondjobs.

Routes importeren geen productionsingleton. Modules openen geen databaseverbinding bij import. Tests kunnen dezelfde composition met een tijdelijke database en expliciete testconfiguratie uitvoeren.

### 6. Domein eerst, herkenbare technische lagen daarbinnen

Iedere functionele module gebruikt waar relevant dezelfde herkenbare onderverdeling:

- `domain` — pure domeinregels, typen en berekeningen;
- `services` — use-cases en orchestration;
- `repositories` — repositorycontracten en concrete persistence-implementaties;
- `routes` — Hono-routes, transportparsing, authcontext en HTTP-mapping;
- `adapters` — uitsluitend voor externe systemen die geen repository zijn, zoals Better Auth.

Binnen iedere module geldt:

```text
routes -> services -> domain
                  -> repositorycontracten
repositories -----> repositorycontracten/domain
composition ------> routes/services/concrete repositories/adapters
```

Regels:

- `domain` importeert geen Hono, Drizzle, Better Auth, databasecode of HTTP-contractschema;
- `services` importeren domeincode en repositorycontracten, nooit concrete Drizzle-repositories;
- concrete repositories importeren databasecode en implementeren repositorycontracten;
- `routes` parsen transportdata, lezen requestcontext, roepen services aan en vertalen resultaten naar HTTP;
- alleen de composition root kent concrete repositories/adapters én hun consumenten;
- modules importeren niet willekeurig uit interne lagen van een andere module;
- een module-overschrijdende import wordt alleen toegestaan voor een capability die de applicatie nu daadwerkelijk gebruikt en wijst rechtstreeks naar het expliciet aangewezen contractbestand;
- er komt binnen deze migratie geen `public.ts`, barrel of modulefacade.

Kleine modules hoeven geen lege mappen te krijgen. `health` mag bijvoorbeeld met één service- en één routebestand beginnen. De map ontstaat pas wanneer de verantwoordelijkheid werkelijk bestaat.

### 7. Repository betekent persistence, niet alle backendlogica

Repositories en storage-adapters:

- voeren gerichte databasequeries uit;
- bewaken opslagatomiciteit en transacties;
- classificeren verwachte persistence-uitkomsten;
- retourneren use-case records of read models; zo'n read model mag dezelfde shape hebben als een bestaand contract-DTO wanneer dat dubbele mapping voorkomt;
- kennen geen Hono-context, statuscode of HTTP-errorresponse;
- voeren geen requestvalidatie uit;
- importeren geen andere publieke repositorymodule.

Gedeelde queryhelpers binnen de repositories van dezelfde module mogen private worden hergebruikt. Een use-case die meerdere writes atomair nodig heeft, krijgt één atomische repositoryoperatie; er komt geen generieke Unit of Work.

### 8. Expliciete grenzen tussen catalogus en Calorie Tracker

De Calorie Tracker leest actuele catalogusdata, maar krijgt geen directe afhankelijkheid van catalogusinternals.

De catalogus exposeert een gerichte read-capability voor consumptie, met onder meer:

- één verpakking met actuele product-, merk-, eenheid-, portie- en macrodata lezen;
- meerdere benodigde verpakkingen in één batch lezen;
- actieve verpakkingen gericht zoeken;
- recente actieve verpakkings-ID's naar projecties vertalen;
- compatibele eenheden lezen.

De Calorie Tracker hangt van deze capability af. Foreign keys blijven database-integriteit bewaken, maar Calorie Tracker-services importeren geen catalogus-Drizzlequeries of schema-internals.

De huidige brede `CalorieTrackerStore` wordt opgesplitst in minimaal:

- `ConsumptionLogRepository`;
- `NutritionGoalRepository`;
- `ConsumptionCatalogReader`.

### 9. Eén intern Result-patroon, fouten per module

Er komt één generiek gedeeld `Result<T, E>`-type met `ok`- en `err`-constructors. Er komt geen backendbrede mega-union met alle featurefoutcodes.

Iedere module definieert een eigen verwachte foutunion met de bestaande publieke foutcode als discriminant. Er wordt geen tweede set interne fouttags geïntroduceerd wanneer de huidige code al precies genoeg is. Bijvoorbeeld:

```ts
type UpdateLogError =
  | { readonly code: "LOG_NOT_FOUND"; readonly message: string }
  | { readonly code: "LOG_UPDATE_CONFLICT"; readonly message: string }
  | { readonly code: "PRODUCT_PACKAGE_ARCHIVED"; readonly message: string };
```

Regels:

- verwachte validatie-, not-found-, conflict- en availability-uitkomsten zijn waarden;
- onverwachte programmeer-, invariant- en onbekende databasefouten worden defects en bereiken de globale error boundary;
- statusmapping gebeurt uitsluitend in routes;
- publieke foutcodes en statuscodes blijven tijdens deze migratie ongewijzigd;
- technische oorzaken en credentials komen nooit in responses of openbare foutwaarden.

### 10. Functieconventies

Voor applicatie-eigen TypeScript geldt:

- functienamen zijn Engels en beschrijven één intentie;
- named function declarations voor geëxporteerde operations en betekenisvolle interne operations;
- arrow functions hoofdzakelijk voor callbacks en kleine capabilitywaarden;
- iedere functie heeft een Engelse docstring;
- geëxporteerde factories en modulecapabilities hebben een expliciet returntype;
- dependencies staan in één readonly dependencyobject;
- use-case-input met meerdere velden is één readonly inputobject;
- domain inputs en outputs zijn immutable;
- geen `any`, ongecontroleerde casts of ongeparseerde boundarydata;
- geen pass-throughservice zonder use-case- of orchestrationverantwoordelijkheid;
- geen service die concrete Drizzlecode importeert;
- geen booleanparameters wanneer een benoemde union of inputproperty de intentie duidelijker maakt;
- helpers blijven private totdat daadwerkelijk hergebruik bestaat;
- splitsen gebeurt op verantwoordelijkheid, niet op een arbitrair maximaal aantal regels.

Deze conventies gelden voor nieuwe en inhoudelijk geraakte functies. Bestaande signatures worden niet uitsluitend voor stijl herschreven wanneer daar geen actueel onderhouds- of testbaarheidsprobleem mee wordt opgelost.

SQLite- en Drizzle-operaties blijven synchroon zolang de gekozen adapter synchroon is. Er worden geen kunstmatige `Promise`-wrappers toegevoegd. Async wordt gebruikt wanneer de echte dependency of HTTP-operatie async is.

### 11. Transportvalidatie en domeinvalidatie zijn gescheiden

- Zod-contracten valideren request- en responsevormen aan de HTTP-grens;
- routes normaliseren geen domeinwaarden buiten transportparsing;
- services en domain code bewaken businessinvarianten;
- repositories vertrouwen niet op TypeScripttypes voor database-integriteit;
- responsevalidatie blijft aanwezig waar gedeelde contractschema's dit nu voorschrijven;
- ruwe Drizzle-records verlaten de concrete repository niet.

### 12. Configuratie en resources hebben geen import-side-effects

Er komt een getypeerde `loadBackendConfig(env)` die configuratie één keer valideert. Alleen bootstrap/configcode leest `process.env`.

`createDatabase(config)` retourneert minimaal:

- de getypeerde Drizzle-database;
- de SQLiteverbinding voor technische operations;
- een idempotente `close()`.

Better Auth wordt met `createAuthAdapter({ database, config })` gemaakt. De serverentrypoint is eigenaar van starten en stoppen. Jobs maken hun eigen composition en sluiten resources in `finally`.

### 13. HTTP-shell en foutafhandeling

De globale HTTP-shell behoudt en ordent de verantwoordelijkheden die nu al bestaan:

- een correlation ID in onverwachte foutresponses, zoals de huidige error boundary al doet;
- veilige defectlogging zonder bodies, cookies of technische causes;
- generieke not-found- en defectmapping zonder afhankelijkheid van een featurecontract;
- centrale CORS-configuratie vanuit de getypeerde config;
- modulelokale authmiddleware in plaats van een globale hardcoded padallowlist;
- een getypeerde authenticated principal in requestcontext;
- een geïnjecteerde database-readinessfunctie in plaats van een route-import van de globale database.

Er wordt geen requestbrede tracing-, logging- of observabilitylaag toegevoegd. Dat vereist eerst een concrete operationele behoefte.

Publieke responsebodies en endpointpaden wijzigen niet als onderdeel van deze structurele migratie. Een uniforme publieke error-envelope is een afzonderlijk API-besluit.

## Doelstructuur

De exacte kleine bestandsnamen mogen tijdens uitvoering worden verfijnd. De laaggrenzen en dependencyrichting zijn normatief.

```text
apps/backend/src/
  index.ts                    # procesbootstrap, Bun.serve en shutdown
  app.ts                      # globale Hono-shell en modulemounts
  config.ts                   # actuele backendconfiguratie valideren
  composition.ts              # enige production composition root
  result.ts                   # gedeeld Result, nu al door meerdere domeinen gebruikt
  db/                         # bestaande database-, schema-, seed- en migratiecode
  modules/
    auth/
      domain/
      services/
      adapters/
      routes/
    catalog/
      domain/
      services/
      repositories/
      routes/
    calorie-tracker/
      domain/
      services/
      repositories/
      routes/
    health/
      health.service.ts
      health.routes.ts
  jobs/
    cleanup-deleted-consumption-logs.ts
```

Repositorycontracten en concrete implementaties staan bewust samen onder de herkenbare map `repositories`. Bestandsnamen maken het verschil expliciet: `*.repository.ts` zonder technologienaam bevat het contract; `drizzle-*.repository.ts` bevat de concrete implementatie. Services mogen alleen de contractbestanden importeren. De composition root importeert de Drizzle-bestanden en injecteert ze.

De globale Hono-shell en defectafhandeling blijven in `app.ts`; daar wordt geen extra map voor gemaakt. Functionele endpoints staan onder `modules/<domein>/routes`.

Er worden geen modulebarrels of `public.ts`-bestanden aangelegd. De actuele koppeling van de Calorie Tracker aan catalogusdata gebruikt rechtstreeks het expliciete contractbestand `catalog/repositories/consumption-catalog-reader.ts`.

## Servicecapabilities

### Catalogus

De catalogusservices worden verdeeld op samenhangende use-cases:

- catalogus browsen en zoeken;
- producten en verpakkingen lezen en muteren;
- merken, categorieën, eenheden en verpakkingstypen beheren/lezen;
- een consumption-facing catalogusreader voor de Calorie Tracker.

Iedere catalogusroutefactory ontvangt alleen de servicecapabilities die haar huidige endpoints gebruiken. Er wordt geen overkoepelend `CatalogService`-object gemaakt als de bestaande routegroepen zonder zo'n facade duidelijk te componeren zijn. Routes importeren geen repositories.

### Calorie Tracker

De bestaande functionele `createCalorieTrackerService(dependencies)` blijft het service-entrypoint voor de huidige logboek-, nutrition- en package-discovery-use-cases. De brede persistence dependency wordt opgesplitst, maar de service zelf wordt niet vooraf in meerdere services verdeeld. Private helpers en pure projecties blijven alleen afzonderlijk waar zij nu al een concrete verantwoordelijkheid isoleren.

### Auth

De authmodule exposeert:

- de Better Auth HTTP-handler;
- `resolvePrincipal(headers)` als servicecapability;
- pure rol- en autorisatiepolicies;
- middlewarefactories die de nu benodigde session resolver ontvangen.

Catalogus- en Calorie Tracker-routes mounten hun eigen vereiste policy. Paden worden niet globaal geïnspecteerd om autorisatie te bepalen.

## Implementatiefasen

Iedere fase houdt extern gedrag stabiel, gebruikt gerichte verificatie en laat de doorlopende volledige testsuite intact. Mechanische verplaatsingen en inhoudelijke wijzigingen worden waar mogelijk afzonderlijk gehouden zodat diffs controleerbaar blijven.

### Fase 0 — Baseline en migratiekaart

1. Herbevestig per rij uit de scopepoort dat de observatie nog in de actuele working tree bestaat; verwijder een voorgenomen wijziging wanneer het probleem al is opgelost.
2. Maak tijdens uitvoering een tijdelijke checklist van de huidige backendroutes, methodes, statuscodes, authregels en responsecontracten; voeg geen extra permanent document toe naast de bestaande endpointdocumentatie.
3. Koppel bestaande backendtests aan de modules en use-cases die zij beschermen.
4. Inventariseer alle imports vanuit scripts, tests en andere workspaces naar backendinterne paden.
5. Controleer de actieve working tree en behoud alle bestaande Calorie Tracker-, auth- en routewijzigingen.
6. Voeg nog geen nieuwe abstrahering toe voordat het huidige probleem en de geraakte test/use-case expliciet zijn benoemd.

Resultaat: een expliciete gedragbaseline en een verplaatsingskaart zonder productiegedrag te wijzigen.

### Fase 1 — Gedeeld Result, configuratie en resourcefactories

1. Deel alleen het generieke `Result<T, E>` dat catalogus en Calorie Tracker nu beide gebruiken.
2. Houd klokken, foutunions en andere capabilities modulelokaal zolang zij maar één actuele gebruiker hebben.
3. Voeg `loadBackendConfig(env)` toe met validatie voor de environmentwaarden die de backend nu leest: poort, host, database, CORS en authconfiguratie.
4. Vervang de import-time databaseopening door `createDatabase(config)`.
5. Behoud de bestaande `db`-map, schema-indeling, tabellen en migraties; wijzig alleen imports die nodig zijn om resourcecreatie expliciet te maken.
6. Pas migrate-, seed- en cleanupentrypoints aan zodat zij resources expliciet openen en sluiten.

Resultaat: imports zijn side-effectvrij; configuratie en resourceownership zijn expliciet.

### Fase 2 — Composition root en HTTP-shell

1. Maak `createBackendRuntime(config)` verantwoordelijk voor de concrete wiring die production nu nodig heeft.
2. Laat `createApp(dependencies)` uitsluitend globale middleware en reeds samengestelde moduleroutes mounten.
3. Maak de Better Auth-instantie via een factory en injecteer handler en session resolver.
4. Behoud de bestaande correlation ID bij defects en maak de globale error boundary feature-onafhankelijk; voeg geen requestbrede tracinglaag toe.
5. Injecteer de bestaande database-readinessfunctie in de healthmodule.
6. Pas de testharness aan om een tijdelijke database en testconfig expliciet te componeren, zonder environment-plus-dynamic-importtruc.

Resultaat: production en tests gebruiken dezelfde compositionroute; geen route importeert een productionsingleton.

### Fase 3 — Calorie Tracker als referentiemodule

1. Verplaats de bestaande pure domeincode onder de module zonder vooraf één bestand per onderwerp af te dwingen; splits alleen een bestaand bestand wanneer dat tijdens deze migratie nodig is om twee actuele verantwoordelijkheden los te koppelen.
2. Splits `CalorieTrackerStore` in logrepository, goalrepository en catalogusreader.
3. Verplaats catalogusqueries uit de Calorie Tracker-repository naar de catalogusmodule en exposeer alleen `ConsumptionCatalogReader`.
4. Behoud één functionele Calorie Tracker-service zolang verdere servicesplitsing geen afzonderlijk actueel probleem oplost.
5. Houd projecties expliciet en laat geen projectiefout als gedeeltelijk succes passeren.
6. Maak Drizzle-repositories met geïnjecteerde databasecapabilities.
7. Verplaats de route onder `routes` in de module en injecteer de service en authmiddleware.
8. Laat de cleanupjob dezelfde logrepository en klok via composition gebruiken.
9. Behoud exact:
   - ownership;
   - idempotentie;
   - optimistic concurrency;
   - opgeslagen tijdzonegedrag;
   - exacte decimalen;
   - actuele catalogus als bron van waarheid;
   - soft delete, restore en cleanup;
   - huidige endpointpaden en foutcodes.

Resultaat: één complete referentiemodule waarmee de architectuurregels aantoonbaar werken.

### Fase 4 — Catalogusmodule migreren

#### Fase 4A — Queries en referentiedata

1. Migreer merken, categorieën, eenheden, verpakkingstypen, browsen en zoeken naar de catalogusmodule.
2. Verplaats trim-, pad-, sorteer- en duplicate-regels naar `domain` of `services` waar zij horen.
3. Vervang route-naar-repositoryimports door catalogusservicecapabilities.
4. Laat bestaande querysemantiek tijdens de architectuurmigratie gelijk; optimaliseer alleen een query waarvoor een actueel gemeten of getest probleem bestaat.
5. Laat categorieboomfuncties pure domainfuncties blijven.

#### Fase 4B — Producten en verpakkingen

1. Definieer repositorycontracten rond aggregate-use-cases, niet rond iedere tabel.
2. Houd product plus eerste verpakking plus macroprofiel atomair.
3. Houd productupdate plus macroprofiel atomair.
4. Houd package- en portiecorrecties atomair en behoud bestaande logreferentiechecks.
5. Verwijder repository-naar-repositoryimports; gebruik private queryhelpers binnen de catalogusrepository of service-orchestration.
6. Laat repositories geen HTTP-fouten of Hono-responses retourneren; behoud een bestaand contract-DTO als use-case read model wanneer een extra tussenmodel geen actuele waarde heeft.
7. Houd database-rowprojecties in de concrete repository en transportvalidatie in routes; voeg alleen een aparte serviceprojectie toe wanneer daar nu domein- of presentatielogica zit.
8. Verdeel de huidige grote repositories alleen waar zij nu aantoonbaar verschillende capabilities of transactiegrenzen combineren, niet op tabellen of willekeurige regelaantallen.

Resultaat: alle catalogusroutes volgen route → service → repositorycontract ← Drizzle-repository.

### Fase 5 — Auth, autorisatie en health afronden

1. Verplaats sessieresolutie en Better Auth-integratie naar de authmodule.
2. Houd rolinterpretatie als pure policy.
3. Mount catalogusautorisatie op de catalogusrouter en gebruikersauthenticatie op de Calorie Tracker-router.
4. Verwijder de globale `protectedCatalogRoots`-padinspectie.
5. Classificeer auth-unavailability als getagde waarde; onbekende defects blijven globale fouten.
6. Laat health de bestaande databaseprobe geïnjecteerd ontvangen; injecteer klok of processinformatie alleen wanneer een actuele test of use-case dat vereist.
7. Controleer dat authcookies, sessieduur, signupbeleid en publieke Better Auth-paden ongewijzigd blijven.

Resultaat: autorisatie volgt moduleownership en kan zonder globale padkennis worden getest.

### Fase 6 — Legacystructuur en dode code verwijderen

1. Verwijder na volledige migratie de globale mappen:
   - `src/routes`;
   - `src/services`;
   - `src/repositories`;
   - de oude rootfeaturemappen die naar `src/modules` zijn verhuisd.
2. Verwijder aantoonbaar ongebruikte code:
   - `src/repositories/tmp`;
   - de lege `product-package.route.ts`;
   - ongebruikte brand- en unitservice-stubs die `undefined` retourneren;
   - backward-compatibility exports zonder actieve importer.
3. Verwijder geen gedocumenteerde endpointfunctionaliteit; een stub is geen geïmplementeerde feature.
4. Normaliseer bestandsextensies en imports naar één conventie.
5. Controleer dat geen productiecode meer rechtstreeks `process.env`, de database of Better Auth importeert buiten config, composition, `db`, concrete repositories en externe adapters.

Resultaat: de bronstructuur toont de echte architectuur zonder oude parallelle conventie.

### Fase 7 — Architectuur met bestaande tooling bewaken

1. Gebruik ESLint-overrides met `no-restricted-imports` voor de actuele dependencyregels:
   - routes importeren geen database of concrete repository/adapter;
   - services importeren geen Hono, Drizzle of concrete repository;
   - domain importeert geen services, routes, repositories of adapters;
   - services mogen alleen repositorycontracten importeren, nooit bestanden met `drizzle` in de naam;
   - cross-module imports zijn beperkt tot de huidige expliciet toegestane contractbestanden.
2. Verbied applicatie-eigen classdeclaraties met de bestaande ESLintmogelijkheden; er wordt geen hypothetische allowlist aangelegd.
3. Behoud de bestaande regels tegen `any` en floating promises.
4. Voeg geen afzonderlijke architectuurtest, package of framework toe wanneer ESLint dezelfde huidige regels kan afdwingen.
5. Laat iedere nieuwe factory en export de docstring- en naamgevingsconventie volgen.

Resultaat: de afgesproken huidige dependencyregels worden afgedwongen zonder een tweede architectuurcontrolesysteem te bouwen.

### Fase 8 — Bestaande tests gericht herschikken en architectuur documenteren

1. Behoud bestaande gedrags- en integratietests als primaire regressiebescherming.
2. Voeg alleen een pure domeintest toe wanneer geëxtraheerde domeinlogica nog niet rechtstreeks wordt afgedekt.
3. Voeg alleen een servicetest met handgeschreven fake repository toe voor actuele branching of foutpaden die via routes moeilijk precies te bewijzen zijn.
4. Gebruik een echte gemigreerde tijdelijke SQLite-database wanneer repositoryqueries of transactiegrenzen veranderen.
5. Voeg geen afzonderlijke test per laag toe als een bestaande gerichte test de grens al voldoende bewijst.
6. Maak de huidige testharness expliciet via `createBackendTestRuntime()` met cleanup, zodat importvolgorde niet langer onderdeel van de testopstelling is.
7. Voeg `docs/backend/BACKEND_ARCHITECTUUR.md` toe als enige inhoudelijke architectuurbeschrijving en laat `apps/backend/README.md` daar alleen kort naar verwijzen.
8. Pas endpoint- en domeindocumentatie alleen aan wanneer tijdens uitvoering daadwerkelijk publiek gedrag verandert.

Resultaat: de architectuur is zowel gedocumenteerd als door tooling en tests bewaakt.

## Test- en verificatiestrategie

Draai niet handmatig de volledige testsuite. Verifieer per fase alleen de geraakte grenzen en laat de doorlopende suite intact.

### Per foundationfase

```text
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter @product-repos/backend exec eslint <geraakte bestanden>
```

### Per modulemigratie

- modulegerichte pure domain- en servicetests;
- gerichte repository-integratietests;
- bestaande route-integratietests voor uitsluitend de gemigreerde module;
- contractparse van requests en responses;
- geen testnaam of assertion verwijderen alleen om de verplaatsing groen te krijgen.

Voor de Calorie Tracker minimaal:

```text
corepack pnpm --filter @product-repos/backend exec bun test \
  tests/calorie-tracker-service.test.ts \
  tests/calorie-tracker.test.ts \
  tests/calorie-tracker-coverage.test.ts
```

Voor de catalogus worden de specifieke product-, package-, browse-, merk-, categorie- en unitbestanden geselecteerd; niet automatisch de volledige backendtestsuite.

### Eindverificatie

- backend typecheck;
- gerichte backendlint;
- ESLint-controle van de dependencyregels;
- alle geraakte backendtestbestanden per module;
- backendbuild;
- geen devserver starten, stoppen of herstarten.

Stop wanneer pnpm dependencyherstel of een node_modules-purge vraagt. Deze architectuurmigratie installeert of herstelt geen dependencies.

## Migratieregels voor veilige uitvoering

- Geen endpointpad, methode, payload of foutcode wijzigen als bijwerking van een move.
- Geen databasekolom of migratie herschrijven voor alleen een maprename.
- Eerst gedrag vastleggen, daarna verplaatsen, daarna dependencygrenzen aanscherpen.
- Houd rename-only diffs waar mogelijk los van logische rewrites.
- Behoud bestaande user changes in de working tree; gebruik geen reset, checkout of brede formattering.
- Introduceer tijdelijk compatibiliteitsmodules voor oude imports alleen wanneer dit een fase atomair en reviewbaar houdt; verwijder ze uiterlijk in fase 6.
- Geen nieuwe generieke abstractie zonder minimaal twee concrete, inhoudelijk gelijke toepassingen.
- Iedere structurele wijziging verwijst tijdens uitvoering naar één actuele observatie uit de scopepoort; ontbreekt die koppeling, dan wordt de wijziging niet uitgevoerd.
- Wanneer de kleinste oplossing geen nieuw bestand, type of factory vereist, krijgt die kleinere oplossing voorrang.
- Geen microservices, event bus, CQRS of event sourcing voor problemen die de huidige monoliet niet heeft.

## Risico's en mitigaties

| Risico | Mitigatie |
| --- | --- |
| Grote verplaatsingsdiff verbergt gedragswijzigingen. | Rename en logische wijzigingen per fase scheiden; contract- en route-integratietests behouden. |
| Circular imports tussen catalogus en Calorie Tracker. | De Calorie Tracker importeert alleen het actuele `ConsumptionCatalogReader`-contractbestand; composition injecteert de concrete implementatie. |
| Gedeelde code groeit uit tot een dumpmap. | Deel nu alleen `Result`, omdat catalogus en Calorie Tracker dat allebei al gebruiken; overige helpers blijven modulelokaal. |
| Ports worden te breed en fakes worden zwaar. | Capabilities per samenhangende use-case splitsen en dependencies compositioneel combineren. |
| Repositories verliezen transactionele atomiciteit tijdens opsplitsen. | Atomische aggregate-operaties expliciet in repositorycontracten modelleren en met repository-integratietests bewijzen. |
| Authfactory verandert cookies of sessiegedrag. | Bestaande authconfig exact projecteren en authintegratietests vóór en na migratie vergelijken. |
| Testharness blijft afhankelijk van importvolgorde. | Database en config expliciet aan `createBackendTestRuntime()` geven. |
| Architectuurregels worden na migratie opnieuw omzeild. | De actuele import- en classregels met bestaande ESLintmogelijkheden afdwingen. |
| Interne foutmodellering wijzigt publieke responses. | Modulelokale HTTP-mappers en bestaande endpointcontracttests behouden. |
| Overengineering vertraagt features. | Geen DI-container, generieke repository, event bus of één bestand per triviale functie; abstraheren op echte domeingrenzen. |

## Buiten scope

- Nieuwe catalogus-, Calorie Tracker- of inventoryfeatures.
- Wijziging van publieke endpointpaden of API-versionering.
- Wijziging van database-engine of deploymodel.
- Opsplitsing naar microservices.
- Event sourcing, CQRS, message broker of distributed transactions.
- Frontendherstructurering.
- Publieke basename- of workspace-rename van `apps/calory_tracker`.
- Een uniforme nieuwe publieke error-envelope zonder afzonderlijk contractbesluit.

## Definition of done

- Iedere uitgevoerde structurele wijziging is gekoppeld aan een nog aanwezige actuele observatie uit de scopepoort en gebruikt de kleinste afdoende oplossing.
- De backend is een functionele modulaire monoliet met modules voor auth, catalogus, Calorie Tracker en health.
- Iedere module gebruikt waar relevant dezelfde herkenbare onderverdeling in `domain`, `routes`, `services` en `repositories`; externe niet-persistencekoppelingen staan onder `adapters`.
- Routes importeren geen repositories, database, Better Auth-singleton of productionservice.
- Services importeren alleen repositorycontracten en nooit concrete Drizzle-repositories.
- Domain code is pure TypeScript zonder frameworkimports.
- Repositories importeren geen andere publieke repositories en lekken geen Drizzle-records of HTTP-responses.
- De Calorie Tracker gebruikt aparte log-, goal- en cataloguscapabilities.
- Catalogusdata voor consumptie loopt via het expliciete, nu gebruikte `ConsumptionCatalogReader`-contract.
- Config, database, auth, services, routes en jobs worden in één composition root samengesteld.
- Module-imports openen geen database of andere resource.
- Verwachte fouten gebruiken één generiek Result-patroon met modulelokale foutunions en de bestaande publieke foutcodes.
- Publieke endpoints, statuscodes, contracten, authregels en domeingedrag zijn ongewijzigd.
- Dode stubs, tijdelijke bestanden en de parallelle oude mapstructuur zijn verwijderd.
- Architectuurregels worden door de bestaande ESLinttooling afgedwongen zonder een tweede controlesysteem.
- Bestaande tests zijn alleen aangevuld waar een gewijzigde domein-, service-, repository-, route- of compositiongrens nog niet voldoende werd beschermd.
- `docs/backend/BACKEND_ARCHITECTUUR.md` beschrijft de doelarchitectuur; `apps/backend/README.md` verwijst er alleen naar.
- Gerichte typechecks, lint, builds en relevante moduletests zijn groen zonder de doorlopende volledige testsuite te onderbreken.
