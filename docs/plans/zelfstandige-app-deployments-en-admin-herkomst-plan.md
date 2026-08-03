# Wijzigingsplan — zelfstandige applicatiedeployments en adminherkomst

## Status

Gepland. Dit plan vervangt voor de toekomstige applicatiestructuur het meervoudig mounten van het admin-dashboard uit `docs/plans/admin-dashboard-shared-package-calory-router-plan.md`. De daarin gerealiseerde extractie naar `packages/admin-dashboard` is de huidige technische tussenstap. Omdat na deze wijziging nog maar één applicatie de admincode gebruikt, verhuist de volledige package-inhoud naar `apps/product-management-admin` en vervalt het package.

## Bronnen

- `docs/specs/shared/bottom-tabbar-specificatie.md`
- `docs/specs/calorie-tracker/calorie-tracker-specificatie.md`
- `docs/specs/inventory-client/inventory-client-specificatie.md`
- `docs/specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md`
- `docs/admin-dashboard/admin-dashboard-requirements.md`
- `docs/admin-dashboard/product-requirements.md`
- bestaande code in:
  - `apps/calorie_tracker`;
  - `apps/inventory-admin_panel`;
  - `packages/admin-dashboard` als te migreren huidige bron;
  - `packages/auth-client`;
  - `packages/shared`;
  - `apps/backend`.

## Doel

Maak drie afzonderlijk bouwbare en deploybare frontendapplicaties:

```text
https://apps.jefvanzanten.dev/calorie-tracker
https://apps.jefvanzanten.dev/inventory
https://apps.jefvanzanten.dev/product-management-admin
```

Calorie Tracker en Inventory bevatten geen eigen adminrouteboom meer. Beide openen dezelfde Product Management Admin-deployment. De admin-bottom-tabbar toont een terugkeertab naar de bronapp die via een gevalideerde `source`-queryparameter is meegegeven.

De bestaande backend blijft een afzonderlijke gedeelde service en valt niet onder de drie frontenddeployments.

## Besluiten

### Applicatiegrenzen

- `apps/calorie_tracker` blijft de Calorie Tracker-app.
- `apps/inventory-admin_panel` wordt na verwijdering van de adminroutes hernoemd naar `apps/inventory`.
- `apps/product-management-admin` wordt eigenaar van de inhoudelijke adminpagina's, loaders, actions, server-adapters, featurecomponenten en page-owned componenten.
- De huidige inhoud van `packages/admin-dashboard` verhuist zonder duplicatie naar `apps/product-management-admin`.
- Het verwijderen van `packages/admin-dashboard` en package `@product-repos/admin-dashboard` is verplicht onderdeel van dezelfde migratie en geen latere optimalisatie.
- `packages/shared` blijft eigenaar van de presentatielaag van de bottom-tabbar en kent geen concrete routes.
- `packages/auth-client` blijft eigenaar van gedeelde browserauthenticatie, sessieprojectie en rolhelpers.

### Gewenste eindstructuur

```text
apps/
  calorie_tracker/
  inventory/
  product-management-admin/
    app/
      api/                         # server-adapters van de admin-app
      features/admin/              # productcatalogus en opbergplaatsen
      routes/                      # directe React Router-routes/loaders/actions
      root.tsx
      layout.tsx

packages/
  auth-client/
  contracts/
  shared/
```

Er staat in de eindstructuur geen `packages/admin-dashboard`. Product Management Admin importeert alleen werkelijk gedeelde generieke packages, zoals contracts, authenticatie en de bottom-tabbar. Calorie Tracker en Inventory importeren geen adminroutes, adminloaders, adminactions of adminfeaturecomponenten.

### Publieke en app-interne routes

| App | React Router-`basename` | Belangrijkste app-interne routes |
| --- | --- | --- |
| Calorie Tracker | `/calorie-tracker` | `/`, `/logs`, `/login` |
| Inventory | `/inventory` | `/`, `/login` |
| Product Management Admin | `/product-management-admin` | `/`, `/login`, `/product-catalogus`, `/locations` |

De admin-root `/product-management-admin` stuurt na autorisatie door naar `/product-management-admin/product-catalogus` en behoudt daarbij een geldige broncontext.

### Adminherkomst

De broncontext is een gesloten verzameling:

```ts
type AdminSource = "inventory" | "calorie-tracker";
```

| Bron | Admin-entry | Terugkeerlabel | Terugkeerdoel |
| --- | --- | --- | --- |
| Inventory | `/product-management-admin/product-catalogus?source=inventory` | `Inventarisatie` | `/inventory` |
| Calorie Tracker | `/product-management-admin/product-catalogus?source=calorie-tracker` | `Calorie Tracker` | `/calorie-tracker` |

Een vrije `returnTo`-URL, `Referer` of `history.back()` wordt niet als herkomstmechanisme gebruikt. `source` heeft uitsluitend navigatiebetekenis en nooit autorisatiebetekenis.

### Bronbehoud en fallback

- Een geldige `source` in de actuele URL is leidend.
- Alle interne adminlinks, GET-formulieren, fetcher-URLs, actions en redirects behouden de geldige bron.
- Functionele queryparameters worden met `source` samengevoegd en overschrijven die niet.
- De admin-app bewaart de laatst ontvangen geldige bron in een cookie met minimaal `Path=/product-management-admin`, `Secure` en `SameSite=Lax` in productie.
- De queryparameter heeft prioriteit boven de cookie, zodat twee tabbladen met verschillende expliciete bronnen hun eigen terugkeertab behouden.
- De cookie is alleen fallback voor een vervolgverzoek zonder geldige querybron.
- Zonder geldige querybron of geldige fallback toont de admin-bottom-tabbar geen terugkeertab.
- Een ongeldige bron wordt genegeerd en nooit omgezet naar een URL.

## Huidige situatie

- Calorie Tracker en Inventory zijn React Router-frameworkapps met SSR.
- Beide apps mounten dezelfde adminrouteboom onder `/admin`.
- Beide apps hebben dunne routewrappers die exports uit `@product-repos/admin-dashboard` gebruiken.
- Beide apps hebben een eigen admin-guard en tonen admin binnen de eigen bottom-tabshell.
- `packages/admin-dashboard` bevat nog hardcoded `/admin/...`-links, formulieractions, fetcher-URLs en redirects.
- Beide `react-router.config.ts`-bestanden gebruiken nog de standaard-`basename` `/`.
- De loginflow gebruikt nog absolute rootnavigatie, waaronder `redirect("/")`, `redirect("/login")` en standaard `window.location.assign("/")`.
- Alleen Inventory heeft een Dockerfile; die verwijst nog naar het niet-bestaande `apps/admin_panel` en packagefilter `admin_panel`.
- Backendconfiguratie bevat al ondersteuning voor meerdere vertrouwde origins en een gedeeld cookiedomein.

## Implementatiestappen

### Stap 1 — Centrale publieke paden en bronparser toevoegen

Maak per host een kleine pathmodule en maak in de admin-app of een passend gedeeld navigatiemodule:

- de `AdminSource`-union;
- een parser die alleen `inventory` en `calorie-tracker` accepteert;
- een uitputtende mapping van bron naar label en publiek basispad;
- een helper die `source` samenvoegt met bestaande zoekparameters;
- een helper voor basename-veilige serverredirects.

Randvoorwaarden:

- parse onbekende invoer aan de URL-boundary;
- verspreid geen ongevalideerde strings als `AdminSource`;
- accepteer geen protocol, host of vrij pad als terugkeerdoel;
- iedere nieuwe functie krijgt een Engelstalige JSDoc-docstring;
- functienamen zijn Engels.

### Stap 2 — Zelfstandige Product Management Admin-app maken

Maak `apps/product-management-admin` als React Router-frameworkapp met:

```text
app/root.tsx
app/routes.ts
app/auth-client.ts
app/auth.server.ts
app/layout.tsx
app/api/admin-dashboard-api.server.ts
app/features/admin/...
app/routes/login.tsx
app/routes/product-catalog/...
app/routes/product-detail/...
app/routes/product-package/...
app/routes/locations.tsx
react-router.config.ts
vite.config.ts
package.json
tsconfig.json
```

Verplaats de bestaande packagecode naar de zelfstandige app:

- `packages/admin-dashboard/src/api` naar een app-owned server-adaptermap;
- `packages/admin-dashboard/src/features` naar app-owned adminfeatures;
- `packages/admin-dashboard/src/routes/admin` naar de echte route- en routemodule-structuur van de admin-app;
- CSS Modules naast de bijbehorende app-owned routes en componenten.

De nieuwe routebestanden zijn directe implementaties en geen wrappers of re-exports van `@product-repos/admin-dashboard`. Behoud tijdens de verplaatsing de bestaande scheiding tussen server-only adapters, routehandlers en presentatiecode. Verwijder het package pas nadat geen workspaceconsumer meer naar de package-export verwijst.

Configureer:

```ts
basename: "/product-management-admin"
```

De routeboom bevat geen extra `/admin`-segment. De interne root `/` redirect naar `/product-catalogus` met behoud van `source`. De adminlayout voert één centrale administratorguard uit voordat childloaders inhoudelijke data ophalen.

### Stap 3 — Dynamische admin-bottom-tabbar bouwen

Laat de bovenste adminlayoutloader:

1. `source` uit `request.url` lezen;
2. de waarde via de gesloten parser valideren;
3. bij een geldige waarde de fallbackcookie bijwerken;
4. anders een geldige fallbackcookie lezen;
5. de resolved bron of `null` aan de layout leveren.

De layout rendert:

- bij `inventory`: `Inventarisatie` naar `/inventory` en een actieve `Admin dashboard`-tab;
- bij `calorie-tracker`: `Calorie Tracker` naar `/calorie-tracker` en een actieve `Admin dashboard`-tab;
- bij `null`: alleen de actieve `Admin dashboard`-tab.

De terugkeerlink en cross-app adminlinks zijn gewone anchors. Interne adminlinks blijven React Router-links.

### Stap 4 — Verplaatste adminroutes losmaken van `/admin`

Refactor in `apps/product-management-admin` de vaste routepaden uit de voormalige packagecode van `/admin/...` naar app-interne adminpaden zoals `/product-catalogus` en `/locations`.

Controleer minimaal:

- adminnavbarlinks;
- categorie-breadcrumbs en categorieboomlinks;
- productkaarten en zoekresultaten;
- productdetail- en verpakkinglinks;
- not-found-teruglinks;
- het cataloguszoekformulier;
- merkzoek-fetcha calls;
- create- en mutationredirects;
- back-URL/contexthelpers;
- categorie-bewerkmodalroutes.

Vervang verspreide stringinterpolatie door een kleine routehelper waar die zowel routepad als bestaande querycontext moet behouden.

### Stap 5 — `source` door alle adminflows behouden

Voor navigatielinks:

- lees de actuele geldige bron uit routecontext;
- voeg die via één helper aan de doel-URL toe;
- behoud daarnaast bestaande cataloguscontext zoals `categoryId` of `brandId`.

Voor GET-formulieren:

- neem `source` op als hidden input wanneer een geldige bron bestaat;
- voorkom dat browser-GET-submit de bron verwijdert.

Voor actions en redirects:

- lees `source` uit de request-URL;
- valideer opnieuw aan de serverboundary;
- voeg alleen een geldige waarde toe aan de redirect-URL.

Voor de loginflow:

- stuur een niet-ingelogde gebruiker naar de admin-login met behoud van `source` en een gevalideerd app-intern terugkeerpad;
- stuur na succesvolle login terug naar de bedoelde interne adminroute;
- gebruik geen vrij extern `returnTo`-doel.

### Stap 6 — Calorie Tracker zelfstandig maken

Configureer:

```ts
basename: "/calorie-tracker"
```

Pas vervolgens aan:

- verwijder de adminrouteboom uit `apps/calorie_tracker/app/routes.ts`;
- verwijder adminroutewrappers en de adminlayout;
- verwijder `@product-repos/admin-dashboard` uit het appmanifest en Vite-config;
- verwijder de Calorie Tracker-routewrappers die exports uit het package doorgeven;
- laat de bottom-bar voor beheerders met een gewone anchor verwijzen naar `/product-management-admin/product-catalogus?source=calorie-tracker`;
- maak loaderredirects, loginredirects en browsernavigatie basename-veilig;
- behoud de bestaande rolcontrole voor zichtbaarheid van de adminlink.

### Stap 7 — Inventory zelfstandig maken en hernoemen

Hernoem `apps/inventory-admin_panel` naar `apps/inventory` en behoud package naam `inventory`.

Configureer:

```ts
basename: "/inventory"
```

Pas vervolgens aan:

- verwijder de adminrouteboom en alle dunne adminroutewrappers;
- verwijder de app-specifieke adminlayout;
- verwijder `@product-repos/admin-dashboard` uit het appmanifest en Vite-config;
- verwijder de Inventory-routewrappers die exports uit het package doorgeven;
- laat de bottom-bar voor beheerders met een gewone anchor verwijzen naar `/product-management-admin/product-catalogus?source=inventory`;
- maak loaderredirects, loginredirects en browsernavigatie basename-veilig;
- werk root scripts, workspacefilters en padverwijzingen bij naar `apps/inventory`.

### Stap 8 — Gedeelde authenticatie voor drie frontends borgen

Behoud één Better Auth-backend en één sessie over de drie apps. Voor een backend op `api.jefvanzanten.dev` is de productieconfiguratie minimaal:

```text
BETTER_AUTH_URL=https://api.jefvanzanten.dev
AUTH_COOKIE_DOMAIN=.jefvanzanten.dev
AUTH_TRUSTED_ORIGINS=https://apps.jefvanzanten.dev
CORS_ORIGIN=https://apps.jefvanzanten.dev
```

Browserconfiguratie per frontend:

```text
VITE_API_URL=https://api.jefvanzanten.dev
```

SSR-processen gebruiken waar beschikbaar de interne backendservice:

```text
API_URL=http://backend:3000
```

Controleer dat de gedeelde sessiecookie op verzoeken naar `apps.jefvanzanten.dev` aankomt, zodat iedere frontendloader de cookie kan doorgeven aan `get-session`. `source` verandert niets aan de sessie- of rolcontrole.

### Stap 9 — Afzonderlijke build- en deploymentingangen maken

Maak drie Dockerfiles met de repository-root als buildcontext:

```text
apps/calorie_tracker/Dockerfile
apps/inventory/Dockerfile
apps/product-management-admin/Dockerfile
```

Iedere Dockerfile:

- gebruikt de vastgelegde pnpmversie via `corepack pnpm`;
- installeert tijdens de expliciete imagebuild alleen de betreffende workspacefilter en transitieve workspace-afhankelijkheden;
- bouwt alleen de eigen React Router-app;
- bevat de benodigde runtimebuild en productieafhankelijkheden;
- start alleen de eigen server;
- gebruikt geen stale `apps/admin_panel`-paden.

Voeg gerichte rootscripts toe voor admin build/dev/start/typecheck. De deploymentpipeline krijgt per frontend:

- een eigen imagebuild;
- eigen environmentconfiguratie;
- een eigen deploytrigger;
- pathfilters voor app- en gedeelde packagewijzigingen.

Een wijziging aan een gedeeld package triggert alleen de consumerende apps. Adminfeaturecode staat na de migratie volledig onder `apps/product-management-admin` en triggert daardoor uitsluitend de Product Management Admin-build. Er blijft geen afzonderlijk adminpackage over.

### Stap 10 — Reverse proxy configureren

Routeer met behoud van het publieke prefix:

```text
/calorie-tracker/*             -> calorie-tracker-service
/inventory/*                  -> inventory-service
/product-management-admin/*   -> product-management-admin-service
```

Het prefix mag niet zonder overeenkomstige serverconfiguratie worden gestript, omdat React Router-links, route discovery, SSR-requests en assets de geconfigureerde `basename` gebruiken.

Controleer directe deep links, waaronder:

```text
/calorie-tracker/logs
/inventory
/product-management-admin/product-catalogus
/product-management-admin/product-catalogus/<productId>
```

### Stap 11 — Gefaseerd uitrollen

1. Verplaats de adminimplementatie naar Product Management Admin, verwijder in dezelfde codewijziging de packageconsumers uit Calorie Tracker en Inventory en verwijder daarna `packages/admin-dashboard` met de bijbehorende manifest- en lockfileverwijzingen.
2. Verifieer dat alle drie de nieuwe frontendbuilds zonder adminpackage slagen.
3. Deploy Product Management Admin; bestaande reeds gedeployde clientimages blijven tijdens deze stap hun ingebouwde admincode bevatten.
4. Controleer adminlogin, rolguard, productcatalogus en beide bronvarianten.
5. Deploy Calorie Tracker met de externe adminlink en zonder ingebedde adminroutes.
6. Deploy Inventory met de externe adminlink en zonder ingebedde adminroutes.
7. Voeg waar nodig tijdelijke redirects toe vanaf oude publieke admin-URL's naar de nieuwe admin-app, met een vaste bron per oude host.
8. Verwijder tijdelijke redirects pas wanneer oude bookmarks niet meer ondersteund hoeven worden.

## Tests

Voeg gerichte tests toe zonder de volledige testsuite handmatig te onderbreken.

### Unit- en componenttests

- geldige bronwaarden worden geaccepteerd;
- onbekende, lege en URL-achtige bronwaarden worden geweigerd;
- querymerge behoudt `source` naast `q`, `categoryId`, `brandId` en `status`;
- een actuele querybron wint van de fallbackcookie;
- adminlayout toont de Inventory-terugkeertab;
- adminlayout toont de Calorie Tracker-terugkeertab;
- adminlayout toont zonder geldige bron geen verzonnen terugkeertab;
- admin blijft actief terwijl de terugkeertab inactief is.

### Routetests

- admin-rootredirect behoudt `source`;
- loginredirect en succesvolle login behouden bron en veilig intern terugkeerpad;
- cataloguszoeken behoudt `source` na een GET-submit;
- product aanmaken, categorie bewerken en verpakking toevoegen behouden `source` na redirects;
- Calorie Tracker- en Inventory-routemanifesten bevatten geen inhoudelijke adminroutes;
- niet-beheerders zien geen adminlink en krijgen geen admininhoud.

### Gerichte verificatiecommando's

Voer alleen de relevante checks uit nadat de betreffende slice is gewijzigd:

```text
corepack pnpm --filter product-management-admin typecheck
corepack pnpm --filter product-management-admin build
corepack pnpm --filter calorie_tracker typecheck
corepack pnpm --filter calorie_tracker build
corepack pnpm --filter inventory typecheck
corepack pnpm --filter inventory build
```

Voer daarnaast de gerichte specsuite uit na documentatiewijzigingen:

```text
corepack pnpm run test:specs
```

Stop wanneer pnpm een modules-purge- of recreateprompt toont en volg dan `docs/dependency-management.md`; een verificatiecommando mag `node_modules` niet herstellen.

## Risico's en mitigaties

| Risico | Mitigatie |
| --- | --- |
| `source` verdwijnt bij zoeken of mutationredirects. | Centraliseer querymerge en dek links, GET-formulieren en serverredirects afzonderlijk af. |
| Een vrije terugkeer-URL veroorzaakt een open redirect. | Gebruik uitsluitend de gesloten `AdminSource`-mapping. |
| Twee tabbladen overschrijven de fallbackbron. | Laat een expliciete querybron altijd winnen en behoud die in iedere admin-URL. |
| Absolute redirects verlaten het app-basispad. | Gebruik per app één basename-veilige redirecthelper en gerichte routetests. |
| Assets of route discovery werken niet achter een subpath. | Behoud proxyprefix, configureer `basename` tijdens de build en test directe deep links. |
| Gedeelde sessie is niet zichtbaar voor SSR-frontends. | Configureer het productiedomein van de authcookie en verifieer cookie-forwarding in iedere frontendloader. |
| Tijdens de verhuizing bestaan package- en appcode tijdelijk naast elkaar of lopen uiteen. | Verplaats bestanden in één wijziging, laat de admin-app direct de verplaatste implementaties gebruiken en verwijder wrappers en package zodra alle consumers zijn omgezet. |
| Oude adminbookmarks breken direct. | Rol eerst de admin-app uit en gebruik tijdelijke hostspecifieke redirects. |

## Buiten scope

- Nieuwe productcatalogus-, Inventory- of Calorie Tracker-features.
- Een redesign van de inhoudelijke adminpagina's.
- Een algemeen applicatieportaal voor directe adminbezoeken zonder bron.
- Een vrije callback- of return-URL.
- Het samenvoegen van backend en een frontend tot één deployment.

## Acceptatiecriteria

- De drie publieke basispaden worden door drie afzonderlijke frontendservices bediend.
- Iedere frontend kan afzonderlijk worden gebouwd, gestart en gedeployed.
- Product Management Admin bevat rechtstreeks alle inhoudelijke adminroutes, loaders, actions, server-adapters en featurecomponenten.
- `packages/admin-dashboard` en `@product-repos/admin-dashboard` bestaan niet meer.
- Calorie Tracker en Inventory bevatten geen inhoudelijke adminroutes of adminpackage-afhankelijkheid.
- Beide clientapps tonen de adminlink uitsluitend aan beheerders en geven de juiste gesloten `source` mee.
- De admin-bottom-tabbar toont bij `source=inventory` een terugkeerlink naar `/inventory`.
- De admin-bottom-tabbar toont bij `source=calorie-tracker` een terugkeerlink naar `/calorie-tracker`.
- Een geldige bron blijft behouden bij interne navigatie, zoeken, mutations, redirects en login.
- Een ongeldige of onbekende bron kan geen willekeurige terugkeerlink of autorisatie opleveren.
- Een direct geopende admin-app zonder geldige actuele of bekende bron verzint geen terugkeerbestemming.
- Gedeelde authenticatie en administratorautorisatie werken in alle drie de deployments.
- Directe deep links en assets werken onder ieder geconfigureerd basispad.
- De stale Inventory-Dockerfile is vervangen door drie werkende, workspace-aware frontendbuilds.
