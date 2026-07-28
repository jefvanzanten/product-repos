# Plan — voorraad toevoegen bottomsheet

Bron: `docs/specs/inventory-client/voorraad-toevoegen-bottom-sheet-specificatie.md`.

## Statusinschatting

Nieuw onderdeel. Er is geen bottomsheet, geen inventory create endpoint en geen productverpakkingzoeker voor inventorygebruik.

## Doel

Een gebruiker kan vanaf `/` voorraad toevoegen zonder de inventory-tab te verlaten. Fouten blijven in de sheet en wissen invoer niet.

## Uitvoerplan

### Stap 1 — Backend/API keuzes vastleggen

Benodigde endpoints:

```text
GET /product-packages/search?query=<term>
GET /locations
POST /inventory-items
```

Of, wanneer voorraadmutaties als aparte handeling worden gemodelleerd:

```text
POST /inventory-items/add
```

Leg vóór implementatie vast:

- of `POST` een actuele voorraadstand verhoogt of een nieuwe stand zet;
- of duplicates per `(productPackageId, locationId)` worden samengevoegd;
- of `locationId` nullable is;
- foutcodes voor onbekend productPackage/location;
- decimal parsing/canonicalisatie voor hoeveelheid.

Voor MVP verdient `add`/verhogen semantiek de voorkeur bij een knop `Voorraad toevoegen`.

### Stap 2 — Contracts toevoegen

Definieer in `packages/contracts`:

- `InventoryProductPackageSearchResult`:
  - `productPackageId`;
  - `displayName`;
  - `brand` nullable;
  - `packageSummary`;
  - `categoryPath` optioneel voor herkenning.
- `LocationOption`:
  - `id`;
  - `name`;
  - `path`.
- `AddInventoryRequest`:
  - `productPackageId` uuid string;
  - `quantity` positive decimal string;
  - `locationId` number nullable/optional volgens keuze.
- `InventoryItem` response, gelijk aan list item of een mutation response die genoeg data bevat voor refresh.

### Stap 3 — Backend implementatie

- Productpackage search zoekt catalogusproducten/verpakkingen op productnaam, merknaam en categoriepad; niet op barcode.
- `GET /locations` retourneert opbergplaatsen wanneer beschikbaar; lege lijst is toegestaan.
- `POST /inventory-items` parseert strict, canonicaliseert quantity en controleert referenties.
- Persistente operatie is transactioneel:
  - bestaand item verhogen of nieuw item maken volgens gekozen semantiek;
  - geen half opgeslagen item bij falen.
- Vertaal bekende fouten naar stabiele codes:
  - `VALIDATION_ERROR`;
  - `REFERENCE_NOT_FOUND`;
  - eventueel `INVENTORY_ITEM_CONFLICT` wanneer semantiek dat vereist.

### Stap 4 — Frontend bottomsheet

- Bouw een herbruikbare `AddInventoryBottomSheet` onder `features/inventory`.
- Open vanuit de toevoegknop op `InventoryPage`.
- Sheetinhoud:
  - product/productverpakking zoekveld;
  - gekozen product/verpakking display;
  - hoeveelheid;
  - opbergplaatsselectie wanneer locaties beschikbaar zijn;
  - `Toevoegen` en `Annuleren`.
- Sluiten via annuleren, backdrop en escape.
- Sluiten wist niet-opgeslagen invoer doordat de sheet unmount; bij submitfout blijft hij open en behoudt state.
- Geen resultaten toont duidelijke state plus verwijzing naar admin product-aanmaakflow; maakt niets automatisch aan.

### Stap 5 — Refresh en foutgedrag

- Na succesvol opslaan:
  - sheet sluit;
  - inventory list wordt opnieuw geladen of lokaal bijgewerkt met serverresponse.
- Bij fout:
  - sheet blijft open;
  - velden blijven ingevuld;
  - veld- of formulierfout blijft zichtbaar.

### Stap 6 — Toegankelijkheid en interactie

- Gebruik `role="dialog"` en duidelijke titel `Voorraad toevoegen`.
- Focus gaat naar de sheet bij openen en terug naar de toevoegknop bij sluiten.
- Escape sluit alleen wanneer er geen submit bezig is.
- Submitknop is disabled tijdens opslaan.

### Stap 7 — Tests

- Backendtests:
  - productpackage search;
  - voorraad toevoegen met en zonder locatie volgens keuze;
  - onbekende package/location;
  - canonical decimal quantity;
  - transactioneel gedrag.
- Frontendtests:
  - AC-01 openen;
  - AC-02 toevoegen en lijst refresh;
  - AC-03 annuleren zonder opslag;
  - AC-04 submitfout behoudt input;
  - geen-resultaten verwijst naar admin flow.

## Acceptatiecriteria

- Bottomsheet opent op dezelfde pagina.
- Product/verpakking kiezen, geldige hoeveelheid invullen en opslaan werkt.
- Na succes sluit de sheet en is de voorraadlijst bijgewerkt.
- Annuleren/backdrop/escape slaat niets op.
- Fouten blijven zichtbaar in de sheet en wissen invoer niet.
