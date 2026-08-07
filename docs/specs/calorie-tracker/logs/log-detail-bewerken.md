# Specificatie - Logdetail, bewerken en verwijderen

## Status

- Onderdeel: Calorie Tracker > logs
- Routes:
  - `/logs/:logId?date=YYYY-MM-DD&type=<filter>`
  - `/logs/:logId/edit?date=YYYY-MM-DD&type=<filter>`
- Status: concept
- Algemene spec: [calorie-tracker-specificatie.md](../calorie-tracker-specificatie.md)
- Gerelateerde spec: [log-overzicht.md](./log-overzicht.md)

## Doel

De gebruiker kan een eigen consumptielog volledig bekijken, een invoerfout corrigeren of het log veilig verwijderen.

## UI-specificatie

De responsive routepresentatie en detailopbouw staan in [log-detail-bewerken-ui-specificatie.md](./log-detail-bewerken-ui-specificatie.md).

## Navigatie

- Detail en bewerken hebben een eigen route en ondersteunen verversen, deep-linking en browsernavigatie.
- Tijdens bewerken blijft op de achtergrond exact één logboekinstantie gemount; die achtergrond is inert en niet bedienbaar.
- De oorspronkelijke logboekdatum en het actieve filter blijven in de queryparameters behouden.
- Terugkeren uit detail herstelt de eerdere logboekcontext en scrollpositie.

## Detailinhoud

Het detail toont voor een productlog:

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

Het detail toont voor een dish-log:

- gerechtnaam;
- gerecht-afbeelding of fallback;
- oorspronkelijke hoeveelheid in porties;
- datum en tijd;
- consumptietype voeding;
- calorie- en macrowaarden berekend uit de gepinde gerechtversie;
- acties `Bewerken` en `Verwijderen`.

Het dish-detail toont geen ingrediëntenlijst en geen verwijzing naar het gerecht zelf. De macro's horen bij de gepinde versie; latere receptwijzigingen veranderen het detail niet.

De catalogus is de bron van waarheid. Correcties aan product-, verpakking- of voedingsdata verschijnen zonder snapshot- of synchronisatieactie in het detail van productlogs.

## Niet gevonden en gegevensscheiding

Een onbekend log-ID en een log van een andere gebruiker leveren dezelfde toestand:

```text
Log niet gevonden
```

De UI en API maken niet zichtbaar of een ID bij een andere gebruiker bestaat.

## Bewerken

Bewerken van een productlog gebruikt dezelfde productzoek- en hoeveelheidsregels als [log-toevoegen.md](./log-toevoegen.md).

Bewerkbare waarden voor een productlog:

- productverpakking;
- hoeveelheid;
- invoereenheid;
- datum;
- tijd.

Bewerkbare waarden voor een dish-log:

- hoeveelheid in porties;
- datum;
- tijd.

Het gerecht of de gepinde versie zelf is niet vervangbaar; een ander gerecht loggen heet verwijderen en opnieuw toevoegen.

Het wijzigen van een log verandert nooit de productcatalogus.

Bij een gearchiveerd product:

- datum, tijd, hoeveelheid en bestaande eenheid blijven bewerkbaar;
- het gearchiveerde product blijft als huidige keuze zichtbaar;
- productzoeken voor vervanging toont alleen actieve verpakkingen.

### Cataloguscorrecties

Omdat geen snapshot wordt gebruikt:

- `1 verpakking` rekent met de actuele verpakkingsinhoud;
- een expliciete invoer zoals `100 g` blijft `100 g`;
- `3 blikjes` rekent met de actuele inhoud per blikje;
- actuele voedingswaarden bepalen de statistieken.

### Gelijktijdige wijzigingen

- De update-aanvraag bevat de `updatedAt`-waarde waarmee het formulier is geopend.
- Als het log intussen is gewijzigd, weigert de backend stil overschrijven.
- De gebruiker krijgt een conflictmelding en kan de actuele gegevens herladen.
- Realtime infrastructuur of WebSockets zijn niet vereist.

### Datum wijzigen

- Een toekomstig moment is niet toegestaan.
- Na verplaatsen naar een andere datum navigeert de UI naar die nieuwe logboekdatum.
- Het actieve typefilter blijft behouden.
- De statistieken van de betrokken dagen gebruiken bij een volgende berekening de gewijzigde datum.

## Verwijderen

- Verwijderen vraagt geen voorafgaande bevestigingsdialoog.
- Het log verdwijnt direct uit lijst en statistieken.
- De UI toont gedurende vijf seconden `Ongedaan maken`.
- Daarna blijft het log dertig dagen technisch als verwijderd record bewaard en is het niet via de normale UI toegankelijk.
- Na dertig dagen wordt het definitief gewist.
- Ongedaan maken herstelt het log op de juiste chronologische positie.

## Acceptatiecriteria

### AC-01 - Deelbaar detail

Gegeven dat de gebruiker een eigen log opent
Dan krijgt het detail een eigen URL
En blijven datum en filter voor terugnavigatie behouden.

### AC-02 - Actuele catalogusdata

Gegeven dat catalogusdata sinds het loggen is gecorrigeerd
Dan toont het detail de actuele product- en voedingsdata
En is geen snapshotupdate nodig.

### AC-03 - Product corrigeren

Gegeven dat de verkeerde verpakking is gelogd
Wanneer de gebruiker een andere actieve verpakking kiest en opslaat
Dan verandert alleen het log
En blijft de catalogus ongewijzigd.

### AC-04 - Conflict

Gegeven dat `updatedAt` sinds openen is gewijzigd
Wanneer de gebruiker opslaat
Dan overschrijft de backend de nieuwere versie niet stilzwijgend.

### AC-05 - Datum verplaatsen

Gegeven dat de gebruiker een log naar een andere geldige datum verplaatst
Dan navigeert de UI na opslaan naar die datum
En blijft het actieve filter behouden.

### AC-06 - Verwijderen en herstellen

Gegeven dat de gebruiker een log verwijdert
Dan verdwijnt het direct uit lijst en statistieken
En kan de gebruiker het gedurende vijf seconden ongedaan maken.

### AC-07 - Gearchiveerd product

Gegeven dat het gekoppelde product is gearchiveerd
Dan blijft het log leesbaar en beperkt bewerkbaar
En kan het gearchiveerde product niet voor een nieuw log worden geselecteerd.

### AC-08 - Dish-log

Gegeven dat de gebruiker een dish-log opent
Dan toont het detail de gerechtnaam, porties en macro's van de gepinde versie zonder ingrediëntenlijst
En is bewerken beperkt tot porties, datum en tijd.
