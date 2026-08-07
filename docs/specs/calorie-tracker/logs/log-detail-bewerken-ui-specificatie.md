# UI-specificatie — logdetail en bewerken

## Status

- Onderdeel: Calorie Tracker > logs
- Functionele specificatie: [log-detail-bewerken.md](./log-detail-bewerken.md)
- Status: concept

## Doel

Dit document is de bron van waarheid voor de responsive presentatie van logdetail en de bewerkflow.

## Routepresentatie

- Mobiel toont detail en bewerken als full-screen weergave.
- Desktop mag dezelfde route als modal of zijpaneel tonen.
- Tijdens bewerken blijft op de achtergrond exact één logboekinstantie gemount; deze is inert en niet bedienbaar.

## Detailinhoud

Het productlogdetail presenteert:

- actuele productnaam en merk;
- productafbeelding of fallback;
- actuele verpakkingsomschrijving;
- oorspronkelijke hoeveelheid en gekozen eenheid;
- afgeleide hoeveelheid voor berekening;
- datum en tijd;
- consumptietype;
- alle actuele beschikbare calorie- en macrowaarden;
- status `Gearchiveerd` wanneer product of verpakking niet meer actief is;
- acties `Bewerken` en `Verwijderen`.

Het dish-logdetail presenteert:

- gerechtnaam;
- gerecht-afbeelding of fallback;
- oorspronkelijke hoeveelheid in porties;
- datum en tijd;
- consumptietype voeding;
- calorie- en macrowaarden van de gepinde gerechtversie;
- acties `Bewerken` en `Verwijderen`.

Het dish-logdetail toont geen ingrediëntenlijst. Het bewerkformulier voor een dish-log toont alleen de portiehoeveelheid, datum en tijd.

Een onbekend of niet-toegankelijk log gebruikt dezelfde zichtbare toestand:

```text
Log niet gevonden
```
