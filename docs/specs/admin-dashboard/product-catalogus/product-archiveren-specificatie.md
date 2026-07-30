# Specificatie - producten en verpakkingen archiveren

## Status

- Onderdeel: admin dashboard > productcatalogus
- Status: concept
- Gerelateerde specs:
  - [product-detail-specificatie.md](./product-detail-specificatie.md)
  - [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md)
  - [product-zoeken-specificatie.md](./product-zoeken-specificatie.md)

## Doel

Een beheerder kan producten en verpakkingen uit actief gebruik halen zonder relaties met consumptielogs of voorraadregistraties te verbreken.

## Leidende regel

Producten en verpakkingen worden nooit definitief verwijderd. Zij kunnen alleen worden gearchiveerd en later worden hersteld.

## Binnen scope

- Een product archiveren en heractiveren.
- Een afzonderlijke verpakking archiveren en heractiveren.
- Gearchiveerde data uit normale zoek- en browsestates verbergen.
- Gearchiveerde data via een expliciet statusfilter terugvinden.
- Archiveren en heractiveren zonder relaties met logs of voorraadregistraties te verbreken.

## Buiten scope

- Producten of verpakkingen hard verwijderen.
- Consumptielogs of voorraadregistraties cascade-verwijderen.
- Een bewaartermijn voor gearchiveerde catalogusdata.

## Status en zoekbaarheid

De catalogus kent minimaal deze statussen:

- `Actief`;
- `Gearchiveerd`.

Standaard tonen browsen en zoeken alleen actieve producten en verpakkingen. De beheerder kan via een expliciet statusfilter `Gearchiveerd` openen.

Gearchiveerde producten en verpakkingen:

- blijven bereikbaar via hun bestaande detailroute;
- tonen een zichtbaar statuslabel;
- blijven beschikbaar voor bestaande consumptielogs en voorraadregistraties;
- verschijnen niet als keuze voor nieuwe consumptielogs of nieuwe voorraadregistraties;
- kunnen niet als recente keuze in de Calorie Tracker verschijnen.

## Product archiveren

Productdetail bevat bij een actief product de actie `Product archiveren`.

Voor opslaan toont de UI een eenvoudige bevestiging met:

- productnaam;
- uitleg dat alle verpakkingen uit actieve zoekresultaten verdwijnen.

Archiveren maakt het product en alle onderliggende verpakkingen niet-selecteerbaar. De eigen status van iedere verpakking blijft bewaard, zodat heractiveren van het product alleen verpakkingen terugbrengt die vóór productarchivering actief waren.

## Product heractiveren

Bij een gearchiveerd product toont productdetail `Product heractiveren`.

Na heractiveren:

- is het product opnieuw zichtbaar in actieve catalogusstates;
- worden alleen verpakkingen met een eigen actieve status opnieuw selecteerbaar;
- blijven afzonderlijk gearchiveerde verpakkingen gearchiveerd.

## Verpakking archiveren en heractiveren

Verpakkingdetail bevat afhankelijk van de status:

- `Verpakking archiveren`; of
- `Verpakking heractiveren`.

Voor archiveren mag de UI een eenvoudige bevestiging tonen. Bestaande relaties blijven werken.

Een verpakking kan alleen actief selecteerbaar worden wanneer ook het bovenliggende product actief is. Heractiveren onder een gearchiveerd product herstelt daarom alleen de eigen verpakkingsstatus; de verpakking blijft buiten actieve zoekresultaten totdat het product is hersteld.

## Gearchiveerde data beheren

De productcatalogus biedt een zichtbaar statusfilter:

```text
[ Actief ] [ Gearchiveerd ]
```

In de status `Gearchiveerd`:

- toont browsen uitsluitend gearchiveerde producten binnen de gekozen context;
- zoekt het cataloguszoekveld uitsluitend binnen gearchiveerde producten wanneer dat filter actief is;
- toont ieder resultaat het label `Gearchiveerd`;
- opent een resultaat het normale productdetail met herstelactie.

## Cataloguscorrecties

Een beheerder mag gebruikte product- en verpakkingsdata corrigeren, ook wanneer logs of voorraadregistraties bestaan.

Bij wijzigingen aan bijvoorbeeld:

- consumptietype;
- verpakkingstype;
- inhoudseenheid;
- inhoudshoeveelheid;
- aantal per verpakking;

gebruiken gekoppelde domeinen na opslaan direct de gecorrigeerde catalogusdata. De backend haalt geen afhankelijkheidsaantallen op. Een wijziging die niet compatibel is met het macroprofiel wordt geblokkeerd.

## Acceptatiecriteria

### AC-01 - Geen hard delete

Gegeven dat een product of verpakking bestaat
Dan biedt het admin-dashboard geen actie om deze definitief te verwijderen.

### AC-02 - Product archiveren

Gegeven dat een actief product bestaat
Wanneer de beheerder archiveren bevestigt
Dan verdwijnen het product en zijn verpakkingen uit actieve zoek- en keuzestates
En blijven bestaande logs en voorraadrelaties geldig.

### AC-03 - Heractiveren

Gegeven dat een product is gearchiveerd
Wanneer de beheerder het heractiveert
Dan wordt het product opnieuw actief
En worden alleen eerder actieve verpakkingen opnieuw selecteerbaar.

### AC-04 - Verpakking afzonderlijk archiveren

Gegeven dat één verpakking wordt gearchiveerd
Dan blijven het product en andere actieve verpakkingen beschikbaar
En blijft de gearchiveerde verpakking zichtbaar in bestaande relaties.

### AC-05 - Gearchiveerde data terugvinden

Gegeven dat het statusfilter `Gearchiveerd` actief is
Dan kan de beheerder gearchiveerde producten vinden en hun detail openen.

### AC-06 - Correctie zonder afhankelijkheidsaantallen

Gegeven dat een correctie gekoppelde logs of voorraadregistraties beïnvloedt
Dan gebruikt ieder gekoppeld domein na opslaan de gecorrigeerde catalogusdata
En wordt een incompatibele wijziging geblokkeerd.
