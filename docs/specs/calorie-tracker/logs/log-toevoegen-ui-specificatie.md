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

- gecombineerd zoekveld voor verpakkingen en gerechten;
- actie `+ Nieuw gerecht aanmaken`, altijd zichtbaar onder de zoekresultaten;
- geselecteerde datum;
- tijd;
- sluiten of annuleren.

## Zoekresultaat

Een verpakkingsresultaat toont minimaal:

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

Een gerechtresultaat toont minimaal:

- gerecht-afbeelding of placeholder;
- gerechtnaam;
- label `Gerecht`;
- aantal porties;
- afgeleide calorieën per portie indien aanwezig.

Voorbeeld:

```text
Chili con carne
Gerecht
4 porties · 520 kcal per portie
```

Wanneer niets wordt gevonden, toont de flow uitsluitend:

```text
Niets gevonden
```

De actie `+ Nieuw gerecht aanmaken` blijft zichtbaar.

## Hoeveelheidsinvoer voor verpakkingen

Na verpakkingsselectie toont de flow één samengestelde invoer:

```text
Hoeveelheid [ waarde ] [ eenheid ]
```

Het consumptietype blijft herkenbaar in het geselecteerde zoekresultaat. Het hoeveelheidsdeel herhaalt daarom geen extra consumptietypebadge of uitleg over de catalogusherkomst.

## Hoeveelheidsinvoer voor gerechten

Na gerechtselectie toont de flow één invoer zonder eenheidskeuze:

```text
Hoeveel? [ waarde ] portie
```

De decimale invoer volgt dezelfde regels als de verpakkingshoeveelheid. Onder de invoer kan de flow de afgeleide calorieën voor het ingevulde aantal porties tonen.
