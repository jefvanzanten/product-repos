# Specificatie - Consumptielog toevoegen

## Status

- Onderdeel: Calorie Tracker > logs
- Routes:
  - `/logs/new?date=YYYY-MM-DD&type=<filter>`
  - `/logs/new/dish?date=YYYY-MM-DD` (gerecht aanmaken)
- Status: concept
- Algemene spec: [calorie-tracker-specificatie.md](../calorie-tracker-specificatie.md)
- Gerelateerde specs: [log-overzicht.md](./log-overzicht.md), [gerecht-aanmaken.md](../gerechten/gerecht-aanmaken.md)

## Doel

De gebruiker kan snel een consumptie registreren door één gecombineerde zoekmachine te gebruiken en daarna ofwel een bestaande actieve catalogusverpakking met hoeveelheid en eenheid te loggen, ofwel een gerecht te selecteren of aan te maken en in porties te loggen.

## Binnen scope

- Gecombineerd zoeken naar verpakkingen en gerechten.
- Recent geconsumeerde verpakkingen en gerechten tonen zonder zoekterm.
- Eén verpakking of één gerecht selecteren.
- Voor een verpakking: hoeveelheid en eenheid invoeren.
- Voor een gerecht: aantal porties invoeren.
- Een nieuw gerecht aanmaken en daarna direct in porties loggen.
- Datum en tijd aanpassen.
- Een log met een clientgegenereerd log-ID veilig opnieuw kunnen opslaan na een retry.
- Na opslaan terugkeren naar de logboekcontext.

## Buiten scope

- Barcodezoeken of scannen.
- Producten aanmaken, voorstellen of aanvragen.
- Vrije producten en calorie-only logs.
- Macro- of micronutriënten handmatig invoeren.
- Typespecifieke extra velden of `Meer opties`.
- Volledig offline opslaan en later synchroniseren.
- Automatisch voorraad verminderen.
- Bewerken en verwijderen van gerechten (toekomstige gerechten-app).
- Geneste gerechten: een gerecht kan geen ingrediënt zijn van een ander gerecht.

## UI-specificatie

De responsive modalvorm, direct zichtbare velden, zoekresultaten en hoeveelheidsinvoer staan in [log-toevoegen-ui-specificatie.md](./log-toevoegen-ui-specificatie.md).

De flow blijft routegebonden, zodat verversen en browsernavigatie werken. Het bestaande logboek blijft als één gemounte achtergrondinstantie behouden en is tijdens de modal inert en niet bedienbaar.

De datum uit het logboek wordt vooraf ingevuld. Tijd is standaard de huidige lokale tijd. Datum en tijd blijven aanpasbaar, maar mogen samen geen toekomstig moment vormen.

## Zoeken

De flow gebruikt één gecombineerde zoekmachine voor verpakkingen en gerechten. Er is geen voorafgaande keuze tussen product en gerecht; het geselecteerde resultaat bepaalt de vervolgstappen.

Zonder zoekterm toont de flow recent geconsumeerde verpakkingen en gerechten van de gebruiker, gemengd op recentie.

Vanaf twee tekens zoekt de UI debounced op:

- productnaam;
- merknaam;
- gerechtnaam.

Niet binnen scope van zoeken:

- barcode;
- verpakkingstype;
- verpakkingsinhoud;
- categorie.

Met zoekterm staan de resultaten alfabetisch binnen hun typegroep: eerst verpakkingen, dan gerechten.

Zoekresultaten zijn verpakkingen, niet kale producten. Alleen actieve producten met actieve verpakkingen worden getoond. Gerechten in de resultaten zijn uitsluitend niet-verwijderde gerechten van de gebruiker.

Een verpakking als resultaat toont minimaal:

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

Een gerecht als resultaat toont minimaal:

- gerecht-afbeelding of placeholder;
- gerechtnaam;
- label `Gerecht`;
- aantal porties van de nieuwste versie;
- afgeleide calorieën per portie, of geen calorievermelding wanneer het gerecht niets bijdraagt.

Voorbeeld:

```text
Chili con carne
Gerecht
4 porties · 520 kcal per portie
```

Verpakkingen zonder portiedefinitie krijgen bij gelijkwaardige resultaten voorrang. Verpakkingen met portiedefinitie blijven selecteerbaar.

De zoekstap toont altijd de actie `+ Nieuw gerecht aanmaken`, ongeacht of er resultaten zijn. De volledige aanmaakflow staat in [gerecht-aanmaken.md](../gerechten/gerecht-aanmaken.md).

Wanneer niets wordt gevonden, toont de flow uitsluitend:

```text
Niets gevonden
```

`+ Nieuw gerecht aanmaken` blijft daarbij zichtbaar.

## Consumptietype

De gebruiker kiest het type niet handmatig. Een geselecteerd catalogusproduct heeft exact één type:

- voeding;
- drinken;
- supplement.

Een gerecht geldt als voeding. Het logitem toont het consumptietype voeding en de hoeveelheid in porties.

Het type is al herkenbaar in het geselecteerde zoekresultaat. Na selectie toont het hoeveelheidsdeel daarom geen extra consumptietypebadge en geen uitleg zoals `Type komt uit de productcatalogus`.

## Hoeveelheid en eenheid voor verpakkingen

Na verpakkingsselectie toont de flow één samengestelde invoer:

```text
Hoeveelheid [ waarde ] [ eenheid ]
```

- Er is exact één hoeveelheid en één gekozen eenheid per log.
- De hoeveelheid moet groter dan nul zijn.
- Zowel `0,5` als `0.5` wordt geaccepteerd.
- De Nederlandstalige UI toont decimalen met een komma.
- Een uitzonderlijk hoge waarde vraagt bevestiging maar wordt niet door een algemene harde maximumgrens geblokkeerd.

Mogelijke eenheden worden afgeleid van de verpakking:

- volledige verpakking op basis van de expliciete volledige verpakkingsinhoud;
- massa-eenheid, bijvoorbeeld `g`;
- volume-eenheid, bijvoorbeeld `ml`;
- een expliciete portie of individueel stuk wanneer de verpakking die heeft, bijvoorbeeld `wafel` of `blikje`;
- stuks of doses wanneer het product telbaar is.

Na het laden van de eenheden selecteert de UI standaard de expliciete portie of het individuele stuk wanneer die beschikbaar is. Zonder zo'n eenheid wordt de eerste beschikbare eenheid geselecteerd. Een reeds geldige keuze, bijvoorbeeld tijdens bewerken of na opnieuw laden, blijft behouden.

Voorbeeld voor `stuk 250 g`:

```text
1 stuk
100 g
150 g
```

Voorbeeld voor `sixpack 1.980 ml (6 × 330 ml per blikje)`:

```text
1 sixpack
3 blikjes
990 ml
```

De log bewaart de oorspronkelijke waarde en gekozen eenheid. De backend leidt de hoeveelheid voor voedingsberekeningen af uit de actuele verpakkingsdata. Een samengestelde invoer zoals `2 stuks en 100 g` bestaat niet; de gebruiker kiest één equivalente hoeveelheid of maakt twee logs.

## Hoeveelheid voor gerechten

Na gerechtselectie toont de flow één hoeveelheidsinvoer in porties:

```text
Hoeveel? [ waarde ] portie
```

- Er is exact één hoeveelheid per dish-log, uitgedrukt in porties.
- De hoeveelheid is een decimaal getal groter dan nul; `1,5 portie` is geldig.
- Dezelfde invoerregels gelden als bij verpakkingen: `0,5` en `0.5` worden geaccepteerd, de Nederlandstalige UI toont een komma, en een uitzonderlijk hoge waarde vraagt bevestiging zonder harde maximumgrens.
- Er is geen eenheidskeuze; portie is de enige eenheid.
- Datum en tijd volgen dezelfde regels als bij verpakkingen.

Een gerecht wordt gelogd zoals het op dat moment bestaat: de backend pint de nieuwste gerechtversie op create-moment. Later bewerken van het gerecht verandert het log niet.

## Voedingswaarden

- De gebruiker voert geen calorieën of macro's in.
- De actuele product- en verpakkingsdata bepalen de berekende voedingswaarden.
- Een product zonder macroprofiel kan worden gelogd en draagt niet bij aan Caloriestatistieken.
- Voor een dish-log berekent de backend de macro's uit de gepinde versie: de som van de ingrediëntbijdragen gedeeld door het aantal porties, vermenigvuldigd met de gelogde porties.
- Ingrediënten zonder macroprofiel dragen stil niets bij; de UI toont hiervoor geen waarschuwing.
- Het consumptielog maakt geen snapshot van product- of voedingsdata; dish-logs pinnen wel de gerechtversie.

## Opslaan

- De opslaanknop is tijdens de aanvraag uitgeschakeld.
- Iedere create-aanvraag bevat een door de client gegenereerd log-ID.
- De backend maakt voor hetzelfde log-ID maximaal één log aan.
- Bij een tijdelijke netwerkfout blijft de invoer in het geopende formulier behouden en kan de gebruiker opnieuw proberen.
- Volledige offline synchronisatie is niet vereist.

## Gedrag na succes

- De gebruiker keert terug naar de geselecteerde datum.
- Het actieve filter blijft behouden.
- De log wordt chronologisch geplaatst.
- Een succesbevestiging wordt getoond.
- Valt het nieuwe log buiten het actieve filter, dan blijft het filter actief en meldt de UI dat het log daardoor niet zichtbaar is.
- Valt het log binnen het filter, dan scrolt de lijst naar het nieuwe log.
- Caloriestatistieken voor de datum van het nieuwe log worden ongeldig gemaakt en bij een volgend bezoek opnieuw opgehaald.

## Acceptatiecriteria

### AC-01 - Routegebonden flow

Gegeven dat de gebruiker `Log toevoegen` kiest
Dan opent `/logs/new` op mobiel full-screen en op desktop als modal
En blijven datum en filter in de URL-context behouden.

### AC-02 - Gecombineerd zoeken

Gegeven dat geen zoekterm bestaat
Dan ziet de gebruiker recent geconsumeerde verpakkingen en gerechten gemengd op recentie.
Wanneer minimaal twee tekens zijn ingevoerd
Dan zoekt de UI op productnaam, merk en gerechtnaam
En staan de resultaten alfabetisch binnen hun typegroep.

### AC-03 - Nieuw gerecht aanmaken

Gegeven dat de zoekstap zichtbaar is
Dan staat `+ Nieuw gerecht aanmaken` altijd beschikbaar
En opent de actie `/logs/new/dish` met behoud van de datumcontext.

### AC-04 - Verpakking selecteren

Gegeven dat een product meerdere verpakkingen heeft
Dan verschijnt iedere actieve verpakking als afzonderlijk selecteerbaar resultaat
En kan het kale product niet zonder verpakking worden gekozen.

### AC-05 - Afgeleide eenheden

Gegeven dat een verpakking is geselecteerd
Dan toont de eenheidskeuze uitsluitend eenheden die uit die verpakking kunnen worden afgeleid
En wordt een expliciete portie of individueel stuk standaard geselecteerd wanneer die beschikbaar is
En blijft een reeds geldige eenheidskeuze behouden
En kan de gebruiker één positieve hoeveelheid met één eenheid opslaan.

Gegeven een pak met volledige inhoud `88 g` en een portie `wafel` van `4,9 g`
Wanneer de gebruiker `3 wafels` opslaat
Dan rekent de backend met `14,7 g`
En blijft `1 pak` onafhankelijk gelijk aan `88 g`.

### AC-06 - Gerecht loggen

Gegeven dat een gerecht is geselecteerd
Dan toont de flow één hoeveelheidsinvoer in porties zonder eenheidskeuze
En accepteert zij een decimale hoeveelheid groter dan nul, bijvoorbeeld `1,5 portie`
En pint de backend de nieuwste gerechtversie op create-moment
En telt het log mee onder het food-filter met consumptietype voeding.

### AC-07 - Niets gevonden

Gegeven dat zoeken geen actieve verpakking en geen gerecht oplevert
Dan toont de flow `Niets gevonden`
En blijft `+ Nieuw gerecht aanmaken` zichtbaar
En bestaat er geen productaanvraag- of vrije invoeractie.

### AC-08 - Retryveilig opslaan

Gegeven dat dezelfde create-aanvraag met hetzelfde clientgegenereerde log-ID door dubbel tikken of opnieuw proberen meerdere keren aankomt
Dan ontstaat maximaal één consumptielog, voor zowel product- als dish-logs.

### AC-09 - Terugkeer na gerecht aanmaken

Gegeven dat de gebruiker een nieuw gerecht heeft opgeslagen
Dan keert de flow direct terug naar de logstap met het nieuwe gerecht geselecteerd
En kan de gebruiker porties en tijdstip invullen zonder het gerecht opnieuw te zoeken.

### AC-10 - Filter behouden

Gegeven dat het actieve filter niet overeenkomt met het nieuwe logtype
Dan blijft het filter actief
En meldt de UI dat het log is toegevoegd maar niet zichtbaar is.
