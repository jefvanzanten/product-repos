# Specificatie - Consumptielog toevoegen

## Status

- Onderdeel: Calorie Tracker > logs
- Route: `/logs/nieuw?date=YYYY-MM-DD&type=<filter>`
- Status: concept
- Algemene spec: [calory-tracker-specificatie.md](../calory-tracker-specificatie.md)
- Gerelateerde spec: [log-overzicht.md](./log-overzicht.md)

## Doel

De gebruiker kan snel een consumptie registreren door een bestaande actieve catalogusverpakking te kiezen en één hoeveelheid met één passende eenheid vast te leggen.

## Binnen scope

- Recent gebruikte verpakkingen tonen.
- Actieve verpakkingen zoeken op productnaam of merk.
- Eén verpakking selecteren.
- Hoeveelheid en eenheid invoeren.
- Datum en tijd aanpassen.
- Een log idempotent opslaan.
- Na opslaan terugkeren naar de logboekcontext.

## Buiten scope

- Barcodezoeken of scannen.
- Producten aanmaken, voorstellen of aanvragen.
- Vrije producten en calorie-only logs.
- Macro- of micronutriënten handmatig invoeren.
- Typespecifieke extra velden of `Meer opties`.
- Volledig offline opslaan en later synchroniseren.
- Automatisch voorraad verminderen.

## Presentatie

De flow gebruikt een routegebonden modal:

- mobiel: full-screen modal of full-screen sheet;
- desktop: compacte modal;
- verversen en browsernavigatie blijven werken via de route.

Direct zichtbaar:

- productzoekveld;
- geselecteerde datum;
- tijd;
- sluiten of annuleren.

De datum uit het logboek wordt vooraf ingevuld. Tijd is standaard de huidige lokale tijd. Datum en tijd blijven aanpasbaar, maar mogen samen geen toekomstig moment vormen.

## Product zoeken

Zonder zoekterm toont de flow recent gebruikte verpakkingen van de gebruiker.

Vanaf twee tekens zoekt de UI debounced op:

- productnaam;
- merknaam.

Niet binnen scope van zoeken:

- barcode;
- verpakkingstype;
- verpakkingsinhoud;
- categorie.

Zoekresultaten zijn verpakkingen, niet kale producten. Alleen actieve verpakkingen van producten die beschikbaar zijn voor de Calorie Tracker worden getoond.

Een resultaat toont minimaal:

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
Sixpack (6 x 330 ml)
```

Enkelvoudige verpakkingen krijgen bij gelijkwaardige resultaten voorrang boven multiverpakkingen. Multiverpakkingen blijven selecteerbaar.

Wanneer niets wordt gevonden, toont de flow uitsluitend:

```text
Product niet gevonden
```

## Consumptietype

De gebruiker kiest het type niet handmatig. Een geselecteerd catalogusproduct heeft exact één type:

- voeding;
- drinken;
- supplement.

## Hoeveelheid en eenheid

Na productselectie toont de flow één samengestelde invoer:

```text
Hoeveelheid [ waarde ] [ eenheid ]
```

- Er is exact één hoeveelheid en één gekozen eenheid per log.
- De hoeveelheid moet groter dan nul zijn.
- Zowel `0,5` als `0.5` wordt geaccepteerd.
- De Nederlandstalige UI toont decimalen met een komma.
- Een uitzonderlijk hoge waarde vraagt bevestiging maar wordt niet door een algemene harde maximumgrens geblokkeerd.

Mogelijke eenheden worden afgeleid van de verpakking:

- volledige verpakking;
- massa-eenheid, bijvoorbeeld `g`;
- volume-eenheid, bijvoorbeeld `ml`;
- individuele eenheid binnen een multiverpakking, bijvoorbeeld `blikje`;
- stuks of doses wanneer het product telbaar is.

Voorbeeld voor `stuk 250 g`:

```text
1 stuk
100 g
150 g
```

Voorbeeld voor `sixpack (6 x 330 ml)`:

```text
1 sixpack
3 blikjes
990 ml
```

De log bewaart de oorspronkelijke waarde en gekozen eenheid. De backend leidt de hoeveelheid voor voedingsberekeningen af uit de actuele verpakkingsdata. Een samengestelde invoer zoals `2 stuks en 100 g` bestaat niet; de gebruiker kiest één equivalente hoeveelheid of maakt twee logs.

## Voedingswaarden

- De gebruiker voert geen calorieën of macro's in.
- De actuele product- en verpakkingsdata bepalen de berekende voedingswaarden.
- Een product zonder macroprofiel kan worden gelogd en draagt niet bij aan Caloriestatistieken.
- Het consumptielog maakt geen snapshot van product- of voedingsdata.

## Opslaan

- De opslaanknop is tijdens de aanvraag uitgeschakeld.
- Iedere create-aanvraag bevat een idempotentiesleutel.
- De backend maakt voor dezelfde gebruiker en idempotentiesleutel maximaal één log aan.
- Bij een tijdelijke netwerkfout blijft de invoer in het geopende formulier behouden en kan de gebruiker opnieuw proberen.
- Volledige offline synchronisatie is niet vereist.

## Gedrag na succes

- De gebruiker keert terug naar de geselecteerde datum.
- Het actieve filter blijft behouden.
- De log wordt chronologisch geplaatst.
- Het zichtbare aantal wordt bijgewerkt.
- Een succesbevestiging wordt getoond.
- Valt het nieuwe log buiten het actieve filter, dan blijft het filter actief en meldt de UI dat het log daardoor niet zichtbaar is.
- Valt het log binnen het filter, dan scrolt de lijst naar het nieuwe log.
- Caloriestatistieken voor vandaag worden ongeldig gemaakt en bij een volgend bezoek opnieuw opgehaald.

## Acceptatiecriteria

### AC-01 - Routegebonden flow

Gegeven dat de gebruiker `Log toevoegen` kiest
Dan opent `/logs/nieuw` op mobiel full-screen en op desktop als modal
En blijven datum en filter in de URL-context behouden.

### AC-02 - Product zoeken

Gegeven dat geen zoekterm bestaat
Dan ziet de gebruiker recente actieve verpakkingen.
Wanneer minimaal twee tekens zijn ingevoerd
Dan zoekt de UI op productnaam en merk.

### AC-03 - Verpakking selecteren

Gegeven dat een product meerdere verpakkingen heeft
Dan verschijnt iedere actieve verpakking als afzonderlijk selecteerbaar resultaat
En kan het kale product niet zonder verpakking worden gekozen.

### AC-04 - Afgeleide eenheden

Gegeven dat een verpakking is geselecteerd
Dan toont de eenheidskeuze uitsluitend eenheden die uit die verpakking kunnen worden afgeleid
En kan de gebruiker één positieve hoeveelheid met één eenheid opslaan.

### AC-05 - Geen product gevonden

Gegeven dat zoeken geen actieve verpakking oplevert
Dan toont de flow `Product niet gevonden`
En geen productaanvraag- of vrije invoeractie.

### AC-06 - Idempotent opslaan

Gegeven dat dezelfde create-aanvraag door dubbel tikken of opnieuw proberen meerdere keren aankomt
Dan ontstaat maximaal één consumptielog.

### AC-07 - Filter behouden

Gegeven dat het actieve filter niet overeenkomt met het nieuwe logtype
Dan blijft het filter actief
En meldt de UI dat het log is toegevoegd maar niet zichtbaar is.
