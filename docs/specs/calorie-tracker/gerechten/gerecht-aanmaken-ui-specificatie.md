# UI-specificatie — Gerecht aanmaken

## Status

- Onderdeel: Calorie Tracker > gerechten
- Functionele specificatie: [gerecht-aanmaken.md](./gerecht-aanmaken.md)
- Status: concept

## Doel

Dit document is de bron van waarheid voor de responsive presentatie en schermopbouw van de routegebonden gerecht-aanmaakflow.

## Presentatie

De aanmaakflow deelt de presentatieregels van de log-toevoegen-flow:

- mobiel: full-screen modal of full-screen sheet;
- desktop: compacte modal;
- het bestaande logboek blijft als één gemounte achtergrondinstantie zichtbaar en is inert en niet bedienbaar.

Direct zichtbaar:

- titel `Gerecht aanmaken`;
- terug of annuleren naar de zoekstap;
- het formulier met naam, aantal porties, ingrediëntenlijst en afbeelding;
- primaire actie `Gerecht opslaan` onderaan.

## Veldpresentatie

### Naam

- Één tekstregel met label `Naam`.
- Inline foutmelding bij een bestaande naam.

### Aantal porties

- Eén numeriek veld met label `Aantal porties`.
- Dezelfde decimale invoer- en foutherstelregels als de hoeveelheidsinvoer van log-toevoegen.

### Ingrediënten

- Een sectiekop `Ingrediënten` met daaronder de lijst en de actie `+ Product toevoegen`.
- Iedere ingrediëntenrij toont minimaal: productnaam, eventueel merk, de gekozen hoeveelheid met eenheid, en een verwijderactie.
- Een ingrediëntenrij mag geen hoeveelheidsinvoer bevatten; de hoeveelheid wordt vastgelegd tijdens het kiezen.
- De ingrediëntenkiezer opent dezelfde zoek- en eenheidscomponenten als de log-toevoegen-flow en keert na selectie terug naar de ingrediëntenlijst.

Voorbeeld:

```text
Ingrediënten
Rundergehakt       500 g
Spaghetti          400 g
Tomatensaus        500 g

+ Product toevoegen
```

### Afbeelding

- Een optionele afbeeldingskiezer met placeholder-voorbeeld.
- Tijdens upload toont de kiezer een laadstatus; bij succes toont hij de gekozen afbeelding.
- Een mislukte upload toont een inline foutmelding zonder het formulier te blokkeren.

## Opslaanactie

- De primaire actie `Gerecht opslaan` is uitgeschakeld tijdens de aanvraag.
- Bij succes sluit de aanmaakstap en toont de logstap direct de portie-invoer voor het nieuwe gerecht.
- Bij een fout blijft het formulier behouden en toont de UI de foutmelding.
