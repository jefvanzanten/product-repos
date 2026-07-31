# Spec-index - Calorie Tracker

Dit bestand is de algemene ingang voor de Calorie Tracker. Gedrag staat per feature in losse specificaties, zodat dashboard-, logboek- en mutatiegedrag niet door elkaar lopen.

## Doel

De Calorie Tracker laat een ingelogde gebruiker consumpties registreren en de calorie- en macrototalen van vandaag of een eerdere geselecteerde dag vergelijken met optionele persoonlijke doelen.

## Actuele specs

| Feature | Spec | Status |
| --- | --- | --- |
| Caloriestatistieken en doelen | [dashboard/calorien-statestieken.md](./dashboard/calorien-statestieken.md) | Concept |
| Consumptielogboek | [logs/log-overzicht.md](./logs/log-overzicht.md) | Concept |
| Consumptielog toevoegen | [logs/log-toevoegen.md](./logs/log-toevoegen.md) | Concept |
| Logdetail, bewerken en verwijderen | [logs/log-detail-bewerken.md](./logs/log-detail-bewerken.md) | Concept |

## Onderliggende documenten

- [Calorie Tracker domeinregels](../../domein/calorie-tracker-domeinregels.md)
- [Productcatalogus domeinregels](../../domein/productcatalogus-domeinregels.md)
- [Calorie Tracker endpoints](../../backend/Endpoints/CALORY_TRACKER_ENDPOINTS.md)
- [Calorie Tracker ERD](../../backend/ERD/CALORY_TRACKER_ERD.md)
- [Product ERD](../../backend/ERD/PRODUCT_ERD.md)

## Gebruikers en autorisatie

- De volledige Calorie Tracker vereist authenticatie.
- Iedere gebruiker ziet en beheert uitsluitend de eigen logs en doelen.
- Een beheerder kan daarnaast vanuit de Calorie Tracker naar de zelfstandig gedeployde Product Management Admin navigeren, maar kan geen persoonlijke logs of doelen van andere gebruikers bekijken.
- De link naar Product Management Admin en de adminapp zelf vereisen expliciet de beheerdersrol.
- De Calorie Tracker bevat geen inhoudelijke adminroutes.
- Zelfregistratie valt voorlopig buiten scope.
- Voor testen bestaat een vooraf aangemaakt gastaccount zonder beheerdersrol.
- Het gastaccount wordt periodiek gereset en mag geen persoonlijke informatie bevatten, omdat meerdere testers dezelfde demodata kunnen zien.

## Navigatie en routes

De app gebruikt de [gedeelde applicatieshell met bottom-tabbar](../shared/bottom-tabbar-specificatie.md).

De React Router-routes van deze app worden in productie onder het publieke basispad `/calory-tracker` gemount.

| Bestemming | App-interne route | Publieke bestemming | Zichtbaarheid |
| --- | --- | --- | --- |
| Caloriestatistieken | `/?date=YYYY-MM-DD` | `/calory-tracker?date=YYYY-MM-DD` | Iedere ingelogde gebruiker |
| Consumptielogboek | `/logs?date=YYYY-MM-DD&type=all` | `/calory-tracker/logs?date=YYYY-MM-DD&type=all` | Iedere ingelogde gebruiker |
| Product Management Admin | niet van toepassing | `/product-management-admin/product-catalogus?source=calory-tracker` | Alleen beheerders |

Caloriestatistieken en Consumptielogboek delen de geselecteerde `date`-context. Navigatie via de Calorie Tracker-navbar neemt deze datum in beide richtingen mee; het typefilter bestaat alleen in het logboek.

De adminbestemming is een gewone browserlink naar een andere deployment. Product Management Admin gebruikt `source=calory-tracker` om in zijn bottom-tabbar een terugkeertab naar `/calory-tracker` te tonen. De regels voor bronbehoud staan in de [gedeelde bottom-tabbar- en applicatieshellspecificatie](../shared/bottom-tabbar-specificatie.md).

Er is voorlopig geen aparte instellingentab. Calorie- en macrodoelen worden vanuit Caloriestatistieken in een compacte modal beheerd, zonder eigen route.

## Leidende domeinregels

- Een consumptielog hoort bij exact één gebruiker en één catalogusverpakking.
- De catalogus is de actuele bron van waarheid; logs bevatten geen product- of voedingssnapshot.
- Een log bewaart de oorspronkelijke hoeveelheid en gekozen invoereenheid. Afgeleide hoeveelheden en voedingswaarden worden met de actuele catalogusdata berekend.
- Correcties aan product-, verpakking- of voedingsdata werken daardoor bewust door in historische logs en statistieken.
- Producten en verpakkingen worden nooit definitief verwijderd. Ze kunnen alleen worden gearchiveerd en hersteld.
- Gearchiveerde producten blijven zichtbaar in bestaande logs, maar zijn niet selecteerbaar voor nieuwe logs.
- Consumptielogs wijzigen de voorraad niet automatisch.
- Daggrenzen volgen de browsertijdzone die de client meestuurt. Tijdstippen worden technisch in UTC met de gebruikte browsertijdzone opgeslagen.
- Toekomstige consumpties zijn niet toegestaan.

## Cataloguskoppeling

Alleen actieve catalogusproducten met een actieve verpakking verschijnen in productzoeken. Ieder product heeft exact één consumptietype:

- voeding;
- drinken;
- supplement.

Archivering bepaalt of een product of verpakking selecteerbaar is; er is geen aparte Calorie Tracker-beschikbaarheidsvlag. Een product heeft minimaal één verpakking. Zoekresultaten zijn selecteerbare verpakkingen en geen kale producten.

Een optioneel macroprofiel hoort bij het product en geldt voor alle compatibele verpakkingen. Producten zonder macroprofiel kunnen wel worden gelogd, maar dragen niet bij aan calorie- of macrototalen.

## Buiten scope

- Zelfregistratie.
- Barcodezoeken en barcodescannen.
- Volledig offline loggen en synchroniseren.
- Meerdaagse statistiektrends, week- en maandgrafieken; Caloriestatistieken toont één geselecteerde kalenderdag per keer.
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

Gegeven dat de client een geldige browsertijdzone meestuurt
Dan bepaalt de lokale kalenderdatum in die tijdzone bij welke dag een nieuw of gewijzigd log hoort
En bewaart het log de gebruikte tijdzone.

### AC-05 - Zelfstandige adminnavigatie

Gegeven dat een ingelogde beheerder de Calorie Tracker gebruikt
Wanneer die Product Management Admin opent
Dan verlaat de browser de Calorie Tracker-deployment
En opent `/product-management-admin/product-catalogus?source=calory-tracker`
En bevat de Calorie Tracker zelf geen inhoudelijke adminroute.

### AC-06 - Gedeelde datumcontext

Gegeven dat de gebruiker in Caloriestatistieken of het Consumptielogboek een datum heeft geselecteerd
Wanneer die via de Calorie Tracker-navbar naar het andere onderdeel navigeert
Dan blijft dezelfde datum in de doel-URL behouden.
