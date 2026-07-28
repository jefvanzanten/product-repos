# Plan — voorraad inzien

Bron: `docs/specs/inventory-client/voorraad-inzien-specificatie.md`.

## Statusinschatting

Nieuw onderdeel. De huidige `/` pagina is placeholderachtig en toont een toevoegevoegd formulier in plaats van een voorraadlijst.

Ontbrekend:

- voorraaditem contract;
- backend list endpoint;
- voorraad-/opbergdatamodel dat niet meer conceptueel is;
- frontend loader/datafetch;
- lijst, empty state, zoek/filter;
- knop die bottomsheet opent.

## Doel

Een gebruiker kan op de inventory-tab snel zien welke voorraad er is, welk product/verpakking het betreft en waar die ligt.

## Uitvoerplan

### Stap 1 — Backend/API specificeren

Leg vóór implementatie het inventory list-contract vast, bijvoorbeeld:

```ts
type InventoryItem = {
  id: string;
  productPackageId: string;
  displayName: string;
  brand: { id: string; name: string } | null;
  packageSummary: string;
  quantity: string;
  quantityUnit: string | null;
  location: { id: number; name: string; path: string } | null;
  updatedAt: string;
}
```

Beslis expliciet:

- of `quantityUnit` uit productverpakking komt of los wordt opgeslagen;
- of `location` nullable is;
- of lijst gesorteerd wordt op productnaam, locatie of updatedAt;
- of zoeken server-side via `q` gaat.

Waarschijnlijke endpointvorm:

```text
GET /inventory-items?query=&cursor=
```

### Stap 2 — Database/schema alignen

- Vervang of migreer de conceptuele `storage_record`-vorm naar het gekozen `inventory_item`-model.
- Gebruik `productPackageId` conform Product ERD/contracts.
- Sla quantity op als canonical decimal string of als databasevorm die zonder precisieverlies terug kan naar string.
- Voeg indexen toe voor productPackageId, locationId en zoek-/sorteervelden waar nodig.

### Stap 3 — Backend repository/service

- Bouw een inventory-read capability die product, merk, package type, unit content, unit type en locatie joinet.
- Maak een gedeelde formatter voor productdisplaynaam en verpakkingssamenvatting, bij voorkeur herbruikbaar met catalogus browse/search.
- Geef expected errors als waarden terug; routes vertalen naar HTTP.

### Stap 4 — Frontend route `/`

- Verwijder het placeholder-toevoegformulier uit `InventoryPage`.
- Voeg loader/fetch toe voor inventory items.
- Render:
  - titel `Inventarisatie`;
  - zoekveld `Zoek in voorraad`;
  - voorraadrijen met product/merk, verpakking, hoeveelheid/status en opbergplaats;
  - lege toestand met toevoegactie.
- Toon foutstate wanneer backend laden mislukt.

### Stap 5 — Zoek/filter

- Voor kleine lijsten mag client-side filteren tijdelijk, maar vanaf contractkeuze moet URL-state en server-side `query` testbaar zijn.
- Zoek minimaal op displaynaam, merk, verpakking en locatiepad wanneer dat binnen backendcontract valt.
- Geen barcode-scanning in deze slice.

### Stap 6 — Bottomsheetkoppeling

- Voeg één primaire toevoegknop toe.
- De knop opent de bottomsheet uit `inventory-voorraad-toevoegen-bottomsheet-plan.md` zonder navigatie.
- Na succesvolle toevoeging laat deze pagina de lijst verversen.

### Stap 7 — Tests

- Backendtests:
  - lijst met voorraaditems;
  - lege voorraad;
  - product/package/location join;
  - zoek vanaf afgesproken minimum;
  - sortering.
- Frontendtests:
  - AC-01 lijst tonen;
  - AC-02 lege voorraad + toevoegen mogelijk;
  - AC-03 toevoegknop opent sheet.

## Acceptatiecriteria

- Voorraadlijst toont productnaam, merk, verpakking, hoeveelheid/status en opbergplaats waar beschikbaar.
- Lege voorraad toont een lege toestand en toevoegactie.
- De oude placeholder-add-form UI is verwijderd.
- Toevoegactie opent een bottomsheet op dezelfde pagina.
