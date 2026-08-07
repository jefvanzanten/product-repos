# Specificatie - Consumptielogboek

## Status

- Onderdeel: Calorie Tracker > logs
- Route: `/logs?date=YYYY-MM-DD&type=all`
- Status: concept
- Algemene spec: [calorie-tracker-specificatie.md](../calorie-tracker-specificatie.md)
- Gerelateerde specs:
  - [log-toevoegen.md](./log-toevoegen.md)
  - [log-detail-bewerken.md](./log-detail-bewerken.md)

## Doel

De gebruiker kan alle eigen consumpties van een geselecteerde dag chronologisch bekijken, op type filteren en vanuit dezelfde context een log openen of toevoegen.

Calorie- en macrototalen horen bij Caloriestatistieken en staan niet in het logboek.

## Binnen scope

- Vandaag of een eerdere datum selecteren via de gedeelde datumselector.
- Filteren op consumptietype.
- Datum en filter in de URL bewaren.
- De geselecteerde datum bij navigatie naar Caloriestatistieken behouden.
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
- De navbarlink naar Caloriestatistieken neemt dezelfde datum mee; de teruglink naar het logboek neemt die datum en het laatst geldige typefilter mee.
- Toekomstige datums zijn niet selecteerbaar.

## UI-specificatie

De responsive schermopbouw, filterpresentatie, primaire actie en logitemanatomie staan in [log-overzicht-ui-specificatie.md](./log-overzicht-ui-specificatie.md).

De primaire actie blijft bereikbaar en mag geen logs bedekken. Het logboekpaneel bevat geen tweede datumselector of aanvullende dagknoppen.

## Datumnavigatie

- De gebruiker wijzigt de datum via de gedeelde datumselector boven de Calorie Tracker-navbar.
- De datumselector schakelt toekomstige datums uit.
- Het logboekpaneel herhaalt de datumactie niet met losse knoppen voor `Vandaag`, vorige dag of volgende dag.

## Filters

- `Alles` is standaard actief.
- Maximaal één filter is actief.
- De lijst wordt direct na een filterkeuze bijgewerkt.
- Dish-logs vallen onder het food-filter.
- De pagina toont geen aparte teller voor het aantal zichtbare logs.
- De pagina toont geen calorie-, macro- of micronutriënttotalen.

## Sortering en scrollgedrag

- Logs staan van vroeg naar laat.
- Iedere log toont de geregistreerde tijd.
- Bij gelijke tijd wordt oplopend op aanmaaktijd gesorteerd.
- Bij het eerste openen van een datum scrolt de lijst naar de laatste zichtbare log.
- Na succesvol toevoegen van een log dat binnen het actieve filter valt, scrolt de lijst naar dat log.
- Na filterwijziging, bewerken of terugkeer uit detail blijft de bestaande scrollpositie behouden.

## Inhoud van een compact logitem

Ieder logitem toont:

- verpakkingsafbeelding of gerecht-afbeelding, anders placeholder;
- tijd;
- actuele productnaam en merk bij een productlog, of gerechtnaam zonder merk bij een dish-log;
- oorspronkelijke geconsumeerde hoeveelheid als vermenigvuldiger met de gekozen eenheid, of als porties bij een dish-log;
- tekstueel consumptietype;
- een aanwijzing dat het item geopend kan worden.

Dish-logs tonen het consumptietype voeding. De verpakkingsomschrijving, volledige verpakkingsinhoud, portiedefinitie, calorieën en macro's staan niet in het compacte logitem. De responsive plaatsing staat in de UI-specificatie. Het consumptietype wordt nooit uitsluitend met kleur gecommuniceerd.

## Gearchiveerde catalogusdata

- Een gearchiveerd product of een gearchiveerde verpakking blijft via de actuele catalogusrelatie zichtbaar in bestaande logs.
- Het logitem mag een label `Gearchiveerd` tonen.
- Archivering verandert de oorspronkelijke consumptie-invoer niet.

## Lege, laad- en fouttoestanden

### Geen logs op datum

Deze toestand geldt uitsluitend wanneer op de geselecteerde datum binnen `Alles` geen logs bestaan. De pagina toont een lege toestand en houdt `Log toevoegen` bereikbaar.

### Geen resultaten binnen filter

Deze toestand geldt wanneer het actieve typefilter geen resultaten heeft, terwijl op dezelfde datum binnen `Alles` wel één of meer logs bestaan. De pagina meldt dat het actieve filter geen resultaten heeft en biedt `Alles tonen`.

Wanneer een gefilterde response leeg is, controleert de pagina daarom ook de ongefilterde datumcontext. Zo wordt een volledig lege datum niet als een leeg filter gepresenteerd.

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
Dan toont het afbeelding-, product- of gerecht-, merk-, hoeveelheid-, eenheid-, tijd- en typegegevens in vaste responsieve slots
En toont het geen verpakkingsomschrijving, calorieën of macro's.

### AC-05 - Typefilter

Gegeven dat een typefilter actief is
Dan toont de lijst uitsluitend logs binnen die datum en dat filter
En blijft precies één filter actief.

### AC-06 - Toestanden

Gegeven dat op de geselecteerde datum binnen `Alles` geen logs bestaan
Dan toont de pagina `Geen logs op datum`
En blijft `Log toevoegen` bereikbaar.

Gegeven dat het actieve typefilter geen logs bevat maar op dezelfde datum binnen `Alles` wel logs bestaan
Dan toont de pagina `Geen resultaten binnen filter`
En biedt zij `Alles tonen`.

Gegeven dat de selectie laadt of niet kan worden opgehaald
Dan toont de pagina de bijbehorende laad- of fouttoestand
En blijft een relevante herstelactie bereikbaar.
