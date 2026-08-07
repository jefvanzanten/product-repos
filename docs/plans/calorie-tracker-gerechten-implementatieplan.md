# Implementatieplan — Calorie Tracker gerechten

## Status en scope

Dit plan implementeert de gerecht-feature van de Calorie Tracker: gerechten zoeken, aanmaken en in porties loggen via de bestaande log-flow. Beslissingen staan vast in de grillsessie en zijn uitgeschreven in de specs; dit plan vertaalt ze naar uitvoerstappen.

Binnen scope:

- versiebeheer voor gerechten met gepinde versies in consumptielogs;
- gecombineerd zoeken naar verpakkingen en gerechten in de log-flow;
- gerecht aanmaken vanuit de log-flow (`/logs/new/dish`) met ingrediënten uit de catalogus en optionele afbeelding;
- dish-logs met portiehoeveelheid in logboek, logdetail, bewerken en statistieken;
- dish-afbeeldingen uploaden en serveren;
- Vitest-, backend- en Playwright-dekking.

Buiten scope (bewust uitgesteld naar de toekomstige gerechten-app):

- gerechtbeheer-UX voor bewerken en verwijderen (endpoints worden wel gebouwd);
- ownership/delen van gerechten tussen gebruikers;
- dagsuggesties;
- geneste gerechten.

## Bronnen

- [gerecht-aanmaken.md](../specs/calorie-tracker/gerechten/gerecht-aanmaken.md) en [gerecht-aanmaken-ui-specificatie.md](../specs/calorie-tracker/gerechten/gerecht-aanmaken-ui-specificatie.md)
- [log-toevoegen.md](../specs/calorie-tracker/logs/log-toevoegen.md) en [log-toevoegen-ui-specificatie.md](../specs/calorie-tracker/logs/log-toevoegen-ui-specificatie.md)
- [log-overzicht.md](../specs/calorie-tracker/logs/log-overzicht.md), [log-detail-bewerken.md](../specs/calorie-tracker/logs/log-detail-bewerken.md) en hun UI-specificaties
- [calorie-tracker-domeinregels.md](../domein/calorie-tracker-domeinregels.md) (sectie Gerechten)
- [CALORIE_TRACKER_ERD.md](../backend/ERD/CALORIE_TRACKER_ERD.md)
- [CALORIE_TRACKER_ENDPOINTS.md](../backend/Endpoints/CALORIE_TRACKER_ENDPOINTS.md)

## Statusinschatting

- De bestaande backend (`apps/backend/src/modules/calorie-tracker`) implementeert logs, doelen en package-zoeken tegen één `consumption_log`-tabel waarin de productvelden direct staan. De subtype-splitsing naar `product_consumption`/`dish_consumption` en de `type`-kolom bestaan nog niet.
- De frontend log-flow bestaat; zoeken is package-only.
- Afbeeldingenupload bestaat alleen voor packages in Product Management Admin; het patroon (multipart, max 5 MB, immutable serving) wordt hergebruikt.

## Fase 1 — Contracten en datamodel

1. Breid `packages/contracts/src/calorie-tracker.ts` uit met de nieuwe shapes: `UnifiedSearchResult`, `DishSearchResult`, `Dish`, `DishIngredient`, `CreateDish`, `UpdateDish`, `DeleteDishResult`, en de discriminated unions voor `CreateConsumptionLog`/`UpdateConsumptionLog`/`ConsumptionLog` op `type`.
2. Splits het schema in `apps/backend/src/db/schemas/calorie-tracker.schema.ts`:
   - `consumption_log` krijgt `type` (`PRODUCT|DISH`); productvelden verhuizen naar `product_consumption` (PK `consumption_log_id`, FK cascade);
   - nieuw: `dish` (met `image_url` en partiële unieke index op `user_id` + `lower(trim(name))` waar `deleted_at IS NULL`), `dish_version` (immutable), `dish_ingredient` (FK naar versie, input-moduschecks), `dish_consumption` (pint `dish_version_id`);
   - verwijder de verouderde checks en index op `consumption_log` die bij de productvelden hoorden.
3. Schrijf een datamigratie die bestaande logs verplaatst naar `product_consumption` met `type = PRODUCT`; alle bestaande gedrag blijft daarna groen.
4. Update repository-laag en projecties (`drizzle-consumption-log.repository.ts`, `calorie-tracker-projections.ts`) zodat bestaande productlog-logica via de join door `product_consumption` loopt zonder gedragsverandering.

## Fase 2 — Backend gerechten

1. Dish-service met repositories:
   - aanmaken: stam + eerste versie in één transactie; naamvalidatie (trim, case-insensitief uniek, `409 DISH_ALREADY_EXISTS`); minimaal één ingrediënt; alleen actieve verpakkingen (`404 PRODUCT_PACKAGE_NOT_FOUND`, `409 PRODUCT_PACKAGE_ARCHIVED`);
   - detail: stam + nieuwste versie met ingrediënten en afgeleide macro's per portie;
   - PUT/DELETE conform contract (soft delete zonder restore; naam/afbeelding naar stam, receptwijziging naar nieuwe versie) — contractueel compleet, zonder UX;
2. Macro-berekening: ingrediëntbijdragen uit actuele catalogusdata sommeren, delen door `servings`, vermenigvuldigen met gelogde porties; ingrediënten zonder macroprofiel dragen stil niets bij; precisie intern, afronden bij presentatie. Hergebruik de bestaande macrorekenregels uit de nutrition-summary-service.
3. Gecombineerde zoekservice voor `GET /calorie-tracker/search`: intern package- en dish-zoeklogica samenvoegen; zonder query recent geconsumeerd gemengd op recentie; met query alfabetisch binnen typegroepen; alleen actieve verpakkingen en niet-verwijderde gerechten.
4. Log-endpoints uitbreiden: `POST /logs` accepteert de type-union; bij `DISH` pint de backend de nieuwste `dish_version` op create-moment en valideert dish-bestaan (`404 DISH_NOT_FOUND`); PUT op dish-log accepteert alleen `quantity` en `consumedAt`; `GET /logs` laat dish-logs matchen op het `food`-filter.
5. Dish-afbeeldingen: `POST /calorie-tracker/dish-images`, `DELETE /calorie-tracker/dish-images` (rollback) en publieke immutable `GET /dish-images/:fileName`, analoog aan de package-image-endpoints (PNG/JPEG/WebP, ≤ 5 MB, server-side validatie).

## Fase 3 — Frontend

1. Zoekstap van de log-flow overschakelen naar het gecombineerde endpoint:
   - dish-resultaatregels (afbeelding/placeholder, naam, label `Gerecht`, porties, kcal per portie);
   - gemengde recentielijst zonder zoekterm; alfabetisch binnen typegroepen met zoekterm;
   - `+ Nieuw gerecht aanmaken` altijd zichtbaar; lege toestand `Niets gevonden`.
2. Nieuwe route `/logs/new/dish?date=...` met het aanmaakformulier: naam, porties, ingrediëntenlijst met `+ Product toevoegen` (hergebruikt package-zoek en input-units-componenten), optionele afbeeldingsupload met laad- en fouttoestand; validaties en inline `DISH_ALREADY_EXISTS`-fout.
3. Na opslaan terug naar de logstap met het nieuwe gerecht geselecteerd: portie-invoer (decimaal, één eenheid), datum/tijd, `POST /logs` met `type: DISH` en clientgegenereerd log-ID.
4. Logboek en logdetail: dish-logitems (gerechtnaam, `1,5 portie`, consumptietype voeding), dish-detail zonder ingrediëntenlijst, bewerkformulier beperkt tot porties/datum/tijd.
5. Statistieken gebruiken de bestaande totals; dish-logs tellen mee zonder wijziging aan het dashboard.

## Fase 4 — Tests

- Backend unit/integratie: versiepinning (receptwijziging verandert oude logs niet), naamuniekheid, ingrediëntvalidatie inclusief gearchiveerde verpakkingen, macro-som-deling-presisie, food-filtermatching, idempotente retry voor dish-logs, image-uploadvalidatie.
- Frontend componenttests: zoekstap met gemengde resultaten, aanmaakformuliervalidaties, terugkeerflow na opslaan.
- Playwright: end-to-end gerecht aanmaken → loggen → zichtbaar in logboek onder food-filter → bewerken beperkt tot porties/tijd.

## Volgorde en afhankelijkheden

1. Fase 1 eerst: de schema-splitsing is de basis voor alles en moet bestaand groen gedrag bewijzen voordat dish-logica erop bouwt.
2. Fase 2 en 3 kunnen deels parallel: zoekservice en dish-service zijn frontend-afhankelijkheden; PUT/DELETE-endpoints hebben geen frontendblokkade.
3. Fase 4 loopt per fase mee; de Playwright-scenario's sluiten af na fase 3.

## Verificatie

```text
corepack pnpm --filter @product-repos/backend test
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter calory_tracker test
corepack pnpm --filter calory_tracker build
```

Stop wanneer `pnpm` een node_modules purge/recreate prompt toont; volg dan `docs/dependency-management.md`.
