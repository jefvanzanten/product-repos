# Specificatie - Gerecht aanmaken

## Status

- Onderdeel: Calorie Tracker > gerechten
- Route: `/logs/new/dish?date=YYYY-MM-DD`
- Status: concept
- Algemene spec: [calorie-tracker-specificatie.md](../calorie-tracker-specificatie.md)
- Gerelateerde specs: [log-toevoegen.md](../logs/log-toevoegen.md), [log-overzicht.md](../logs/log-overzicht.md)

## Doel

De gebruiker kan vanuit de log-toevoegen-flow een eigen gerecht samenstellen uit catalogusverpakkingen, het opslaan en daarna direct in porties loggen.

## Binnen scope

- Gerecht aanmaken met naam, aantal porties, minimaal één ingrediënt en een optionele afbeelding.
- Ingrediënten kiezen via de bestaande package-zoekregels en per ingrediënt één hoeveelheid met één invoermodus vastleggen.
- Na opslaan direct terugkeren naar de log-flow met het nieuwe gerecht geselecteerd.

## Buiten scope

- Bewerken en verwijderen van gerechten; de endpoints bestaan al, de UX hoort bij de toekomstige gerechten-app.
- Gerechten als ingrediënt van andere gerechten (nesting).
- Receptinvoer in vrije tekst of stappen.
- Ingrediënten buiten de catalogus.

## UI-specificatie

De responsive schermopbouw en veldpresentatie staan in [gerecht-aanmaken-ui-specificatie.md](./gerecht-aanmaken-ui-specificatie.md).

De flow is routegebonden op `/logs/new/dish?date=YYYY-MM-DD`, zodat verversen en browsernavigatie werken. De datum uit de logboekcontext wordt meegenomen en gebruikt voor de log die na het aanmaken volgt.

## Formulier

### Naam

- Verplicht, getrimd, niet leeg na trimmen.
- Case-insensitief uniek per gebruiker onder de niet-verwijderde gerechten.
- Een bestaande naam levert `409 DISH_ALREADY_EXISTS`; de UI toont een inline foutmelding bij het naamveld.

### Aantal porties

- Verplicht, decimaal getal groter dan nul.
- Dezelfde invoerregels als overige hoeveelheden: `0,5` en `0.5` worden geaccepteerd, de Nederlandstalige UI toont een komma.

### Ingrediënten

- Minimaal één ingrediënt; opslaan zonder ingrediënten is niet mogelijk.
- Ingrediënten worden gekozen via `GET /calorie-tracker/packages/search` met dezelfde zoekregels als log-toevoegen: alleen actieve verpakkingen.
- Per ingrediënt gelden dezelfde drie invoermodi en eenheidsregels als bij een productlog: `PACKAGE`, `INDIVIDUAL_UNIT` en `CONTENT_UNIT`, afgeleid uit de verpakking via het `input-units`-endpoint.
- Per ingrediënt is er exact één hoeveelheid en één invoermodus; samengestelde invoer bestaat niet.
- Een ingrediënt kan worden verwijderd uit de lijst zolang er minimaal één overblijft bij opslaan.
- Ingrediënten zonder macroprofiel zijn toegestaan en dragen stil niets bij aan de macro's per portie.

### Afbeelding

- Optioneel.
- Upload via het Calorie Tracker-eigen afbeeldingsendpoint: PNG, JPEG of WebP, maximaal 5 MB, server-side validatie.
- Een mislukte upload toont een foutmelding en blokkeert het opslaan niet; het gerecht wordt zonder afbeelding opgeslagen.
- Zonder afbeelding gebruiken zoekresultaten en logitems de placeholder.

## Opslaan

- De opslaanknop is tijdens de aanvraag uitgeschakeld.
- Dish- en versie-ID's zijn server-gegenereerd; dubbel opslaan wordt op UI-niveau voorkomen.
- Bij succes maakt de backend de stam en de eerste versie aan.
- Bij een tijdelijke netwerkfout blijft het formulier behouden en kan de gebruiker opnieuw proberen.

## Gedrag na succes

- De gebruiker keert direct terug naar de log-flow met het nieuwe gerecht geselecteerd.
- De logstap toont de portie-invoer en de datum- en tijdsinvoer; het gerecht hoeft niet opnieuw gezocht te worden.
- Na het loggen gelden de gedrag-na-succesregels van [log-toevoegen.md](../logs/log-toevoegen.md).

## Voedingswaarden

- De macro's per portie worden afgeleid en niet handmatig ingevoerd.
- De berekening volgt [calorie-tracker-domeinregels.md](../../../domein/calorie-tracker-domeinregels.md): som van de actuele ingrediëntbijdragen gedeeld door het aantal porties, afgerond pas bij presentatie.
- De UI toont geen waarschuwing voor ingrediënten zonder macroprofiel.

## Acceptatiecriteria

### AC-01 - Routegebonden formulier

Gegeven dat de gebruiker `+ Nieuw gerecht aanmaken` kiest
Dan opent `/logs/new/dish` met behoud van de datumcontext
En blijft het formulier na verversen bereikbaar op dezelfde route.

### AC-02 - Verplichte velden

Gegeven dat naam leeg is, het aantal porties niet groter dan nul is, of er geen ingrediënten zijn
Dan is opslaan niet mogelijk
En toont de UI de bijbehorende validatieproblemen.

### AC-03 - Unieke naam

Gegeven dat de gebruiker een naam invoert die al bestaat bij een ander niet-verwijderd gerecht van dezelfde gebruiker, ongeacht hoofdletters of witruimte rondom
Dan weigert de backend met `409 DISH_ALREADY_EXISTS`
En toont de UI een inline foutmelding bij het naamveld.

### AC-04 - Ingrediënten uit actieve verpakkingen

Gegeven dat de gebruiker een ingrediënt kiest
Dan toont de ingrediëntenkiezer uitsluitend actieve verpakkingen
En legt de gebruiker per ingrediënt één hoeveelheid met één invoermodus vast.

### AC-05 - Terugkeer naar de log-flow

Gegeven dat het gerecht succesvol is opgeslagen
Dan keert de flow terug naar de logstap met het nieuwe gerecht geselecteerd
En kan de gebruiker direct porties en tijdstip invullen en het gerecht loggen.

### AC-06 - Optionele afbeelding

Gegeven dat de gebruiker geen afbeelding uploadt
Dan wordt het gerecht zonder afbeelding opgeslagen
En tonen zoekresultaten en logitems de placeholder.

Gegeven dat een upload faalt
Dan toont de UI een foutmelding
En blijft opslaan zonder afbeelding mogelijk.
