# Specificatie - Logdetail, bewerken en verwijderen

## Status

- Onderdeel: Calorie Tracker > logs
- Routes:
  - `/logs/:logId?date=YYYY-MM-DD&type=<filter>`
  - `/logs/:logId/bewerken?date=YYYY-MM-DD&type=<filter>`
- Status: concept
- Algemene spec: [calory-tracker-specificatie.md](../calory-tracker-specificatie.md)
- Gerelateerde spec: [log-overzicht.md](./log-overzicht.md)

## Doel

De gebruiker kan een eigen consumptielog volledig bekijken, een invoerfout corrigeren of het log veilig verwijderen.

## Presentatie en navigatie

- Detail en bewerken hebben een eigen route en ondersteunen verversen, deep-linking en browsernavigatie.
- Mobiel toont de route als full-screen weergave.
- Desktop mag dezelfde route als modal of zijpaneel tonen.
- De oorspronkelijke logboekdatum en het actieve filter blijven in de queryparameters behouden.
- Terugkeren uit detail herstelt de eerdere logboekcontext en scrollpositie.

## Detailinhoud

Het detail toont:

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

De catalogus is de bron van waarheid. Correcties aan product-, verpakking- of voedingsdata verschijnen zonder snapshot- of synchronisatieactie in het detail.

## Niet gevonden en gegevensscheiding

Een onbekend log-ID en een log van een andere gebruiker leveren dezelfde toestand:

```text
Log niet gevonden
```

De UI en API maken niet zichtbaar of een ID bij een andere gebruiker bestaat.

## Bewerken

Bewerken gebruikt dezelfde productzoek- en hoeveelheidsregels als [log-toevoegen.md](./log-toevoegen.md).

Bewerkbare waarden:

- productverpakking;
- hoeveelheid;
- invoereenheid;
- datum;
- tijd.

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
- Ongedaan maken herstelt het log op de juiste chronologische positie en werkt het zichtbare aantal bij.

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
