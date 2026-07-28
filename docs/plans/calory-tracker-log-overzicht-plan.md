# Plan — calorie-tracker logoverzicht

Bron: `docs/specs/calory-tracker/logs/log-overzicht.md`.

## Statusinschatting

Het specbestand is leeg. Daardoor is er nog geen bron van waarheid voor gedrag, route, data, filters of acceptatiecriteria.

Bestaande app-status:

- `apps/calory_tracker/src/pages/Dashboard.tsx` toont `Recente consumptie-logs` voor vandaag;
- de data komt uit oude endpointnamen/types (`/consumption-logs`, `consumption`, `unit`);
- de huidige calorie/nutrition ERD is niet actueel;
- dit mag niet als definitieve implementatie worden beschouwd zonder nieuwe spec.

## Doel

Eerst een logoverzichtspecificatie schrijven; daarna de bestaande UI behouden, vervangen of migreren naar de nieuwe contracts.

## Specificatie-eerst plan

Vul de spec met minimaal:

- route/scherm waar logoverzicht staat;
- periode: vandaag, week, custom datum of alle logs;
- sortering: nieuwste eerst of chronologisch;
- velden per log:
  - tijdstip;
  - product/productverpakking of consumptienaam;
  - hoeveelheid en eenheid;
  - calorieën;
  - macro's optioneel;
- lege toestand;
- laad- en fouttoestand;
- filters/zoekgedrag;
- relatie met toevoegen-modal;
- acceptatiecriteria.

## Implementatieplan na spec

### Stap 1 — Contract

Definieer een logoverzichtresponse, bijvoorbeeld:

```ts
type ConsumptionLogListItem = {
  id: string;
  consumedAt: string;
  displayName: string;
  quantity: string;
  unit: string;
  calories: number | null;
  macros?: {
    carbohydratesGrams: number | null;
    fatGrams: number | null;
    proteinGrams: number | null;
  };
}
```

### Stap 2 — Backend

- Maak endpoint, bijvoorbeeld `GET /consumption-logs?date=YYYY-MM-DD`.
- Sluit aan op het nieuwe nutrition/logdatamodel.
- Sorteer conform spec.
- Geef lege lijst terug voor geen logs.

### Stap 3 — Frontend

- Vervang inline stijlen waar praktisch door component/CSS-module wanneer de slice wordt aangeraakt.
- Gebruik nieuwe contracten in `api/client.ts` en hook.
- Render loading, empty, error en lijststates.
- Houd integratie met log toevoegen: na succesvolle toevoeging invalidate/refetch.

### Stap 4 — Tests

- Backend list en date filtering.
- Frontend lege state, lijststate en sortering.
- Refetch na toevoegen wanneer log-toevoegen in scope is.

## Acceptatiecriteria voor start implementatie

- Het lege specbestand is ingevuld met gedrag en AC's.
- Er is een actueel backendcontract.
- Oude types met numerieke product-id's worden niet verder verspreid.
