# Plan-index — specs onder `docs/specs/`

## Scope

Deze index koppelt de functionele specbestanden onder `docs/specs/` aan een uitvoerbaar plan. Feature-specs krijgen een implementatie- of wijzigingsplan. Spec-indexbestanden krijgen een roadmap-/sequencingplan. Gekoppelde UI-specificaties vallen onder hetzelfde plan als hun functionele feature en staan in een afzonderlijke UI-coveragetabel. Lege of ondergespecificeerde specs krijgen eerst een specificatieplan, omdat de specs, UI-specificaties, requirements, ERD en endpointdocs samen de bron van waarheid zijn.

## Coverage

| Spec | Plan | Type | Inschatting huidige status |
| --- | --- | --- | --- |
| `docs/specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md` | `docs/plans/admin-productcatalogus-roadmap-plan.md` | roadmap | index, geen directe feature |
| `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md` | `docs/plans/admin-product-aanmaken-wijzigingsplan.md` | wijzigingsplan | grotendeels aanwezig, nog niet spec-compleet |
| `docs/specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md` | `docs/plans/admin-product-zoeken-plan.md` | wijzigings-/implementatieplan | cataloguszoekveld en merkzoeken deels aanwezig |
| `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md` | `docs/plans/admin-productcatalogus-browsen-plan.md` | implementatieplan | nieuw op backend, frontend heeft alleen shell |
| `docs/specs/admin-dashboard/product-catalogus/product-detail-specificatie.md` | `docs/plans/admin-product-detail-verpakkingen-plan.md` | implementatieplan | nieuw |
| `docs/specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-specificatie.md` | `docs/plans/admin-opbergplaatsen-beheren-plan.md` | uitgevoerd implementatieplan | locatiebeheer en Inventory-archiefprojectie zijn geïmplementeerd |
| `docs/specs/inventory-client/inventory-client-specificatie.md` | `docs/plans/inventory-client-roadmap-plan.md` | roadmap | index, huidige `/` is placeholderachtig |
| `docs/specs/inventory-client/voorraad-inzien-specificatie.md` | `docs/plans/inventory-voorraad-inzien-plan.md` | implementatieplan | nieuw; placeholder vervangen |
| `docs/specs/inventory-client/voorraad-toevoegen-bottom-sheet-specificatie.md` | `docs/plans/inventory-voorraad-toevoegen-bottomsheet-plan.md` | implementatieplan | nieuw |
| `docs/specs/shared/bottom-tabbar-specificatie.md` | `docs/plans/zelfstandige-app-deployments-en-admin-herkomst-plan.md` | wijzigingsplan | drie zelfstandige frontenddeployments en dynamische adminterugkeercontext gepland |
| `docs/specs/calorie-tracker/calorie-tracker-specificatie.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` | roadmap-/implementatieplan | specs, ERD en endpoints zijn uitgewerkt; actieve app bevat nog een placeholder en legacycode |
| `docs/specs/calorie-tracker/dashboard/calorien-statestieken.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` | implementatieplan | nieuw; geselecteerde dag, statistieken en doelenmodal ontbreken nog |
| `docs/specs/calorie-tracker/logs/log-overzicht.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` | implementatieplan | nieuw; bestaande UI is niet aan de actieve router gekoppeld |
| `docs/specs/calorie-tracker/logs/log-toevoegen.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` | implementatieplan | nieuw; bestaande legacy-modal gebruikt verouderde contracts |
| `docs/specs/calorie-tracker/logs/log-detail-bewerken.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` | implementatieplan | nieuw |
| `docs/specs/calorie-tracker/gerechten/gerecht-aanmaken.md` | `docs/plans/calorie-tracker-gerechten-implementatieplan.md` | implementatieplan | nieuw; specs, ERD en endpoints zijn uitgewerkt |

## UI-specificatiecoverage

| UI-specificatie | Functionele ingang | Plan |
| --- | --- | --- |
| `docs/specs/admin-dashboard/admin-dashboard-ui-specificatie.md` | `docs/admin-dashboard/admin-dashboard-requirements.md` | `docs/plans/zelfstandige-app-deployments-en-admin-herkomst-plan.md` |
| `docs/specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-ui-specificatie.md` | `docs/specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-specificatie.md` | `docs/plans/admin-opbergplaatsen-beheren-plan.md` |
| `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-ui-specificatie.md` | `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md` | `docs/plans/admin-product-aanmaken-wijzigingsplan.md` |
| `docs/specs/admin-dashboard/product-catalogus/product-zoeken-ui-specificatie.md` | `docs/specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md` | `docs/plans/admin-product-zoeken-plan.md` |
| `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-ui-specificatie.md` | `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md` | `docs/plans/admin-productcatalogus-browsen-plan.md` |
| `docs/specs/admin-dashboard/product-catalogus/product-detail-ui-specificatie.md` | `docs/specs/admin-dashboard/product-catalogus/product-detail-specificatie.md` | `docs/plans/admin-product-detail-verpakkingen-plan.md` |
| `docs/specs/admin-dashboard/product-catalogus/product-archiveren-ui-specificatie.md` | `docs/specs/admin-dashboard/product-catalogus/product-archiveren-specificatie.md` | `docs/plans/admin-product-detail-verpakkingen-plan.md` |
| `docs/specs/calorie-tracker/calorie-tracker-ui-specificatie.md` | `docs/specs/calorie-tracker/calorie-tracker-specificatie.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` |
| `docs/specs/calorie-tracker/dashboard/calorien-statestieken-ui-specificatie.md` | `docs/specs/calorie-tracker/dashboard/calorien-statestieken.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` |
| `docs/specs/calorie-tracker/logs/log-overzicht-ui-specificatie.md` | `docs/specs/calorie-tracker/logs/log-overzicht.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` |
| `docs/specs/calorie-tracker/logs/log-toevoegen-ui-specificatie.md` | `docs/specs/calorie-tracker/logs/log-toevoegen.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` |
| `docs/specs/calorie-tracker/logs/log-detail-bewerken-ui-specificatie.md` | `docs/specs/calorie-tracker/logs/log-detail-bewerken.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` |
| `docs/specs/calorie-tracker/gerechten/gerecht-aanmaken-ui-specificatie.md` | `docs/specs/calorie-tracker/gerechten/gerecht-aanmaken.md` | `docs/plans/calorie-tracker-gerechten-implementatieplan.md` |
| `docs/specs/inventory-client/voorraad-inzien-ui-specificatie.md` | `docs/specs/inventory-client/voorraad-inzien-specificatie.md` | `docs/plans/inventory-voorraad-inzien-plan.md` |
| `docs/specs/inventory-client/voorraad-aanpassen-ui-specificatie.md` | `docs/specs/inventory-client/voorraad-aanpassen-specificatie.md` | `docs/plans/inventory-client-roadmap-plan.md` |
| `docs/specs/inventory-client/voorraad-toevoegen-bottom-sheet-ui-specificatie.md` | `docs/specs/inventory-client/voorraad-toevoegen-bottom-sheet-specificatie.md` | `docs/plans/inventory-voorraad-toevoegen-bottomsheet-plan.md` |
| `docs/specs/shared/bottom-tabbar-ui-specificatie.md` | `docs/specs/shared/bottom-tabbar-specificatie.md` | `docs/plans/zelfstandige-app-deployments-en-admin-herkomst-plan.md` |

## Routeconventie voor adminplannen

Adminfeatureplannen gebruiken app-interne routes zoals `/product-catalogus`. Het publieke basispad `/product-management-admin` wordt bij deployment ervoor geplaatst. Wanneer Product Management Admin met een geldige `source` is geopend, behouden links, formulieren en redirects die broncontext ook wanneer routevoorbeelden haar voor leesbaarheid weglaten.

Het historische `admin-dashboard-shared-package-calory-router-plan.md` behoudt de oude `/admin`-routes om de reeds uitgevoerde package-extractie te beschrijven; `zelfstandige-app-deployments-en-admin-herkomst-plan.md` vervangt die hostarchitectuur.

## Aanbevolen volgorde

1. Splits de drie frontendhosts en borg adminherkomst volgens `docs/plans/zelfstandige-app-deployments-en-admin-herkomst-plan.md`, voordat nieuwe clientfeatures meer routes aan de huidige gecombineerde hosts toevoegen.
2. Rond de bestaande Product-ERD/schema-alignment af volgens `docs/plans/product-erd-backend-schema-plan.md`.
3. Implementeer minimale productdetail-read endpoints en route, zodat `Product aanmaken` naar detail kan redirecten.
4. Maak `Product aanmaken` spec-compleet: context-prefill en redirect in plaats van aangemaakt-JSON tonen.
5. Bouw cataloguszoeken en browsen samen, omdat ze dezelfde productrij-, categoriepad- en verpakkingssamenvatting-contracten delen.
6. Rond na het uitgevoerde gedeelde opbergplaatsenbeheer de Inventory-mutatiecontracts en toevoegflow af.
7. Implementeer de Calorie Tracker in de fasen uit `docs/plans/calory-tracker-figma-implementatieplan.md`; de specs, ERD en endpoints zijn hiervoor inhoudelijk uitgewerkt.
8. Implementeer daarna de gerecht-feature volgens `docs/plans/calorie-tracker-gerechten-implementatieplan.md`, te beginnen met de schema-splitsing naar product- en dish-consumptie.

## Verificatie-afspraak

Gebruik workspace-commando's alleen via `corepack pnpm`, bijvoorbeeld:

```text
corepack pnpm --filter @product-repos/backend test
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter product-management-admin typecheck
corepack pnpm --filter inventory test
corepack pnpm --filter inventory typecheck
corepack pnpm --filter calory_tracker test
corepack pnpm --filter calory_tracker build
```

Stop wanneer `pnpm` een node_modules purge/recreate prompt toont; volg dan `docs/dependency-management.md`.
