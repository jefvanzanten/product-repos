# Plan — admin dashboard als gedeeld package + React Router in calorie tracker

## Bronnen

- `docs/admin-dashboard/admin-dashboard-requirements.md`
- `docs/specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md`
- `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md`
- `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md`
- `docs/specs/calory-tracker/dashboard/macro-calorien-grafiek.md`
- `docs/specs/calory-tracker/logs/log-overzicht.md`
- bestaande code in `apps/inventory-admin_panel`, `apps/calory_tracker` en `packages/contracts`

## Doel

De admin dashboard-code uit `apps/inventory-admin_panel` halen en onder `packages/` plaatsen, zodat zowel Inventory als Calorie Tracker dezelfde React Router-adminroutes en admincomponenten gebruiken zonder duplicatie van productcatalogus-, productdetail-, verpakking-, merkenzoek- of opbergplaatsen-code.

Daarnaast wordt `apps/calory_tracker` omgezet naar een React Router-frameworkapp, zodat de admin dashboardroutes daar op dezelfde manier kunnen werken als in Inventory.

## Uitgangspunten

- De admin blijft in beide apps bereikbaar onder dezelfde URL-prefix: `/admin`.
- De host-apps bevatten route-stubs/wiring en hun eigen app-specifieke layouts; inhoudelijke adminpages en adminlogica staan in het package.
- De gedeelde adminpages renderen binnen de `Outlet` van de host-app-layout.
- De bestaande backend blijft de bron voor admin-data via `API_URL` of fallback `http://localhost:3000`.
- De bestaande contracts in `@product-repos/contracts` blijven gedeeld.
- De Calorie Tracker-dashboardroute blijft `/`.
- Er wordt geen admin-pagecode gekopieerd naar de Calorie Tracker.

## Gewenste eindstructuur

```text
packages/admin-dashboard/
  package.json
  tsconfig.json
  src/
    api/admin-dashboard-api.server.ts
    product-catalog/...
    storage-management/...
    react-router/
      brand-lookup.ts
      locations.tsx
      new-product.tsx
      product-catalog.tsx
      edit-category.tsx
      product-detail.tsx
      package-form.tsx
      package-detail.tsx

apps/inventory-admin_panel/app/
  routes.ts
  routes/admin-layout.tsx # app-specifieke admin shell rond <Outlet />
  routes/admin/...        # alleen dunne re-export/wrapper routebestanden

apps/calory_tracker/app/
  root.tsx
  routes.ts
  routes/dashboard.tsx
  routes/admin-layout.tsx # app-specifieke admin shell rond <Outlet />
  routes/admin/...        # alleen dunne re-export/wrapper routebestanden
```

## Implementatieplan

### Stap 1 — Nieuw workspace package maken

Maak `packages/admin-dashboard` met package naam `@product-repos/admin-dashboard`.

Package-afspraken:

- `react`, `react-dom` en `react-router` als peer dependencies;
- `@product-repos/contracts` als workspace dependency;
- exports voor React Router-routeimplementaties, adminpages en page-owned admincomponenten;
- CSS modules blijven naast de page/componenten in het package;
- app-shells, navbars en layoutframes blijven host-app-specifiek, tenzij later expliciet anders besloten wordt;
- exported TypeScript-symbolen krijgen JSDoc/docstrings volgens de codebase-regels.

### Stap 2 — Admin-code verplaatsen naar het package

Verplaats de inhoudelijke adminpage-code uit Inventory naar `packages/admin-dashboard/src`:

- `features/admin/product-catalog` → `src/product-catalog`;
- `features/admin/storage-management` → `src/storage-management`;
- route-implementaties uit `app/routes/admin/**` → `src/react-router/**`.

Niet verplaatsen in deze stap:

- app-specifieke layoutframes;
- app-specifieke navbars;
- route-layouts die alleen bepalen waar de gedeelde adminpage in de host-`Outlet` verschijnt.

Belangrijke refactor tijdens verplaatsen:

- verwijder imports naar app-specifieke `./+types/...` uit packagebestanden;
- gebruik React Router framework types of package-eigen `LoaderData`/`ActionResult` types;
- host-routebestanden mogen app-specifieke typegen houden, maar delegeren naar packagefuncties;
- package-pages mogen ervan uitgaan dat ze onder `/admin` gemount worden, of gebruiken een kleine route-helper als er later een afwijkende base path nodig is.

### Stap 3 — API-client als server-adapter isoleren

Zet `productCatalogService.server.ts` om naar een package-owned server adapter, bijvoorbeeld:

```text
packages/admin-dashboard/src/api/admin-dashboard-api.server.ts
```

Regels:

- `API_URL` wordt aan de servergrens gelezen/geparseerd, niet verspreid door UI-componenten;
- bekende backendfouten blijven vertaald naar formulierfouten;
- raw `fetch`/response parsing blijft in de adapter;
- UI- en routecomponenten gebruiken alleen de package-API-functies en contracts.

### Stap 4 — Inventory laat gedeelde adminpages in een host-layout renderen

Pas `apps/inventory-admin_panel/app/routes.ts` en de admin routebestanden zo aan dat Inventory zelf de app-specifieke layout kiest en de gedeelde adminpages daarbinnen via een `Outlet` rendert.

Belangrijk: deze stap betekent niet dat de admin layout/shell naar het package verhuist. De splitsing is:

- host-app: route tree, app-shell, admin-layout, navbar/frame en plaatsing van de `Outlet`;
- package: admin route handlers, loaders/actions, pages en page-owned componenten.

Gewenst patroon:

```text
apps/inventory-admin_panel/app/routes/admin-layout.tsx
  InventoryAdminShell
    <Outlet />
      gedeelde adminpage uit @product-repos/admin-dashboard
```

De bestaande Inventory-admin routebestanden worden dunne wrappers/re-exports naar `@product-repos/admin-dashboard/react-router/...`. Als Inventory de admin buiten de bottom-tab shell wil tonen, is dat een host-routekeuze; het package schrijft die layoutkeuze niet voor.

### Stap 5 — Calorie Tracker migreren naar React Router framework

Zet `apps/calory_tracker` om van Vite SPA naar React Router-frameworkapp:

- voeg `react-router.config.ts` toe;
- vervang scripts door React Router-scripts:
  - `build`: `react-router build`;
  - `dev`: `react-router dev`;
  - `start`: `react-router-serve ./build/server/index.js`;
  - `typecheck`: `react-router typegen && tsc`;
- voeg React Router dependencies toe zoals bij Inventory;
- maak `app/root.tsx` met HTML-layout, stylesheet-links, error boundary en `QueryClientProvider`;
- maak `app/routes.ts`;
- maak `app/routes/dashboard.tsx` die de bestaande `src/pages/Dashboard.tsx` rendert;
- maak een Calorie Tracker-specifieke admin-layoutroute die een eigen shell/frame rond `<Outlet />` rendert;
- behoud de bestaande calorie tracker featurecode eerst onder `src/` om de migratie klein te houden.

### Stap 6 — Admin routes in Calorie Tracker toevoegen

Voeg in `apps/calory_tracker/app/routes.ts` dezelfde adminrouteboom toe als Inventory. De Calorie Tracker levert zelf de admin-layoutroute; de child-routebestanden delegeren naar het gedeelde package.

Gewenste routes:

```text
/admin
/admin/brand-lookup
/admin/product-catalogus
/admin/product-catalogus/categorieen/:categoryId/bewerken
/admin/product-catalogus/nieuw
/admin/product-catalogus/:productId
/admin/product-catalogus/:productId/verpakkingen/nieuw
/admin/product-catalogus/:productId/verpakkingen/:packageId
/admin/locations
```

### Stap 7 — Styling en bundling controleren

Controleer specifiek:

- CSS modules vanuit `packages/admin-dashboard` worden door beide apps gebundeld;
- server-only admin API-code komt niet in de client bundle;
- als Vite/RR het workspace package extern wil houden, voeg dan app-specifiek `ssr.noExternal: ["@product-repos/admin-dashboard"]` toe;
- de host-specifieke admin layouts volgen de bestaande admin layout-eisen: desktop gecentreerd, mobiel/top-aligned met ongeveer `1em` rand en compacte navbar-contentafstand.

### Stap 8 — Verificatie

Niet alle tests handmatig draaien. Gericht controleren:

- `corepack pnpm --filter @product-repos/admin-dashboard typecheck`
- `corepack pnpm --filter inventory typecheck`
- `corepack pnpm --filter calory_tracker typecheck`
- waar praktisch: één gerichte build per host-app na de router/package-migratie

Als dependency-manifesten zijn aangepast maar `node_modules` nog niet overeenkomt met `pnpm-lock.yaml`, eerst stoppen en de dependency-situatie melden voordat er install/recovery-commando's worden uitgevoerd.

## Risico's en mitigaties

| Risico | Mitigatie |
| --- | --- |
| React Router typegen is app-specifiek en werkt slecht in een gedeeld package. | Package-routeimplementaties zonder `./+types`; host wrappers gebruiken lokale typegen waar nodig. |
| Server-only API-code lekt naar clientbundles. | API-code in `.server.ts` modules houden en route modules alleen server exports laten gebruiken. |
| CSS modules uit workspace package worden niet gebundeld. | Vite/RR-config controleren en zo nodig `ssr.noExternal` toevoegen. |
| Admin links blijven app-specifiek of hardcoded verspreid. | Zolang beide hosts `/admin` gebruiken mag het package vaste adminlinks gebruiken; bij afwijkende mount paths komt er een centrale `adminBasePath` route-helper. |
| Calorie Tracker SSR botst met browser-only code. | Dashboardhooks blijven effect/client-query based; root provider maakt QueryClient binnen React component lifecycle. |

## Buiten scope voor deze migratie

- Nieuwe admin features.
- Calorie Tracker-specificaties invullen.
- Backend endpoints aanpassen.
- Productcatalogusgedrag wijzigen buiten noodzakelijke package-extractie.
- Visueel redesign van Admin, Inventory of Calorie Tracker.

## Acceptatiecriteria

- `packages/admin-dashboard` bevat de gedeelde admin dashboardimplementatie.
- Inventory gebruikt het gedeelde admin package en bevat geen inhoudelijke admin featurecode meer.
- Calorie Tracker is een React Router-frameworkapp met werkende `/` dashboardroute.
- Calorie Tracker heeft dezelfde admin dashboardroutes onder `/admin` via het gedeelde package.
- Productcatalogus, product aanmaken, productdetail, verpakkingen, merkenzoekroute en opbergplaatsen gebruiken geen gedupliceerde host-appcode.
- Inventory en Calorie Tracker houden elk hun eigen admin/app-layout; de gedeelde adminpages renderen binnen hun host-`Outlet`.
- Gerichte typechecks voor het package en beide host-apps zijn groen of eventuele dependency-lock/node_modules blokkade is expliciet gemeld.

## Spec impact

Geen directe specwijziging nodig voor gedrag: de bestaande admin productcatalogusroutes en layoutregels blijven gelijk. Wel zou er een korte architectuurparagraaf toegevoegd moeten worden aan de relevante admin-dashboard documentatie waarin staat dat de inhoudelijke adminpages als gedeeld package onder `packages/admin-dashboard` leven, door meerdere host-apps onder `/admin` gemount kunnen worden en binnen een app-specifieke layout/`Outlet` renderen.
