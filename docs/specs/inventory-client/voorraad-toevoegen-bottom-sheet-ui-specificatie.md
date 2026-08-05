# UI-specificatie — voorraad toevoegen

## Status

- Onderdeel: Inventory client
- Functionele specificatie: [voorraad-toevoegen-bottom-sheet-specificatie.md](./voorraad-toevoegen-bottom-sheet-specificatie.md)
- Status: gepland

## Doel

Dit document is de bron van waarheid voor de responsive presentatie en schermopbouw van de voorraad-toevoegen-flow.

## Responsive vorm

- Op mobiel verschijnt de flow als bottomsheet bovenop de inventory-tab.
- Op bredere schermen wordt dezelfde inhoud als gecentreerde modal getoond.
- Wanneer betrouwbaar toetsenbordgedrag op ondersteunde mobiele browsers niet haalbaar is, wordt mobiel een full-screen dialog gebruikt; functionaliteit gaat boven presentatie.

## Schermopbouw

```text
Bottomsheet: Voorraad toevoegen

Product
[ Zoek product of verpakking ]

Gekozen product/verpakking
<Productnaam>
<Verpakking>

Hoeveelheid
[ aantal ]

Opbergplaats
[ kies opbergplaats ]

Houdbaarheidsdatum (optioneel)
[ datum ]

[ Toevoegen ]
[ Annuleren ]
```

## Mobiel toetsenbord

- De sheet gebruikt de zichtbare/dynamische viewport.
- Bij het openen van het toetsenbord blijft het actieve veld boven het toetsenbord zichtbaar.
- De sheetinhoud kan intern scrollen.
- De actieknoppen blokkeren het actieve veld niet.
