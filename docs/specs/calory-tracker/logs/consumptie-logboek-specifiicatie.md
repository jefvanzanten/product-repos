# Calorie Tracker — Consumptielogs

## 1. Doel

De pagina **Consumptielogs** geeft de gebruiker snel inzicht in alle consumpties die op een geselecteerde dag zijn geregistreerd.

De gebruiker kan:

- De logs van vandaag bekijken.
- Logs van een andere datum bekijken.
- Logs filteren op consumptietype.
- Een bestaande log openen, bewerken of verwijderen.
- Een nieuwe consumptielog toevoegen.

Calorie- en voedingstotalen van de volledige dag vallen buiten deze pagina. Deze worden op het caloriedashboard getoond.

---

## 2. Standaardweergave

Wanneer de gebruiker de pagina opent zonder datum- of filterparameters:

- Is de huidige datum geselecteerd.
- Is het filter **Alles** actief.
- Worden alle logs van vandaag getoond.
- Staan de logs chronologisch van vroeg naar laat.

---

## 3. URL-state

De geselecteerde datum en het actieve filter worden in de URL opgeslagen.

Voorbeeld:

```text
/logs?date=2026-07-29&type=all
```

Mogelijke filterwaarden:

```text
all
food
drink
supplement
```

Hierdoor blijven datum en filter behouden bij:

- Het openen en sluiten van een logdetail.
- Het toevoegen of bewerken van een log.
- Het verversen van de pagina.
- Het gebruiken van de terug- en vooruitknoppen van de browser.
- Het delen of rechtstreeks openen van de URL.

Wanneer de gebruiker van datum wisselt, blijft het actieve filter behouden.

---

## 4. Datumnavigatie

De geselecteerde datum is altijd zichtbaar en aanklikbaar.

Klikken of tikken op de datum opent een date picker waarmee de gebruiker een andere datum kan selecteren.

De gebruiker moet vanuit de datumselectie met één actie terug kunnen gaan naar vandaag.

### Voorkeursoplossing

De date picker bevat een actie **Vandaag**.

### Alternatieve oplossing

Wanneer de gebruikte date-pickerlibrary geen Vandaag-actie ondersteunt, wordt naast de datumselectie een losse knop **Vandaag** getoond.

De Vandaag-actie vervangt de datumselectie niet.

Optioneel kunnen knoppen voor de vorige en volgende dag worden toegevoegd. Deze zijn snelkoppelingen en vervangen de date picker niet.

---

## 5. Filters

De filters worden direct als zichtbare filterchips weergegeven.

Beschikbare filters:

- Alles
- Voeding
- Drinken
- Supplementen

Een verborgen filtermenu is niet nodig zolang alleen deze vier opties bestaan.

### Filtergedrag

- Standaard is **Alles** actief.
- Er kan maximaal één typefilter tegelijk actief zijn.
- Het actieve filter heeft een duidelijke geselecteerde staat.
- Het actieve filter wordt in de URL opgeslagen.
- Het filter blijft actief wanneer de gebruiker van datum wisselt.
- De lijst wordt direct bijgewerkt wanneer een ander filter wordt gekozen.

Op smalle schermen mogen de filterchips horizontaal scrollbaar zijn.

---

## 6. Aantal logs

De pagina toont het aantal logs dat binnen de huidige selectie zichtbaar is.

Voorbeelden:

```text
12 logs
5 voedingslogs
2 supplementen
```

Zonder actief typefilter wordt het totale aantal logs van de geselecteerde datum getoond.

Met een actief typefilter wordt alleen het aantal logs binnen dat filter getoond.

Er worden op deze pagina geen totalen voor calorieën, macro’s of micronutriënten getoond.

---

## 7. Loglijst

De logs worden in een verticaal scrollbare lijst weergegeven.

Alle logs van de geselecteerde dag worden direct geladen. Er wordt geen paginering of infinite scrolling toegepast.

De lijst wordt niet gegroepeerd op vaste eetmomenten zoals ontbijt, lunch of diner.

### Sortering

Logs worden gesorteerd op de geregistreerde tijd:

- Oudste log bovenaan.
- Nieuwste log onderaan.

Iedere log toont de geregistreerde tijd.

Voorbeeld:

```text
08:42 — Havermout
13:15 — Vitamine D
```

---

## 8. Inhoud van een logitem

Een logitem blijft compact en toont alleen informatie die relevant is voor het betreffende consumptietype.

### Algemene informatie

Ieder logitem toont minimaal:

- Geregistreerde tijd.
- Productnaam.
- Consumptietype.
- Relevante hoeveelheid of dosering.

### Voeding

Een voedingslog kan tonen:

- Productnaam.
- Hoeveelheid of portie.
- Calorieën.
- Macro’s.

### Drinken

Een drinklog kan tonen:

- Productnaam.
- Hoeveelheid of volume.
- Calorieën, wanneer van toepassing.
- Macro’s, wanneer beschikbaar.

### Supplementen

Een supplementlog kan tonen:

- Productnaam.
- Dosering.
- Eenheid of aantal.

Bij supplementen worden geen lege calorie- of macrovelden getoond.

---

## 9. Typelabels

Ieder logitem krijgt een zichtbaar typelabel:

- Voeding
- Drinken
- Supplement

Ieder type krijgt een vaste, herkenbare kleur.

Het tekstlabel blijft altijd zichtbaar. Het type mag niet uitsluitend door kleur worden gecommuniceerd.

De definitieve kleuren vallen buiten deze specificatie.

---

## 10. Logdetails

Bij het selecteren van een log wordt een aparte detailweergave geopend.

De lijst zelf bevat geen inline uitklappers voor volledige voedingsdetails.

De detailweergave toont:

- Alle beschikbare voedingsinformatie.
- Productgegevens die bij de log horen.
- Geregistreerde hoeveelheid of dosering.
- Datum en tijd.
- Het consumptietype.
- Acties voor bewerken en verwijderen.

Of deze detailweergave technisch als pagina, full-screen modal of andere weergave wordt gebouwd, hoeft in deze specificatie nog niet te worden bepaald.

---

## 11. Log bewerken

Een log wordt vanuit de detailweergave bewerkt.

De gebruiker kan onder andere corrigeren:

- Datum.
- Tijd.
- Hoeveelheid.
- Portie.
- Dosering.
- Andere bewerkbare consumptiegegevens.

Inline bewerken vanuit de overzichtslijst wordt niet ondersteund.

Na het opslaan keert de gebruiker terug naar dezelfde datum en hetzelfde filter.

---

## 12. Log verwijderen

Een log kan vanuit de detailweergave worden verwijderd.

Verwijderen moet worden beschermd tegen onbedoelde acties door middel van:

- Een bevestiging; of
- Een tijdelijke actie **Ongedaan maken**.

Na verwijderen wordt de lijst en het getoonde aantal logs bijgewerkt.

---

## 13. Actie ‘Log toevoegen’

De pagina bevat een primaire actie **Log toevoegen**.

### Mobiel

Op mobiel wordt een vaste, brede knop direct boven de bottom tab bar geplaatst.

Voorbeeld:

```text
[ + Log toevoegen ]
[    bottom tab bar    ]
```

De knop:

- Blijft tijdens het scrollen bereikbaar.
- Mag geen logitems bedekken.
- Vereist voldoende onderruimte onder de laatste log.

De actie wordt niet als extra floating action button boven de bottom tab bar geplaatst.

De actie wordt ook niet als tab in de bottom tab bar geplaatst, omdat het een pagina-actie is en geen navigatiebestemming.

### Desktop

Op desktop kan **Log toevoegen** als primaire knop in de paginaheader worden geplaatst.

---

## 14. Nieuwe log toevoegen

Op mobiel wordt het toevoegformulier als een full-screen modal of full-screen sheet geopend.

Een kleine modal of compacte bottom sheet is niet geschikt, omdat het formulier afhankelijk van het geselecteerde product aanvullende informatie kan bevatten.

### Direct zichtbare velden

Bij het openen van het formulier zijn direct zichtbaar:

- Productzoekbalk.
- Datum.
- Tijd.
- Actie om het formulier te sluiten of annuleren.

De geselecteerde datum uit de Consumptielogs wordt vooraf ingevuld.

Datum en tijd blijven aanpasbaar.

### Product zoeken

De gebruiker zoekt naar een bestaand product uit de productdatabase.

De zoekopdracht doorzoekt producten van alle ondersteunde typen:

- Voeding.
- Drinken.
- Supplementen.

De gebruiker kiest het type niet handmatig.

Het consumptietype wordt bepaald door het geselecteerde product en komt uit de backend.

---

## 15. Contextafhankelijke invoervelden

Na het selecteren van een product worden alleen de velden getoond die voor dat product en consumptietype relevant zijn.

Voorbeelden:

### Voeding

- Hoeveelheid.
- Portie.
- Eenheid.

### Drinken

- Hoeveelheid.
- Volume-eenheid.

### Supplementen

- Dosering.
- Eenheid.
- Aantal.

Algemene velden zoals datum en tijd blijven altijd zichtbaar.

---

## 16. Productgebonden voedingsinformatie

Calorieën, macro’s en micronutriënten zijn gekoppeld aan het product in de database.

De gebruiker voert deze waarden niet opnieuw in bij het maken van een consumptielog.

Bij het aanpassen van de hoeveelheid, portie of dosering worden de relevante voedingswaarden op basis van de productgegevens berekend.

Het formulier registreert voornamelijk de consumptiecontext:

- Welk product.
- Welke hoeveelheid of dosering.
- Welke datum.
- Welk tijdstip.

---

## 17. Compact formulier

Het toevoegformulier toont standaard alleen de velden die nodig zijn om snel een log aan te maken.

Aanvullende, optionele invoervelden worden verborgen achter een actie zoals:

```text
Meer opties
```

of:

```text
Aanvullende gegevens
```

Een actie om extra velden te tonen heeft de voorkeur boven een toggle, omdat de gebruiker hiermee geen instelling aan- of uitzet maar aanvullende invoer opent.

De reeds beschikbare productdata hoeft niet volledig als invoervelden in het formulier te worden herhaald.

---

## 18. Product niet gevonden

Een consumptielog kan alleen worden aangemaakt op basis van een product dat al in de productdatabase bestaat.

De gebruiker kan vanuit deze flow geen vrij product of calorie-only log aanmaken.

Wanneer een product niet wordt gevonden:

- Kan de consumptielog niet worden opgeslagen.
- Moet het product eerst via het admin-dashboard worden toegevoegd.
- Kan daarna opnieuw naar het product worden gezocht.

Het toevoegen en beheren van producten valt buiten de Consumptielogs-pagina.

---

## 19. Gedrag na toevoegen

Na het succesvol toevoegen van een log:

- Keert de gebruiker terug naar de geselecteerde datum.
- Blijft het actieve filter behouden.
- Wordt de nieuwe log op de juiste positie in de chronologische lijst geplaatst.
- Wordt het aantal zichtbare logs bijgewerkt.
- Wordt een succesbevestiging getoond.

Wanneer de nieuwe log niet binnen het actieve filter valt:

- Blijft het huidige filter actief.
- Wordt niet automatisch naar **Alles** geschakeld.
- Kan worden aangegeven dat de log is toegevoegd maar door het actieve filter niet zichtbaar is.

---

## 20. Lege staten

### Geen logs op de geselecteerde datum

Wanneer er geen logs bestaan voor de geselecteerde datum, wordt een lege staat getoond.

De primaire actie **Log toevoegen** blijft bereikbaar.

### Geen resultaten binnen het filter

Wanneer er op de geselecteerde datum wel logs bestaan, maar niet binnen het actieve filter, wordt duidelijk gemaakt dat het filter geen resultaten oplevert.

De gebruiker kan vanuit deze staat terugschakelen naar **Alles**.

---

## 21. Laad- en foutstaten

### Laden

Tijdens het ophalen van de logs wordt een laadstatus getoond.

### Fout bij laden

Wanneer de logs niet kunnen worden opgehaald:

- Wordt een foutmelding getoond.
- Kan de gebruiker het laden opnieuw proberen.

### Datum of filter wijzigen tijdens laden

Wanneer de gebruiker tijdens het laden van datum of filter wisselt, mogen resultaten van een eerdere aanvraag niet in de nieuwe lijst worden geplaatst.

---

## 22. Buiten scope

De volgende onderdelen vallen buiten deze specificatie:

- Calorie- en macrodoelen.
- Dagtotalen voor calorieën of voedingswaarden.
- De inhoud van het caloriedashboard.
- Producten aanmaken of beheren.
- De verdere uitwerking van het admin-dashboard.
- De definitieve volgorde van de bottom-navigationtabs.
- De definitieve kleuren van typelabels.
- De precieze technische implementatie van de date picker.
- De precieze technische vorm van de logdetailweergave.

---

## 23. Acceptatiecriteria

1. De pagina opent standaard op de huidige datum wanneer geen URL-parameters bestaan.
2. De gebruiker kan via de date picker een andere datum selecteren.
3. De gebruiker kan met één actie teruggaan naar vandaag.
4. De geselecteerde datum wordt in de URL opgeslagen.
5. De gebruiker kan filteren op Alles, Voeding, Drinken of Supplementen.
6. Het actieve filter wordt in de URL opgeslagen.
7. Het actieve filter blijft behouden bij een datumwissel.
8. De pagina toont het aantal logs dat binnen de huidige datum en het actieve filter valt.
9. De pagina toont geen calorie-, macro- of micronutriënttotalen van de dag.
10. Alle logs van de geselecteerde dag worden zonder paginering geladen.
11. Logs worden chronologisch van vroeg naar laat weergegeven.
12. Ieder log toont de geregistreerde tijd.
13. Ieder log toont een tekstueel en gekleurd typelabel.
14. Logitems tonen alleen relevante informatie en geen lege voedingsvelden.
15. Het selecteren van een log opent een aparte detailweergave.
16. Een log kan vanuit de detailweergave worden bewerkt.
17. Een log kan vanuit de detailweergave worden verwijderd.
18. De actie **Log toevoegen** blijft op mobiel bereikbaar boven de bottom tab bar.
19. Het toevoegformulier toont direct de productzoekbalk, datum en tijd.
20. Het consumptietype wordt bepaald door het geselecteerde databaseproduct.
21. Alleen relevante, contextafhankelijke velden worden na productselectie getoond.
22. Voedingswaarden worden uit de productdatabase overgenomen.
23. Een consumptielog kan alleen op basis van een bestaand product worden aangemaakt.
24. Na toevoegen of bewerken blijven de geselecteerde datum en het actieve filter behouden.
25. Lege resultaten, laadstatussen en laadfouten worden correct afgehandeld.
