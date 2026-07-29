# Specificatie - Caloriestatistieken en doelen

## Status

- Onderdeel: Calorie Tracker > dashboard
- Route: `/`
- Status: concept
- Algemene spec: [calory-tracker-specificatie.md](../calory-tracker-specificatie.md)

## Doel

De gebruiker ziet de calorie- en macrototalen van vandaag en kan per waarde optioneel een persoonlijk dagdoel instellen.

## Binnen scope

- Calorie-inname van vandaag tonen.
- Eiwit, koolhydraten en vet van vandaag tonen.
- Optionele doelen voor calorieën en iedere macro afzonderlijk instellen en wijzigen.
- Een doel als voortgang tonen en een waarde zonder doel als totaalkaart tonen.
- Totalen na logmutaties en bij een nieuwe lokale dag verversen.
- Laad-, lege en fouttoestanden afhandelen.

## Buiten scope

- Verbrande of netto calorieën.
- Historische dagen bekijken.
- Micronutriënttotalen en -doelen.
- Automatisch berekende doelen op basis van lichaamsgegevens of activiteit.
- Een aparte instellingentab.
- Recente consumptielogs op het dashboard.

## Databron en berekening

- De backend levert één aggregaat voor vandaag in de tijdzone van de gebruiker.
- De frontend haalt niet alle logs op om zelf dagtotalen te berekenen.
- Alleen aanwezige calorie- en macrowaarden dragen bij aan hun betreffende totaal.
- Een log zonder macroprofiel draagt nergens aan bij en veroorzaakt geen waarschuwing of ontbrekende-data-aantal.
- Een gedeeltelijk macroprofiel draagt alleen bij met de beschikbare waarden.
- Expliciet opgeslagen calorieën zijn leidend.
- Wanneer calorieën ontbreken, mogen ze alleen automatisch worden berekend als eiwit, koolhydraten en vet alle drie aanwezig zijn.
- Interne berekeningen behouden hogere precisie. De UI toont calorieën als gehele kcal en macro's met maximaal één decimaal.
- Dagtotalen worden pas na optellen afgerond.

## Layout

Het dashboard rendert binnen de [gedeelde applicatieshell met bottom-tabbar](../../shared/bottom-tabbar-specificatie.md).

De visuele volgorde is:

1. calorietotaal;
2. eiwit;
3. koolhydraten;
4. vet;
5. actie `Doelen instellen` of `Doelen wijzigen`.

### Waarde zonder doel

Een waarde zonder doel verschijnt als totaalkaart, bijvoorbeeld:

```text
Calorieën
1.842 kcal vandaag
```

```text
Eiwit
86,5 g vandaag
```

### Waarde met doel

Een waarde met doel verschijnt als ronde voortgangsindicator met minimaal:

- naam;
- huidige waarde;
- doel;
- eenheid;
- tekstuele voortgang of overschrijding.

Ook zonder consumptielogs blijft een ingesteld doel zichtbaar met een huidige waarde van nul.

Wanneer een doel wordt overschreden:

- blijft het overschrijdende gedeelte zichtbaar;
- krijgt alleen dat gedeelte een waarschuwende rode tint;
- toont de component tekst zoals `125 kcal boven doel` of `12 g boven doel`;
- communiceert de UI de toestand nooit uitsluitend met kleur.

## Doelen instellen en wijzigen

Ieder doel is afzonderlijk optioneel:

- calorieën;
- eiwit;
- koolhydraten;
- vet.

Zonder doelen blijven alle dagtotalen zichtbaar. De actie `Doelen instellen` opent een compact inline formulier zonder het overzicht permanent te verbergen.

Het formulier:

- biedt per waarde `Doel gebruiken`;
- toont alleen een vereiste waarde wanneer het betreffende doel is ingeschakeld;
- gebruikt positieve gehele kcal voor calorieën;
- gebruikt positieve grammen met maximaal één decimaal voor macro's;
- staat toe dat alle doelen zijn uitgeschakeld;
- gebruikt expliciete acties `Opslaan` en `Annuleren`;
- wijzigt de statistieken pas na succesvol opslaan.

Na instellen verandert de actie in `Doelen wijzigen`. Bij opnieuw inschakelen van een eerder gebruikt doel wordt de laatste waarde vooraf ingevuld, maar pas na opslaan actief.

Macrodoelen hoeven het caloriedoel niet exact te verklaren. De UI blokkeert en waarschuwt daar voorlopig niet voor.

## Geldigheid van doelen

- Doelen gelden per lokale kalenderdag.
- Een nieuw of gewijzigd doel geldt voor de volledige huidige dag, ook wanneer het later op die dag is opgeslagen.
- Doelen worden met een ingangsdatum geversioneerd, zodat een toekomstige historische weergave het destijds geldende doel kan reconstrueren.
- Een uitgeschakeld doel blijft historisch bewaard, maar is vanaf de nieuwe ingangsdatum niet actief.

## Verversen en toestanden

- Na toevoegen, bewerken of verwijderen van een log worden de dagtotalen opnieuw opgehaald.
- Wanneer het dashboard tijdens lokale middernacht openstaat, schakelt het automatisch naar de nieuwe dag en haalt het nieuwe totalen op.
- Tijdens laden toont iedere statistiekzone een stabiele laadstatus.
- Bij een fout blijft een begrijpelijke foutmelding met `Opnieuw proberen` zichtbaar.
- Het ontbreken van consumptielogs is geen fout; totalen zijn dan nul.

## Acceptatiecriteria

### AC-01 - Totalen van vandaag

Gegeven dat de gebruiker het dashboard opent  
Dan toont de pagina uitsluitend totalen van de huidige lokale kalenderdag
En ziet de gebruiker calorieën, eiwit, koolhydraten en vet.

### AC-02 - Geen doelen

Gegeven dat geen doelen actief zijn
Dan ziet de gebruiker voor iedere waarde een totaalkaart
En kan de gebruiker het inline formulier openen via `Doelen instellen`.

### AC-03 - Optionele doelen

Gegeven dat alleen calorieën en eiwit een doel hebben
Dan verschijnen calorieën en eiwit als voortgangsindicator
En verschijnen koolhydraten en vet als totaalkaart zonder doel.

### AC-04 - Overschrijding

Gegeven dat een calorie- of macrodoel is overschreden
Dan blijft de overschrijding visueel zichtbaar
En toont de component een tekstuele hoeveelheid boven doel.

### AC-05 - Geen logs

Gegeven dat vandaag geen consumptielogs bestaan
Dan zijn actieve doelen zichtbaar met huidige waarde nul
En zijn waarden zonder doel zichtbaar als nul-totalen.

### AC-06 - Opslaan van doelen

Gegeven dat de gebruiker geldige optionele doelen invoert
Wanneer de gebruiker `Opslaan` kiest
Dan gelden de doelen voor de volledige huidige lokale dag
En worden de bijbehorende componenten direct als voortgang getoond.

### AC-07 - Catalogusdata doorrekenen

Gegeven dat actuele product- of verpakkingsdata verandert
Dan gebruikt een volgende aggregatie de actuele catalogusdata
En is geen snapshot- of synchronisatieactie nodig.
