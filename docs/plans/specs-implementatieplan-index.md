# Plan-index — specs onder `docs/specs/`

## Scope

Deze index koppelt elk specbestand onder `docs/specs/` aan een uitvoerbaar plan. Feature-specs krijgen een implementatie- of wijzigingsplan. Spec-indexbestanden krijgen een roadmap-/sequencingplan. Lege of ondergespecificeerde specs krijgen eerst een specificatieplan, omdat de specs, requirements, ERD en endpointdocs de bron van waarheid zijn.

## Coverage

| Spec | Plan | Type | Inschatting huidige status |
| --- | --- | --- | --- |
| `docs/specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md` | `docs/plans/admin-productcatalogus-roadmap-plan.md` | roadmap | index, geen directe feature |
| `docs/specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md` | `docs/plans/admin-product-aanmaken-wijzigingsplan.md` | wijzigingsplan | grotendeels aanwezig, nog niet spec-compleet |
| `docs/specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md` | `docs/plans/admin-product-zoeken-plan.md` | wijzigings-/implementatieplan | cataloguszoekveld en merkzoeken deels aanwezig |
| `docs/specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md` | `docs/plans/admin-productcatalogus-browsen-plan.md` | implementatieplan | nieuw op backend, frontend heeft alleen shell |
| `docs/specs/admin-dashboard/product-catalogus/product-detail-specificatie.md` | `docs/plans/admin-product-detail-verpakkingen-plan.md` | implementatieplan | nieuw |
| `docs/specs/inventory-client/inventory-client-specificatie.md` | `docs/plans/inventory-client-roadmap-plan.md` | roadmap | index, huidige `/` is placeholderachtig |
| `docs/specs/inventory-client/voorraad-inzien-specificatie.md` | `docs/plans/inventory-voorraad-inzien-plan.md` | implementatieplan | nieuw; placeholder vervangen |
| `docs/specs/inventory-client/voorraad-toevoegen-bottom-sheet-specificatie.md` | `docs/plans/inventory-voorraad-toevoegen-bottomsheet-plan.md` | implementatieplan | nieuw |
| `docs/specs/calory-tracker/dashboard/macro-calorien-grafiek.md` | `docs/plans/calory-tracker-macro-calorien-grafiek-plan.md` | specificatie + implementatieplan | ondergespecificeerd; nutrition-ERD niet actueel |
| `docs/specs/calory-tracker/logs/log-overzicht.md` | `docs/plans/calory-tracker-log-overzicht-plan.md` | specificatieplan | leeg; bestaande UI is oude/ongedefinieerde slice |
| `docs/specs/calory-tracker/logs/log-toevoegen.md` | `docs/plans/calory-tracker-log-toevoegen-plan.md` | specificatieplan | leeg; bestaande modal is oude/ongedefinieerde slice |
| `docs/specs/workspace/doorlopende-vitest-specsuite-specificatie.md` | `docs/plans/doorlopende-vitest-specsuite-plan.md` | werkwijze | geimplementeerd |

## Aanbevolen volgorde

1. Rond de bestaande Product-ERD/schema-alignment af volgens `docs/plans/product-erd-backend-schema-plan.md`.
2. Implementeer minimale productdetail-read endpoints en route, zodat `Product aanmaken` naar detail kan redirecten.
3. Maak `Product aanmaken` spec-compleet: context-prefill en redirect in plaats van aangemaakt-JSON tonen.
4. Bouw cataloguszoeken en browsen samen, omdat ze dezelfde productrij-, categoriepad- en verpakkingssamenvatting-contracten delen.
5. Bouw inventory backend/contracts eerst; vervang daarna de placeholder op `/` door voorraad inzien en bottomsheet toevoegen.
6. Werk calorie-tracker specs uit vóór implementatie. De huidige calorie-ERD is expliciet niet actueel.

## Doorlopende specsuite

Gebruik tijdens spec- en planwerk de Vitest-watchsuite:

```text
corepack pnpm run test:specs:watch
```

Deze suite bewaakt dat specs onder `docs/specs/` gekoppeld blijven aan plannen en dat featureplannen test- of verificatieafspraken bevatten. Voor een eenmalige run gebruik je:

```text
corepack pnpm run test:specs
```

## Verificatie-afspraak

Gebruik workspace-commando's alleen via `corepack pnpm`, bijvoorbeeld:

```text
corepack pnpm --filter @product-repos/backend test
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter inventory test
corepack pnpm --filter inventory typecheck
corepack pnpm --filter calory_tracker test
corepack pnpm --filter calory_tracker build
```

Stop wanneer `pnpm` een node_modules purge/recreate prompt toont; volg dan `docs/dependency-management.md`.
