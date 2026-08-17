# Specificatie — Fysieke voorraad toevoegen

## Doel

Een beheerder kiest één actief concreet product en voegt één of meer fysieke verpakkingen toe met locatie en optionele THT.

## Gedrag

- Productzoeken retourneert concrete `product`-records en gebruikt de gedeelde weergavenaam.
- Verplicht: product, positief geheel aantal en actieve locatie.
- Optioneel: THT als kalenderdatum.
- `Aantal = N` maakt transactioneel `N` afzonderlijke `inventory_item`-records met eigen UUID.
- Ieder item start met de volledige actuele productinhoud als resterende inhoud.
- Alle nieuwe items delen de gekozen locatie en THT; de UI mag ze daarna groeperen.
- Een product zonder bekende inhoud kan niet als meetbaar fysiek voorraaditem worden toegevoegd totdat inhoud is aangevuld.
- Gearchiveerde producten zijn niet selecteerbaar.

## Acceptatiecriteria

Gegeven productinhoud `200 g` en aantal `3`
Wanneer de beheerder toevoegt
Dan ontstaan drie inventory-items van ieder `200 g`
Met dezelfde gekozen locatie en THT.
