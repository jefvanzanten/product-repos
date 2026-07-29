# Specificatie - Consumptielogboek

## Status

- Onderdeel: Calorie Tracker > logs
- Route: `/logs?date=YYYY-MM-DD&type=all`
- Status: concept
- Algemene spec: [calory-tracker-specificatie.md](../calory-tracker-specificatie.md)
- Gerelateerde specs:
  - [log-toevoegen.md](./log-toevoegen.md)
  - [log-detail-bewerken.md](./log-detail-bewerken.md)

## Doel

De gebruiker kan alle eigen consumpties van een geselecteerde dag chronologisch bekijken, op type filteren en vanuit dezelfde context een log openen of toevoegen.

Calorie- en macrototalen horen bij Caloriestatistieken en staan niet in het logboek.

## Binnen scope

- Vandaag of een eerdere datum selecteren.
- Met één actie teruggaan naar vandaag.
- Filteren op consumptietype.
- Datum en filter in de URL bewaren.
- Het aantal zichtbare logs tonen.
- Alle logs van de selectie zonder paginering tonen.
- Een logdetail openen.
- Een nieuw log starten.
- Laad-, fout- en lege toestanden afhandelen.

## URL-state

De pagina gebruikt altijd expliciete, canonieke parameters:

```text
/logs?date=2026-07-29&type=all
```

Geldige filterwaarden:

```text
all
food
drink
supplement
```

Regels:

- Zonder parameters wordt vandaag met `all` gekozen en wordt de canonieke URL geschreven.
- Een ongeldige datum valt terug op vandaag.
- Een onbekend filter valt terug op `all`.
- Ongeldige parameters worden met `replace` door geldige parameters vervangen.
- Datum en filter blijven behouden bij verversen, browsernavigatie, detail, toevoegen en bewerken.
- Bij datumwissel blijft het actieve filter behouden.
- Toekomstige datums zijn niet selecteerbaar.

## Layout

Het logboek rendert binnen de [gedeelde applicatieshell met bottom-tabbar](../../shared/bottom-tabbar-specificatie.md).

De pagina toont in deze volgorde:

1. aanklikbare datum;
2. actie `Vandaag`;
3. direct zichtbare filterchips;
4. aantal zichtbare logs;
5. verticaal scrollbare loglijst;
6. primaire actie `Log toevoegen`.

Beschikbare chips:

- Alles;
- Voeding;
- Drinken;
- Supplementen.

Op smalle schermen mogen chips horizontaal scrollen.

### Actie Log toevoegen

Op mobiel staat een vaste brede knop direct boven de bottom-tabbar. De knop bedekt geen logs en de lijst reserveert voldoende onderruimte.

Op desktop staat de primaire actie in de paginaheader.

De actie is geen tab en geen extra floating action button.

## Datumnavigatie

- De date picker bevat een actie `Vandaag` of de pagina toont daarnaast een losse knop `Vandaag`.
- De date picker schakelt toekomstige datums uit.
- Een optionele knop voor de volgende dag is uitgeschakeld wanneer vandaag geselecteerd is.
- Vorige- en volgendedagknoppen vervangen de date picker niet.

## Filters en aantallen

- `Alles` is standaard actief.
- Maximaal één filter is actief.
- De lijst wordt direct na een filterkeuze bijgewerkt.
- Het getoonde aantal betreft uitsluitend de huidige datum en het actieve filter.
- De pagina toont geen calorie-, macro- of micronutriënttotalen.

## Sortering en scrollgedrag

- Logs staan van vroeg naar laat.
- Iedere log toont de geregistreerde tijd.
- Bij gelijke tijd wordt oplopend op aanmaaktijd gesorteerd.
- Bij het eerste openen van een datum scrolt de lijst naar de laatste zichtbare log.
- Na succesvol toevoegen van een log dat binnen het actieve filter valt, scrolt de lijst naar dat log.
- Na filterwijziging, bewerken of terugkeer uit detail blijft de bestaande scrollpositie behouden.

## Compact logitem

Ieder logitem toont uitsluitend:

- productafbeelding of placeholder;
- tijd;
- actuele productnaam en merk;
- actuele verpakkingsomschrijving;
- oorspronkelijke geconsumeerde hoeveelheid en gekozen eenheid;
- tekstueel consumptietype met herkenbare kleur.

Voorbeeld:

```text
08:42
Grillworst - Merknaam
Stuk 250 g
100 g
Voeding
```

Voor een multiverpakking:

```text
20:15
Frisdrank - Merknaam
Sixpack (6 x 330 ml)
1 sixpack
Drinken
```

Calorieën en macro's staan niet in het compacte logitem. Het consumptietype wordt nooit uitsluitend met kleur gecommuniceerd.

## Gearchiveerde catalogusdata

- Een gearchiveerd product of een gearchiveerde verpakking blijft via de actuele catalogusrelatie zichtbaar in bestaande logs.
- Het logitem mag een label `Gearchiveerd` tonen.
- Archivering verandert de oorspronkelijke consumptie-invoer niet.

## Lege, laad- en fouttoestanden

### Geen logs op datum

De pagina toont een lege toestand en houdt `Log toevoegen` bereikbaar.

### Geen resultaten binnen filter

De pagina meldt dat het actieve filter geen resultaten heeft en biedt `Alles tonen`.

### Laden en fouten

- Tijdens ophalen verschijnt een laadstatus.
- Bij een fout verschijnt een foutmelding met `Opnieuw proberen`.
- Resultaten van een oudere aanvraag mogen na een snelle datum- of filterwissel niet in de nieuwe lijst terechtkomen.

## Acceptatiecriteria

### AC-01 - Standaardstate

Gegeven dat de gebruiker `/logs` opent
Dan schrijft de pagina vandaag en `type=all` naar de URL
En toont zij alle logs van vandaag.

### AC-02 - Datum en filter

Gegeven dat de gebruiker datum of filter wijzigt
Dan wordt de URL bijgewerkt
En blijft het filter bij een datumwissel behouden
En kan geen toekomstige datum worden gekozen.

### AC-03 - Chronologische lijst

Gegeven dat meerdere logs bestaan
Dan staan deze van vroeg naar laat
En scrolt de eerste weergave naar de laatste zichtbare log.

### AC-04 - Compacte inhoud

Gegeven dat een logitem zichtbaar is
Dan toont het product-, verpakking-, hoeveelheid-, tijd- en typegegevens
En geen calorieën of macro's.

### AC-05 - Filteraantal

Gegeven dat een typefilter actief is
Dan toont het aantal uitsluitend de logs binnen die datum en dat filter.

### AC-06 - Toestanden

Gegeven dat de selectie leeg is, laadt of niet kan worden opgehaald
Dan toont de pagina de bijbehorende lege, laad- of fouttoestand
En blijft een relevante herstelactie bereikbaar.
