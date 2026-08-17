# Plan-index — specs onder `docs/specs/`

## Scope

Deze index koppelt de functionele specbestanden onder `docs/specs/` aan een uitvoerbaar plan. Feature-specs krijgen een implementatie- of wijzigingsplan. Spec-indexbestanden krijgen een roadmap-/sequencingplan. Gekoppelde UI-specificaties vallen onder hetzelfde plan als hun functionele feature en staan in een afzonderlijke UI-coveragetabel. Lege of ondergespecificeerde specs krijgen eerst een specificatieplan, omdat de specs, UI-specificaties, requirements, ERD en endpointdocs samen de bron van waarheid zijn.

## Leidende v2-planreeks

De catalogusrevamp, fysieke voorraad en Recepten-app overschrijven de structurele aannames van meerdere historische plannen. Gebruik voor nieuw werk deze volgorde:

1. [productmodel-v2-masterplan.md](./productmodel-v2-masterplan.md)
2. [productmodel-v2-backend-migratieplan.md](./productmodel-v2-backend-migratieplan.md)
3. [productmodel-v2-contracts-shared-plan.md](./productmodel-v2-contracts-shared-plan.md)
4. [productmodel-v2-admin-dashboard-plan.md](./productmodel-v2-admin-dashboard-plan.md)
5. [productmodel-v2-calorie-tracker-plan.md](./productmodel-v2-calorie-tracker-plan.md)
6. [productmodel-v2-inventory-plan.md](./productmodel-v2-inventory-plan.md)
7. [recepten-app-implementatieplan.md](./recepten-app-implementatieplan.md)

Historische plannen blijven bruikbaar als implementatieverslag, maar hun root/package- en Calorie-Tracker-gerechtbeheerkeuzes zijn niet langer leidend.

## Coverage

| Spec | Plan | Type | Inschatting huidige status |
| --- | --- | --- | --- |
| `docs/specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md` | `docs/plans/productmodel-v2-masterplan.md` | roadmap | v2-index; oude featureplannen historisch |
| `docs/specs/admin-dashboard/product-catalogus/productmodel-v2-specificatie.md` | `docs/plans/productmodel-v2-admin-dashboard-plan.md` | migratie-/implementatieplan | doelmodel |
| `docs/specs/recipe/recipe-app-spec.md` | `docs/plans/recepten-app-implementatieplan.md` | implementatieplan | nieuwe app |
| `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md` | `docs/plans/admin-product-aanmaken-wijzigingsplan.md` | wijzigingsplan | grotendeels aanwezig, nog niet spec-compleet |
| `docs/specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md` | `docs/plans/admin-product-zoeken-plan.md` | wijzigings-/implementatieplan | cataloguszoekveld en merkzoeken deels aanwezig |
| `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md` | `docs/plans/admin-productcatalogus-browsen-plan.md` | implementatieplan | nieuw op backend, frontend heeft alleen shell |
| `docs/specs/admin-dashboard/product-catalogus/product-detail-specificatie.md` | `docs/plans/admin-product-detail-verpakkingen-plan.md` | implementatieplan | nieuw |
| `docs/specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-specificatie.md` | `docs/plans/admin-opbergplaatsen-beheren-plan.md` | uitgevoerd implementatieplan | locatiebeheer en Inventory-archiefprojectie zijn geïmplementeerd |
| `docs/specs/inventory-client/inventory-client-specificatie.md` | `docs/plans/productmodel-v2-inventory-plan.md` | roadmap | fysiek-item-doelmodel |
| `docs/specs/inventory-client/voorraad-inzien-specificatie.md` | `docs/plans/productmodel-v2-inventory-plan.md` | implementatieplan | fysieke items, groepering en filters |
| `docs/specs/inventory-client/voorraad-toevoegen-bottom-sheet-specificatie.md` | `docs/plans/productmodel-v2-inventory-plan.md` | migratieplan | aantal invoeren, N fysieke items |
| `docs/specs/shared/bottom-tabbar-specificatie.md` | `docs/plans/zelfstandige-app-deployments-en-admin-herkomst-plan.md` | wijzigingsplan | drie zelfstandige frontenddeployments en dynamische adminterugkeercontext gepland |
| `docs/specs/calorie-tracker/calorie-tracker-specificatie.md` | `docs/plans/productmodel-v2-calorie-tracker-plan.md` | migratie-/implementatieplan | concrete producten en extern receptbeheer |
| `docs/specs/calorie-tracker/dashboard/calorien-statestieken.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` | implementatieplan | nieuw; geselecteerde dag, statistieken en doelenmodal ontbreken nog |
| `docs/specs/calorie-tracker/logs/log-overzicht.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` | implementatieplan | nieuw; bestaande UI is niet aan de actieve router gekoppeld |
| `docs/specs/calorie-tracker/logs/log-toevoegen.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` | implementatieplan | nieuw; bestaande legacy-modal gebruikt verouderde contracts |
| `docs/specs/calorie-tracker/logs/log-detail-bewerken.md` | `docs/plans/calory-tracker-figma-implementatieplan.md` | implementatieplan | nieuw |
| `docs/specs/calorie-tracker/gerechten/gerecht-aanmaken.md` | `docs/plans/productmodel-v2-calorie-tracker-plan.md` | verwijderplan | historische feature wordt geëxtraheerd |

## UI-specificatiecoverage

| UI-specificatie | Functionele ingang | Plan |
| --- | --- | --- |
| `docs/specs/admin-dashboard/admin-dashboard-ui-specificatie.md` | `docs/admin-dashboard/admin-dashboard-requirements.md` | `docs/plans/zelfstandige-app-deployments-en-admin-herkomst-plan.md` |
| `docs/specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-ui-specificatie.md` | `docs/specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-specificatie.md` | `docs/plans/admin-opbergplaatsen-beheren-plan.md` |
| `docs/specs/admin-dashboard/product-catalogus/productmodel-v2-ui-specificatie.md` | `docs/specs/admin-dashboard/product-catalogus/productmodel-v2-specificatie.md` | `docs/plans/productmodel-v2-admin-dashboard-plan.md` |
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
| `docs/specs/inventory-client/voorraad-inzien-ui-specificatie.md` | `docs/specs/inventory-client/voorraad-inzien-specificatie.md` | `docs/plans/productmodel-v2-inventory-plan.md` |
| `docs/specs/inventory-client/voorraad-aanpassen-ui-specificatie.md` | `docs/specs/inventory-client/voorraad-aanpassen-specificatie.md` | `docs/plans/productmodel-v2-inventory-plan.md` |
| `docs/specs/inventory-client/voorraad-toevoegen-bottom-sheet-ui-specificatie.md` | `docs/specs/inventory-client/voorraad-toevoegen-bottom-sheet-specificatie.md` | `docs/plans/productmodel-v2-inventory-plan.md` |
| `docs/specs/recipe/recipe-app-ui-specificatie.md` | `docs/specs/recipe/recipe-app-spec.md` | `docs/plans/recepten-app-implementatieplan.md` |
| `docs/specs/shared/bottom-tabbar-ui-specificatie.md` | `docs/specs/shared/bottom-tabbar-specificatie.md` | `docs/plans/zelfstandige-app-deployments-en-admin-herkomst-plan.md` |

## Routeconventie voor adminplannen

Adminfeatureplannen gebruiken app-interne routes zoals `/product-catalogus`. Het publieke basispad `/product-management-admin` wordt bij deployment ervoor geplaatst. Wanneer Product Management Admin met een geldige `source` is geopend, behouden links, formulieren en redirects die broncontext ook wanneer routevoorbeelden haar voor leesbaarheid weglaten.

Het historische `admin-dashboard-shared-package-calory-router-plan.md` behoudt de oude `/admin`-routes om de reeds uitgevoerde package-extractie te beschrijven; `zelfstandige-app-deployments-en-admin-herkomst-plan.md` vervangt die hostarchitectuur.

## Aanbevolen volgorde

1. Rond noodzakelijke deploymentfundamenten af zonder nieuwe package-afhankelijkheden toe te voegen.
2. Voer Slice 0 en 1 van het v2-masterplan uit: audit, additief schema, backfill en mapping.
3. Migreer shared contracts en Product Management Admin naar concrete producten.
4. Migreer Calorie Tracker- en recept-FK's naar product-ID.
5. Migreer Inventory naar fysieke items met resterende inhoud.
6. Bouw de Recepten-app en extraheer gerechtbeheer uit de Calorie Tracker.
7. Verwijder v1 packagecontracts en tabellen pas na een bewezen compatibiliteitsrelease.
8. Lever OCR, automatische lage-voorraadsuggesties en receptaanbevelingen als afzonderlijke post-MVP-slices.

## Verificatie-afspraak

Gebruik workspace-commando's alleen via `corepack pnpm`, bijvoorbeeld:

```text
corepack pnpm --filter @product-repos/backend test
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter product-management-admin typecheck
corepack pnpm --filter inventory test
corepack pnpm --filter inventory typecheck
corepack pnpm --filter calorie_tracker test
corepack pnpm --filter calorie_tracker build
```

Stop wanneer `pnpm` een node_modules purge/recreate prompt toont; volg dan `docs/dependency-management.md`.
