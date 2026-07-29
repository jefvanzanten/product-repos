# Specificatie — voorraad inzien

## Status

- Onderdeel: inventory client
- Route: `/`
- Status: gepland / huidige pagina is nog placeholderachtig

## Doel

Een gebruiker kan in de inventory client snel zien welke voorraad er is en waar die ligt.

## Binnen scope

- Voorraadlijst tonen op de inventory-tab.
- Productnaam, merk en verpakking herkenbaar tonen.
- Hoeveelheid/voorraadstatus tonen.
- Opbergplaats tonen wanneer beschikbaar.
- Zoeken of filteren binnen voorraad wanneer de lijst groot wordt.
- Actie om voorraad toe te voegen openen via een knop op deze pagina.

## Buiten scope

- Catalogusstamdata beheren.
- Product aanmaken als admin-flow.
- Uitgebreide rapportages.
- Barcode-scanning, tenzij later expliciet gespecificeerd.

## Layout

```text
Inventarisatie

[ Zoek in voorraad ]

<Voorraadrij>
  Product / merk
  Verpakking
  Hoeveelheid
  Opbergplaats

[ + ] Voorraad toevoegen
```

De toevoegactie opent geen nieuwe pagina, maar de bottomsheet uit [voorraad-toevoegen-bottom-sheet-specificatie.md](./voorraad-toevoegen-bottom-sheet-specificatie.md).

## Benodigde data — nog te specificeren

Nog te bepalen met backend/contracts:

- voorraaditem DTO;
- voorraadhoeveelheid en eenheid;
- relatie tussen productverpakking en opbergplaats;
- sortering;
- lege toestand;
- zoek/filterendpoint.

## Acceptatiecriteria

### AC-01 — Voorraadlijst tonen

Gegeven dat er voorraaditems bestaan  
Wanneer de gebruiker de inventory-tab opent  
Dan ziet de gebruiker een lijst met voorraaditems.

### AC-02 — Lege voorraad

Gegeven dat er nog geen voorraaditems bestaan  
Wanneer de gebruiker de inventory-tab opent  
Dan ziet de gebruiker een lege toestand  
En kan de gebruiker voorraad toevoegen.

### AC-03 — Toevoegen openen

Gegeven dat de gebruiker op de inventory-tab staat  
Wanneer de gebruiker de toevoegknop kiest  
Dan opent de voorraad-toevoegen-bottomsheet.
