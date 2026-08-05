# UI-specificatie — Caloriestatistieken en doelen

## Status

- Onderdeel: Calorie Tracker > dashboard
- Functionele specificatie: [calorien-statestieken.md](./calorien-statestieken.md)
- Gedeelde shell: [bottom-tabbar-ui-specificatie.md](../../shared/bottom-tabbar-ui-specificatie.md)
- Status: concept

## Doel

Dit document is de bron van waarheid voor de presentatie van dagtotalen, doelen en de doelenmodal.

## Schermopbouw

Het dashboard rendert binnen de gedeelde applicatieshell. De visuele volgorde is:

1. aanklikbare geselecteerde datum;
2. calorietotaal;
3. eiwit;
4. koolhydraten;
5. vet;
6. actie `Doelen instellen` of `Doelen wijzigen`.

## Waarde zonder doel

Een waarde zonder doel verschijnt als totaalkaart, bijvoorbeeld:

```text
Calorieën
1.842 kcal op deze dag
```

```text
Eiwit
86,5 g op deze dag
```

## Waarde met doel

Een waarde met doel verschijnt als horizontaal afgeronde voortgangsbalk met minimaal:

- naam;
- huidige waarde;
- doel;
- eenheid;
- tekstuele voortgang of overschrijding.

De balk toont het deel binnen het doel en, bij overschrijding, een afzonderlijk overschrijdingssegment. Alleen het overschrijdende gedeelte krijgt een waarschuwende rode tint. De component toont daarnaast tekst zoals `125 kcal boven doel` of `12 g boven doel`, zodat de toestand niet uitsluitend met kleur wordt gecommuniceerd.

Ook zonder consumptielogs blijft een ingesteld doel zichtbaar met een huidige waarde van nul.

## Doelenmodal

De actie `Doelen instellen` of `Doelen wijzigen` opent een compacte modal boven het statistiekenoverzicht. De modal gebruikt op mobiel en desktop een scrim en toont expliciete acties `Opslaan` en `Annuleren`.
