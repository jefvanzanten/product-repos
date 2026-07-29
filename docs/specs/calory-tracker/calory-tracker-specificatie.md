# Spec-index - Calorie Tracker

Dit bestand is de algemene ingang voor de Calorie Tracker. Gedrag staat per feature in losse specificaties, zodat dashboard-, logboek- en mutatiegedrag niet door elkaar lopen.

## Doel

De Calorie Tracker laat een ingelogde gebruiker consumpties registreren en de calorie- en macrototalen van vandaag vergelijken met optionele persoonlijke doelen.

## Actuele specs

| Feature | Spec | Status |
| --- | --- | --- |
| Caloriestatistieken en doelen | [dashboard/macro-calorien-grafiek.md](./dashboard/macro-calorien-grafiek.md) | Concept |
| Consumptielogboek | [logs/log-overzicht.md](./logs/log-overzicht.md) | Concept |
| Consumptielog toevoegen | [logs/log-toevoegen.md](./logs/log-toevoegen.md) | Concept |
| Logdetail, bewerken en verwijderen | [logs/log-detail-bewerken.md](./logs/log-detail-bewerken.md) | Concept |

## Gebruikers en autorisatie

- De volledige Calorie Tracker vereist authenticatie.
- Iedere gebruiker ziet en beheert uitsluitend de eigen logs en doelen.
- Een beheerder beheert daarnaast de gedeelde productcatalogus, maar kan geen persoonlijke logs of doelen van andere gebruikers bekijken.
- Adminroutes en de admintab vereisen expliciet de beheerdersrol.
- Zelfregistratie valt voorlopig buiten scope.
- Voor testen bestaat een vooraf aangemaakt gastaccount zonder beheerdersrol.
- Het gastaccount wordt periodiek gereset en mag geen persoonlijke informatie bevatten, omdat meerdere testers dezelfde demodata kunnen zien.

## Navigatie en routes

De app gebruikt de [gedeelde applicatieshell met bottom-tabbar](../shared/bottom-tabbar-specificatie.md).

| Bestemming | Route | Zichtbaarheid |
| --- | --- | --- |
| Caloriestatistieken | `/` | Iedere ingelogde gebruiker |
| Consumptielogboek | `/logs?date=YYYY-MM-DD&type=all` | Iedere ingelogde gebruiker |
| Admin | `/admin/product-catalogus` | Alleen beheerders |

Er is voorlopig geen aparte instellingentab. Calorie- en macrodoelen worden vanuit Caloriestatistieken beheerd.

## Leidende domeinregels

- Een consumptielog hoort bij exact één gebruiker en één catalogusverpakking.
- De catalogus is de actuele bron van waarheid; logs bevatten geen product- of voedingssnapshot.
- Een log bewaart de oorspronkelijke hoeveelheid en gekozen invoereenheid. Afgeleide hoeveelheden en voedingswaarden worden met de actuele catalogusdata berekend.
- Correcties aan product-, verpakking- of voedingsdata werken daardoor bewust door in historische logs en statistieken.
- Producten en verpakkingen worden nooit definitief verwijderd. Ze kunnen alleen worden gearchiveerd en hersteld.
- Gearchiveerde producten blijven zichtbaar in bestaande logs, maar zijn niet selecteerbaar voor nieuwe logs.
- Consumptielogs wijzigen de voorraad niet automatisch.
- Daggrenzen volgen de ingestelde tijdzone van de gebruiker. Tijdstippen worden technisch in UTC met de gebruikte tijdzone opgeslagen.
- Toekomstige consumpties zijn niet toegestaan.

## Cataloguskoppeling

Alleen actieve catalogusproducten die beschikbaar zijn voor de Calorie Tracker verschijnen in productzoeken. Zo'n product heeft exact één consumptietype:

- voeding;
- drinken;
- supplement.

Een product heeft minimaal één verpakking. Zoekresultaten zijn selecteerbare verpakkingen en geen kale producten.

Een optioneel macroprofiel hoort bij het product en geldt voor alle compatibele verpakkingen. Producten zonder macroprofiel kunnen wel worden gelogd, maar dragen niet bij aan calorie- of macrototalen.

## Buiten scope

- Zelfregistratie.
- Barcodezoeken en barcodescannen.
- Volledig offline loggen en synchroniseren.
- Historische statistiekpagina's; Caloriestatistieken toont alleen vandaag.
- Automatische voorraadmutaties vanuit consumptielogs.
- Vrije producten of calorie-only logs buiten de catalogus.
- Een productaanvraagflow bij `Product niet gevonden`.
- Realtime synchronisatie via WebSockets of een vergelijkbare infrastructuur.

## Overkoepelende acceptatiecriteria

### AC-01 - Persoonlijke gegevensscheiding

Gegeven dat twee gebruikers bestaan
Dan kan iedere gebruiker uitsluitend de eigen logs en doelen openen of wijzigen
En geeft de beheerdersrol geen toegang tot persoonlijke caloriegegevens van anderen.

### AC-02 - Catalogus als bron van waarheid

Gegeven dat een beheerder voedings- of verpakkingsdata corrigeert
Dan gebruiken gekoppelde logs en statistieken de actuele catalogusdata
En blijft de oorspronkelijke consumptie-invoer van ieder log behouden.

### AC-03 - Archiveren

Gegeven dat een product of verpakking is gearchiveerd
Dan blijft deze zichtbaar in bestaande logs
En verschijnt deze niet in productzoeken voor een nieuw log.

### AC-04 - Tijdzone

Gegeven dat de gebruiker een tijdzone heeft ingesteld
Dan bepaalt de lokale kalenderdatum in die tijdzone bij welke dag een log hoort.
