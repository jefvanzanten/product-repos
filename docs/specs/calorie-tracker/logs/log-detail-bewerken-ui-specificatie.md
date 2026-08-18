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

Het productlogdetail presenteert de actuele gedeelde productweergavenaam, productafbeelding of fallback, oorspronkelijke en afgeleide hoeveelheid, datum/tijd, actueel consumptietype of `-`, actuele actieve macro's, eventuele archiefstatus en mutatieacties.

Het dish-logdetail presenteert gerechtnaam, receptporties, datum/tijd, consumptietype voeding en macro's uit de gepinde receptstructuur met actuele productwaarden. `Recept bekijken` verschijnt alleen wanneer het recept nog toegankelijk is; het detail gebruikt geen receptafbeelding.

Het dish-logdetail toont geen ingrediëntenlijst. Het bewerkformulier voor een dish-log toont alleen de portiehoeveelheid, datum en tijd.

Een onbekend of niet-toegankelijk log gebruikt dezelfde zichtbare toestand:

```text
Log niet gevonden
```
