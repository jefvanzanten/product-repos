# Roadmap-plan — inventory client spec-index

Bron: `docs/specs/inventory-client/inventory-client-specificatie.md`.

## Doel

De inventory client op route `/` ombouwen van placeholderachtige invoer naar een voorraadclient voor voorraad bekijken en bijwerken. Catalogusbeheer blijft in admin.

## Huidige situatie

- Route `/` bestaat en rendert `InventoryPage`.
- De huidige pagina toont een formulier met categorie/product/hoeveelheid/eenheid en knop `Voeg toe`.
- Er is geen inventory backendcontract, geen voorraadlijst en geen bottomsheet.
- `docs/backend/ERD/STORAGE_ERD.md` is concept en zegt dat final backend contracts bij deze specs moeten worden uitgewerkt.
- Backend bevat wel rudimentaire `location`/`storage_record` tabellen, maar geen routes en niet het gespecificeerde inventory-itemmodel.

## Roadmap

### Stap 1 — Inventory datacontract kiezen

Voordat code wordt gebouwd, leg minimaal vast:

- voorraadregistratie op `product_package_id` of productniveau;
- type van `product_package_id` na Product-ERD alignment;
- quantity als decimal string versus integer;
- location/opbergplaats optioneel of verplicht;
- actuele voorraadstand versus mutatielog;
- sortering en lege toestand;
- zoek/filtergedrag.

Voor MVP is de meest consistente keuze waarschijnlijk:

- voorraad op productverpakkingniveau;
- `productPackageId` als uuid string;
- actuele voorraadstand in `inventory_item`;
- `locationId` nullable zolang opbergplaats optioneel is;
- geen mutatielog tot die expliciet gespecificeerd is.

### Stap 2 — Voorraad inzien bouwen

Volg `docs/plans/inventory-voorraad-inzien-plan.md`:

- backend list endpoint;
- contracts;
- inventory route loader;
- voorraadlijst, empty state en zoekveld;
- toevoegknop opent bottomsheet.

### Stap 3 — Voorraad toevoegen bouwen

Volg `docs/plans/inventory-voorraad-toevoegen-bottomsheet-plan.md`:

- productverpakking zoeken/kiezen uit catalogus;
- hoeveelheid invullen;
- opbergplaats kiezen wanneer beschikbaar;
- opslaan;
- lijst verversen;
- fout behouden in sheet.

### Stap 4 — Admin-catalogus koppeling

- Wanneer een product ontbreekt: verwijs met een gewone cross-app browserlink naar `/product-management-admin/product-catalogus/nieuw?source=inventory` of naar een later gespecificeerde snelle catalogusflow.
- Behoud `source=inventory` tijdens de Product Management Admin-flow, zodat de admin-bottom-tabbar teruglinkt naar `/inventory`.
- Maak geen catalogusproducten automatisch aan vanuit inventory.

## Acceptatiecriteria

- `/` is inventory client en geen catalogusbeheerpagina.
- De huidige placeholderformulieren zijn vervangen door voorraadlijst + toevoegactie.
- Inventory contracts zijn expliciet en sluiten aan op Product ERD en Storage ERD-keuzes.
- Voorraad toevoegen werkt zonder navigatie naar een aparte pagina.
