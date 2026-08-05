# UI-specificatie — voorraad aanpassen

## Status

- Onderdeel: Inventory client
- Functionele specificatie: [voorraad-aanpassen-specificatie.md](./voorraad-aanpassen-specificatie.md)
- Voorraadlijst-UI: [voorraad-inzien-ui-specificatie.md](./voorraad-inzien-ui-specificatie.md)
- Status: gepland

## Doel

Dit document is de bron van waarheid voor de presentatie van voorraadmutatieacties op een uitgeklapte partijregel.

## Acties op een partijregel

Alle mutatieacties staan bij één concrete uitgeklapte partijregel en zijn alleen zichtbaar voor beheerders. De regel biedt:

- compacte acties `+` en `−` rond het actuele aantal;
- een actie om de exacte voorraadstand in te stellen;
- een actie om voorraad te verplaatsen;
- een actie om de houdbaarheidsdatum te wijzigen.

Tijdens een relatieve mutatie zijn `+` en `−` tijdelijk niet opnieuw bedienbaar. Een fout wordt zichtbaar bij de betreffende regel of mutatieflow getoond.

## Exacte voorraadstand

De flow toont minimaal:

```text
Huidige voorraad: 5
Nieuwe voorraad: [   ]
```

Bij een versieconflict blijft de actuele serverstand zichtbaar en krijgt de beheerder een gerichte herstelmelding.

## Verplaatsen

De verplaatsflow toont:

- het te verplaatsen aantal, standaard `1`;
- de bronlocatie als context;
- een actieve doelopbergplaats uit de locatieboom;
- een bevestigings- en annuleeractie.

De huidige locatie en gearchiveerde locaties zijn niet als geldige bestemming selecteerbaar.

## Datum wijzigen

De datumflow toont:

- het te wijzigen aantal, standaard `1`;
- de huidige houdbaarheidsdatum;
- een nieuwe kalenderdatum of de expliciete keuze `Geen datum`;
- een bevestigings- en annuleeractie.

## Gearchiveerde gegevens

Gearchiveerde catalogusdata toont het label `Gearchiveerd`. Voorraad op een gearchiveerde opbergplaats toont `Gearchiveerde locatie`. De beschikbare acties volgen de functionele beperkingen uit de functionele specificatie.
