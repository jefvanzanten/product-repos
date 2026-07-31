# Plan — calorie-tracker log toevoegen

> Status: vervangen door [calory-tracker-figma-implementatieplan.md](./calory-tracker-figma-implementatieplan.md).

Bron: `docs/specs/calory-tracker/logs/log-toevoegen.md`.

## Statusinschatting

Het specbestand is leeg. Er is wel bestaande UI in `AddConsumptionLogModal`, maar die gebruikt oude/ongedefinieerde contracts:

- product-id als `number`, terwijl actuele productcatalogusproducten uuid strings gebruiken;
- velden zoals `servingContent` en `servingUnit` die niet in de actuele contracts staan;
- endpoints `/consumption-logs`, `/units`, `/products` die niet als actuele calorie-tracker source of truth zijn vastgelegd.

Daarom is dit eerst een specificatie- en migratieplan.

## Doel

Een gebruiker kan een consumptielog toevoegen op basis van de nog vast te leggen calorie-tracker datamodellen, zonder oude nutrition/productmodellen terug te brengen.

## Specificatie-eerst plan

Vul de spec met minimaal:

- waar de toevoegactie staat;
- modal, bottomsheet of aparte pagina;
- te kiezen item:
  - product;
  - productverpakking;
  - vrij consumptie-item;
  - of combinatie;
- hoeveelheid en eenheid;
- datum/tijd default en validatie;
- benodigde nutritiondata voor calorie/macroberekening;
- succesgedrag;
- annuleren;
- foutgedrag en behoud van invoer;
- product ontbreekt flow;
- acceptatiecriteria.

## Implementatieplan na spec

### Stap 1 — Contracten

Definieer request/response, bijvoorbeeld:

```ts
type CreateConsumptionLogRequest = {
  consumedAt: string;
  productPackageId: string;
  quantity: string;
  unitTypeId: number;
}

type ConsumptionLogCreated = {
  id: string;
  consumedAt: string;
  displayName: string;
  quantity: string;
  unit: string;
  calories: number | null;
}
```

Pas dit aan als de spec kiest voor productniveau of vrij consumptie-item.

### Stap 2 — Backend

- Maak actuele logtabellen/migraties na nutritiondatamodelkeuze.
- Voeg product/productpackage search toe voor caloriegebruik, of hergebruik catalogussearch wanneer semantiek klopt.
- Voeg `POST /consumption-logs` toe met strict parsing en expected error codes.
- Maak de create-operatie transactioneel.

### Stap 3 — Frontend modal/sheet migreren

- Vervang oude `AddConsumptionLogModal`-types door actuele contracts.
- Productzoeker gebruikt uuid's en actuele display/package summary.
- Hoeveelheid accepteert geldige positieve decimalen; komma wordt genormaliseerd als de spec dat toestaat.
- Datum/tijd default is nu, in gekozen lokale/UTC-semantiek.
- Bij succes sluit de modal/sheet, toont toast en refresht logoverzicht + macrokaart.
- Bij fout blijft de modal/sheet open en behoudt invoer.

### Stap 4 — Tests

- Backend:
  - valid log toevoegen;
  - onbekend product/package;
  - ongeldige hoeveelheid;
  - datum/tijd parsing;
  - nutrition missing gedrag volgens spec.
- Frontend:
  - openen/sluiten;
  - product kiezen;
  - validatiefouten;
  - succesvolle submit refresht relevante queries;
  - serverfout behoudt input.

## Acceptatiecriteria voor start implementatie

- Het lege specbestand is ingevuld met gedrag en AC's.
- Nutrition/logdatamodel is actueel en niet gebaseerd op de oude niet-actuele ERD.
- De bestaande modal wordt gemigreerd of verwijderd; oude numeric-product-id aannames blijven niet bestaan.
