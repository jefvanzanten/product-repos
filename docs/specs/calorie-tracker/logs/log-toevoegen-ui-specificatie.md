# UI-specificatie — Consumptielog toevoegen

## Status

- Onderdeel: Calorie Tracker > logs
- Functionele specificatie: [log-toevoegen.md](./log-toevoegen.md)
- Status: concept

## Doel

Dit document is de bron van waarheid voor de responsive presentatie en schermopbouw van de routegebonden toevoegflow.

## Modalpresentatie

De flow gebruikt een routegebonden modal:

- mobiel: full-screen modal of full-screen sheet;
- desktop: compacte modal;
- het bestaande logboek blijft als één gemounte achtergrondinstantie zichtbaar en is tijdens de modal inert en niet bedienbaar.

Direct zichtbaar:

- productzoekveld;
- geselecteerde datum;
- tijd;
- sluiten of annuleren.

## Zoekresultaat

Een productresultaat toont minimaal:

- verpakkingsafbeelding, met productafbeelding en daarna placeholder als fallback;
- productnaam;
- merk indien aanwezig;
- verpakkingstype;
- inhoud en inhoudseenheid;
- aantal per verpakking.

Voorbeelden:

```text
Grillworst
Merknaam
Stuk 250 g
```

```text
Frisdrank
Merknaam
Sixpack 1.980 ml (6 × 330 ml per blikje)
```

Wanneer niets wordt gevonden, toont de flow uitsluitend:

```text
Product niet gevonden
```

## Hoeveelheidsinvoer

Na productselectie toont de flow één samengestelde invoer:

```text
Hoeveelheid [ waarde ] [ eenheid ]
```

Het consumptietype blijft herkenbaar in het geselecteerde zoekresultaat. Het hoeveelheidsdeel herhaalt daarom geen extra consumptietypebadge of uitleg over de catalogusherkomst.
