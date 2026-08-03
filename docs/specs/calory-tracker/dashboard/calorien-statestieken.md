# Specificatie - Caloriestatistieken en doelen

## Status

- Onderdeel: Calorie Tracker > dashboard
- Route: `/?date=YYYY-MM-DD`
- Status: concept
- Algemene spec: [calory-tracker-specificatie.md](../calory-tracker-specificatie.md)

## Doel

De gebruiker ziet de calorie- en macrototalen van een geselecteerde kalenderdag en kan per waarde optioneel een persoonlijk dagdoel instellen.

## Binnen scope

- Calorie-inname van vandaag of een eerdere geselecteerde datum tonen.
- Eiwit, koolhydraten en vet van die geselecteerde datum tonen.
- De geselecteerde datum in de URL bewaren en bij navigatie naar het logboek behouden.
- Optionele doelen voor calorieën en iedere macro afzonderlijk instellen en wijzigen.
- Een doel als voortgang tonen en een waarde zonder doel als totaalkaart tonen.
- Totalen na logmutaties en, wanneer vandaag is geselecteerd, bij een nieuwe lokale dag verversen.
- Laad-, lege en fouttoestanden afhandelen.

## Buiten scope

- Verbrande of netto calorieën.
- Meerdaagse trends, week- of maandgrafieken.
- Micronutriënttotalen en -doelen.
- Automatisch berekende doelen op basis van lichaamsgegevens of activiteit.
- Een aparte instellingentab.
- Recente consumptielogs op het dashboard.

## Datum- en navigatiestate

De pagina gebruikt een expliciete datumparameter:

```text
/?date=2026-07-29
```

Regels:

- Zonder datum wordt vandaag in de browsertijdzone gekozen en wordt de canonieke URL met `replace` geschreven.
- Een ongeldige of toekomstige datum valt terug op vandaag en wordt met `replace` gecorrigeerd.
- De datumcontrol selecteert vandaag of een eerdere lokale kalenderdatum.
- De navbarlink naar het logboek neemt dezelfde datum mee en gebruikt daar het bestaande typefilter of `all`.
- De navbarlink terug naar Caloriestatistieken neemt de geselecteerde logboekdatum mee.

## Databron en berekening

- De backend levert één aggregaat voor de gevraagde lokale kalenderdatum. De requestbrowsertijdzone valideert of die datum vandaag of eerder is; ieder bestaand log wordt blijvend ingedeeld volgens zijn opgeslagen browsertijdzone.
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

1. aanklikbare geselecteerde datum;
2. calorietotaal;
3. eiwit;
4. koolhydraten;
5. vet;
6. actie `Doelen instellen` of `Doelen wijzigen`.

### Waarde zonder doel

Een waarde zonder doel verschijnt als totaalkaart, bijvoorbeeld:

```text
Calorieën
1.842 kcal op deze dag
```

```text
Eiwit
86,5 g op deze dag
```

### Waarde met doel

Een waarde met doel verschijnt als horizontaal afgeronde voortgangsbalk met minimaal:

- naam;
- huidige waarde;
- doel;
- eenheid;
- tekstuele voortgang of overschrijding;
- `role="progressbar"` met een toegankelijke naam, minimum, actuele waarde, maximum en tekstuele waardebeschrijving.

De balk toont het deel binnen het doel en, bij overschrijding, een afzonderlijk overschrijdingssegment. De visuele segmenten veranderen de tekstuele waarde of toegankelijke voortgangsinformatie niet.

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

Zonder doelen blijven alle dagtotalen zichtbaar. De actie `Doelen instellen` of `Doelen wijzigen` opent een compacte modal boven het statistiekenoverzicht. De URL verandert niet. De modal gebruikt op mobiel en desktop een scrim, houdt toetsenbordfocus binnen de modal en sluit via `Annuleren`, de sluitactie of `Escape` zonder wijzigingen op te slaan.

Het formulier in de modal:

- biedt per waarde `Doel gebruiken`;
- toont alleen een vereiste waarde wanneer het betreffende doel is ingeschakeld;
- gebruikt positieve gehele kcal voor calorieën;
- gebruikt positieve grammen met maximaal één decimaal voor macro's;
- staat toe dat alle doelen zijn uitgeschakeld;
- gebruikt expliciete acties `Opslaan` en `Annuleren`;
- wijzigt de statistieken pas na succesvol opslaan.

Na instellen verandert de actie in `Doelen wijzigen`. Wanneer een doel succesvol wordt opgeslagen en later wordt uitgeschakeld, blijft de laatst succesvol opgeslagen invoerwaarde binnen de actuele dashboardpagina beschikbaar. Bij opnieuw inschakelen wordt die waarde vooraf ingevuld, maar pas na opslaan weer actief.

Macrodoelen hoeven het caloriedoel niet exact te verklaren. De UI blokkeert en waarschuwt daar voorlopig niet voor.

## Geldigheid van doelen

- Doelen zijn actuele persoonlijke instellingen zonder historische versies.
- Het actuele doel wordt ook gebruikt wanneer een eerdere statistiekdatum wordt bekeken; er bestaat geen historische doelwaarde per dag.
- Een nieuw of gewijzigd doel geldt direct voor iedere daarna getoonde dagvergelijking.
- Een uitgeschakeld doel wordt als `null` opgeslagen en is daarna niet actief.

## Verversen en toestanden

- Na toevoegen, bewerken, verwijderen of herstellen van een log worden de betrokken dagtotalen opnieuw opgehaald.
- Wanneer vandaag is geselecteerd en het dashboard tijdens lokale middernacht openstaat, schakelt het automatisch naar de nieuwe dag, werkt het de URL bij en haalt het nieuwe totalen op.
- Een bewust geselecteerde eerdere datum verandert niet bij lokale middernacht.
- Tijdens laden toont iedere statistiekzone een stabiele laadstatus.
- Bij een fout blijft een begrijpelijke foutmelding met `Opnieuw proberen` zichtbaar.
- Het ontbreken van consumptielogs is geen fout; totalen zijn dan nul.

## Acceptatiecriteria

### AC-01 - Totalen van geselecteerde dag

Gegeven dat de gebruiker het dashboard zonder datum opent
Dan schrijft de pagina de huidige lokale kalenderdatum naar de URL
En toont zij calorieën, eiwit, koolhydraten en vet van die dag.

Gegeven dat de gebruiker een geldige eerdere datum kiest
Dan toont de pagina uitsluitend totalen van die geselecteerde lokale kalenderdag
En blijft die datum behouden bij navigatie naar het logboek.

### AC-02 - Geen doelen

Gegeven dat geen doelen actief zijn
Dan ziet de gebruiker voor iedere waarde een totaalkaart
En kan de gebruiker de modal openen via `Doelen instellen`.

### AC-03 - Optionele doelen

Gegeven dat alleen calorieën en eiwit een doel hebben
Dan verschijnen calorieën en eiwit als voortgangsindicator
En verschijnen koolhydraten en vet als totaalkaart zonder doel.

### AC-04 - Overschrijding

Gegeven dat een calorie- of macrodoel is overschreden
Dan toont de horizontale voortgangsbalk een afzonderlijk rood overschrijdingssegment
En blijft de overschrijding visueel zichtbaar
En toont de component een tekstuele hoeveelheid boven doel
En bevat de voortgangsbalk volledige `progressbar`-ARIA zonder uitsluitend op kleur te vertrouwen.

### AC-05 - Geen logs

Gegeven dat op de geselecteerde datum geen consumptielogs bestaan
Dan zijn actieve doelen zichtbaar met huidige waarde nul
En zijn waarden zonder doel zichtbaar als nul-totalen.

### AC-06 - Opslaan van doelen

Gegeven dat de gebruiker geldige optionele doelen invoert
Wanneer de gebruiker `Opslaan` kiest
Dan vervangen deze waarden de actuele doelen
En worden de bijbehorende componenten direct als voortgang getoond.

Gegeven dat een eerder succesvol opgeslagen doel binnen dezelfde geopende dashboardpagina wordt uitgeschakeld
Wanneer de gebruiker dat doel opnieuw inschakelt
Dan is de laatst succesvol opgeslagen invoerwaarde vooraf ingevuld
En wordt het doel pas na opnieuw opslaan actief.

### AC-07 - Catalogusdata doorrekenen

Gegeven dat actuele product- of verpakkingsdata verandert
Dan gebruikt een volgende aggregatie de actuele catalogusdata
En is geen snapshot- of synchronisatieactie nodig.

### AC-08 - Doelenmodal

Gegeven dat de gebruiker `Doelen instellen` of `Doelen wijzigen` kiest
Dan opent een compacte modal zonder routewijziging
En sluiten via annuleren of `Escape` bewaart geen conceptwijzigingen.

### AC-09 - Geen toekomstige statistiekdatum

Gegeven dat de gebruiker een statistiekdatum kiest
Dan kan geen toekomstige lokale kalenderdatum worden geselecteerd.
