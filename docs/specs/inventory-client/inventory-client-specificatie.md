# Spec-index — inventory client

Dit is de index voor de client/inventarisatiekant van de app. Dit is niet de admin productcatalogus.

## Actuele specs

| Feature | Spec | Status |
| --- | --- | --- |
| Voorraad inzien | [voorraad-inzien-specificatie.md](./voorraad-inzien-specificatie.md) | Gepland / te herwerken |
| Voorraad toevoegen | [voorraad-toevoegen-bottom-sheet-specificatie.md](./voorraad-toevoegen-bottom-sheet-specificatie.md) | Gepland |

## Layout

Niet van toepassing: dit bestand is alleen een index. Layout-eisen staan in de `Layout`-sectie van de onderliggende feature-specs.

## Route

| Route | Doel |
| --- | --- |
| `/` | Inventory client / inventarisatie-tab |

## Richting

De inventory client is bedoeld voor voorraad gebruiken en bijwerken. Catalogusbeheer blijft in admin. Wanneer een product ontbreekt, verwijst de client naar de catalogus-aanmaakflow of een expliciet nog te specificeren snelle toevoegflow.
