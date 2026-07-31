# Plan — macro- en calorieëngrafiek

> Status: vervangen door [calory-tracker-figma-implementatieplan.md](./calory-tracker-figma-implementatieplan.md).

Bron: `docs/specs/calory-tracker/dashboard/calorien-statestieken.md`.

> Dit plan is opgesteld voor een eerdere, beperktere dashboardspecificatie. Bij uitvoering zijn de actuele specificatie, domeinregels, endpointcontracten en ERD's leidend; de implementatiestappen moeten daar eerst tegen worden herijkt.

## Statusinschatting

De spec bevat nu alleen de kernwens:

- gebruiker ziet direct hoeveel calorieën die op die dag heeft verbruikt;
- gebruiker ziet targetcalorieën voor die dag;
- tweede grafiek verdeelt macro's onder koolhydraten, vetten en eiwitten.

De spec is nog niet implementatieklaar. `docs/backend/ERD/CALORY_TRACKER_ERD.md` is expliciet niet actueel en er is geen leidend nutrition-datamodel.

Bestaande app-status:

- `apps/calory_tracker` heeft een dashboard en consumptielog-UI;
- er is geen macro/calorie-chart;
- frontend gebruikt oude API/types zoals `/consumption-logs`, `/units`, `servingContent` en numerieke product-id's die niet aansluiten op de actuele productcataloguscontracts.

## Doel

Eerst de ontbrekende nutrition- en targetkeuzes specificeren, daarna een dashboardcomponent bouwen dat dagelijkse calorie- en macrovoortgang toont.

## Specificatie-eerst plan

Leg minimaal vast:

1. Dagafbakening:
   - lokale dag of UTC-dag;
   - tijdzonebron.
2. Caloriedoel:
   - vast per gebruiker, hardcoded MVP, configuratie of backendprofiel;
   - wat gebeurt er als geen target bestaat.
3. Nutritionbron:
   - voedingswaarden per product, per verpakking, per 100g/ml of per portie;
   - relatie met actuele Product ERD.
4. Consumptielogs:
   - logt gebruiker product, product_package of vrij item;
   - hoeveelheidseenheid en conversie naar nutritionbasis.
5. Macrovelden:
   - koolhydraten, vetten, eiwitten in gram;
   - calorieën uit backend berekend of frontend berekend;
   - afronding en null/unknown gedrag.
6. UI-vorm:
   - grafiektype voor calorieën versus target;
   - grafiektype voor macroverdeling;
   - lege dag en foutstate.

## Implementatieplan na speckeuzes

### Stap 1 — Contracts

Definieer bijvoorbeeld:

```ts
type DailyNutritionSummary = {
  date: string;
  calories: { consumed: number; target: number | null };
  macros: {
    carbohydratesGrams: number;
    fatGrams: number;
    proteinGrams: number;
  };
}
```

### Stap 2 — Backend

- Maak een actueel nutrition-/calorie-ERD of breid Product ERD bewust uit met nutritiontabellen.
- Voeg endpoint toe, bijvoorbeeld `GET /nutrition/daily-summary?date=YYYY-MM-DD`.
- Agregeer alleen over logs binnen gekozen dagafbakening.
- Classificeer ontbrekende nutritiondata expliciet in response of foutstate.

### Stap 3 — Frontend

- Voeg dashboardkaart toe boven of naast logoverzicht.
- Toon calorie consumed vs target.
- Toon macroverdeling koolhydraten/vetten/eiwitten.
- Gebruik toegankelijke SVG/CSS of chartlibrary alleen na expliciete dependencykeuze.
- Toon lege state wanneer er geen logs zijn.

### Stap 4 — Tests

- Backendaggregatie per dag en tijdzone.
- Macro/calorieberekening met bekende logs.
- Geen target/null target.
- Frontend render van consumed, target en macro's.

## Acceptatiecriteria voor start implementatie

- Nutritionbron en targetbron zijn vastgelegd in specs/ERD/contracts.
- Oude calorie-ERD is niet als bron gebruikt zonder update.
- Dagafbakening en conversieregels zijn testbaar.
