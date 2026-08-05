# Specificatie — voorraad inzien

## Status

- Onderdeel: inventory client
- Route: `/`
- Status: gepland / huidige pagina is nog placeholderachtig

## Doel

Een gebruiker kan in de inventory client snel zien welke voorraad er is, hoeveel ervan aanwezig is, hoe lang die nog houdbaar is en waar die ligt.

## Rollen

- Iedere ingelogde gebruiker kan de voorraad inzien en doorzoeken.
- Alleen een ingelogde beheerder kan voorraad toevoegen of aanpassen. Mutatie-UI is uitsluitend voor beheerders zichtbaar en de bijbehorende backendendpoints weigeren niet-beheerders zelfstandig.
- Voorraad is gedeeld: alle ingelogde gebruikers zien dezelfde voorraad. Er is geen voorraad per gebruiker of huishouden.

## Binnen scope

- Voorraadlijst tonen op de inventory-tab.
- Productnaam, merk en verpakking herkenbaar tonen.
- Totaal aantal verpakkingen per productverpakking tonen.
- Uitklapbare partijregels per opbergplaats en houdbaarheidsdatum.
- Houdbaarheidsstatuslabels tonen.
- Zoeken binnen voorraad met gegroepeerde suggesties.
- Infinite scroll voor grote voorraden.
- Actie om voorraad toe te voegen openen via een knop op deze pagina (alleen beheerders).

## Buiten scope

- Catalogusstamdata of opbergplaatsen beheren.
- Voorraadmutaties zelf; die staan in [voorraad-aanpassen-specificatie.md](./voorraad-aanpassen-specificatie.md).
- Mutatiegeschiedenis in de UI.
- Uitgebreide rapportages.
- Barcode-scanning, tenzij later expliciet gespecificeerd.

## Domeinmodel

- Voorraad wordt geregistreerd als een **geheel aantal gekozen verpakkingen**. `3` bij `Melk — pak 1 liter` betekent drie pakken van één liter; decimalen en inhoudseenheden worden niet gebruikt.
- Een voorraadpartij wordt uniek bepaald door de combinatie **productverpakking + opbergplaats + houdbaarheidsdatum**. `Geen datum` is een eigen waarde.
- Dezelfde combinatie wordt samengevoegd tot één partij met opgeteld aantal. Een andere datum of een andere locatie is een afzonderlijke partij.
- De houdbaarheidsdatum is optioneel en wordt bewaard als kalenderdatum (`YYYY-MM-DD`) zonder tijdstip of tijdzone.
- Opbergplaats is altijd verplicht. Zonder opbergplaats kan geen voorraad bestaan; locatiebeheer is de verantwoordelijkheid van de beheerder in Product Management Admin.
- Opbergplaatsen vormen een boom van concrete fysieke plaatsen. Namen zoals `Lade 1` mogen onder meerdere ouders voorkomen, maar iedere fysieke plaats heeft een eigen ID. Voorraad mag op ieder knooppunt in de boom liggen.
- Naam-, hiërarchie- en archiefregels staan in [opbergplaatsen-domeinregels.md](../../domein/opbergplaatsen-domeinregels.md).
- Verschillende verpakkingen van hetzelfde product zijn afzonderlijke voorraadregels en worden niet naar inhoud of naar elkaar omgerekend.
- Het persistente datamodel staat in het [Storage/Inventory ERD](../../backend/ERD/STORAGE_ERD.md).

## UI-specificatie

De schermopbouw, productregels en uitgeklapte partijregels staan in [voorraad-inzien-ui-specificatie.md](./voorraad-inzien-ui-specificatie.md).

De lijst is productgericht, niet locatiegericht. De locatieboom wordt uitsluitend gebruikt bij het kiezen van een opbergplaats. Mutatieacties zijn alleen voor beheerders beschikbaar op concrete partijregels; hun gedrag staat in [voorraad-aanpassen-specificatie.md](./voorraad-aanpassen-specificatie.md). De toevoegactie opent de flow uit [voorraad-toevoegen-bottom-sheet-specificatie.md](./voorraad-toevoegen-bottom-sheet-specificatie.md) zonder een nieuwe pagina te openen.

## Sortering

- Productregels worden gesorteerd op de vroegste bekende houdbaarheidsdatum van hun partijen.
- Verlopen partijen komen volledig bovenaan.
- Binnen een uitgeklapt product staan partijen van vroeg naar laat.
- Producten zonder enige datum komen onderaan, alfabetisch op productnaam.

## Houdbaarheidsstatuslabels

Statussen worden berekend ten opzichte van de kalenderdatum in de applicatietijdzone (configureerbaar, standaard `Europe/Amsterdam`), zodat alle gebruikers van de gedeelde voorraad dezelfde status zien:

| Situatie | Label |
| --- | --- |
| Verlopen | rood label, bijvoorbeeld `3 dagen verlopen` |
| Verloopt vandaag | rood label `Verloopt vandaag` |
| Verloopt binnen 7 dagen | oranje label, bijvoorbeeld `Nog 4 dagen` |
| Verloopt later | neutraal met de concrete datum |
| Geen datum | `Geen datum` |

Verlopen voorraad wordt nooit automatisch verwijderd of op `0` gezet; alleen de beheerder past de voorraad aan.

## Zoeken

- Zoeken start vanaf twee ingevoerde tekens en is server-side.
- De vrije zoektekst matcht op productnaam, merk, verpakkingsomschrijving, categoriepad en het volledige locatiepad.
- Het consumptietype (`FOOD`, `DRINK`, `SUPPLEMENT`) speelt geen rol in het zoeken; het categoriepad is de enige taxonomie.
- Er zijn geen aparte filters en geen combinatie van meerdere suggesties: één gekozen suggestie of één vrije zoekterm tegelijk.
- Vanaf twee tekens verschijnen gegroepeerde suggesties: producten/verpakkingen, categorieën, merken en opbergplaatsen.
- Een gekozen suggestie gebruikt een stabiel ID en filtert exact op die betekenis: de categorie `Sauzen` omvat ook subcategorieën; een gekozen opbergplaats toont alleen voorraad op die plaats.
- Zoekterm of gekozen suggestie, laadpositie en scrollpositie worden hersteld wanneer de gebruiker terugkeert naar de lijst.

## Infinite scroll en paginering

- De lijst laadt server-side in pagina's van circa 30 productgroepen.
- Er is geen `Meer laden`-knop; nieuwe pagina's laden automatisch via een scroll-observer vóór het einde van de lijst.
- Er is een laadindicator tijdens het laden en een duidelijke eindstatus wanneer alles geladen is.
- Het laden van de eerste pagina toont bij mislukken een foutstate met een nieuwe poging.

## Lege toestand

Gegeven dat er geen voorraadpartijen bestaan, toont de pagina een lege toestand. Een beheerder kan vanuit de lege toestand voorraad toevoegen; een gewone gebruiker ziet alleen de lege toestand.

## Acceptatiecriteria

### AC-01 — Voorraadlijst tonen

Gegeven dat er voorraadpartijen bestaan  
Wanneer de gebruiker de inventory-tab opent  
Dan ziet de gebruiker een productgerichte lijst met productnaam, merk, verpakking, totaal aantal verpakkingen en vroegste houdbaarheidsstatus.

### AC-02 — Partijen uitklappen

Gegeven dat een product partijen over meerdere locaties of datums heeft  
Wanneer de gebruiker de productregel uitklapt  
Dan ziet de gebruiker afzonderlijke partijregels met volledig locatiepad, datum of statuslabel en aantal.

### AC-03 — Lege voorraad

Gegeven dat er nog geen voorraadpartijen bestaan  
Wanneer de gebruiker de inventory-tab opent  
Dan ziet de gebruiker een lege toestand  
En kan een beheerder voorraad toevoegen.

### AC-04 — Toevoegen openen

Gegeven dat een beheerder op de inventory-tab staat  
Wanneer de beheerder de toevoegknop kiest  
Dan opent de voorraad-toevoegen-bottomsheet.

### AC-05 — Read-only voor gewone gebruikers

Gegeven dat een ingelogde gebruiker geen beheerder is  
Dan ziet de gebruiker geen mutatieacties en geen toevoegknop  
En weigeren de voorraadmutatie-endpoints deze gebruiker zelfstandig.

### AC-06 — Zoeken

Gegeven dat de gebruiker minimaal twee tekens invoert in het zoekveld  
Dan toont de app gegroepeerde suggesties voor producten, categorieën, merken en opbergplaatsen  
En filtert de lijst na keuze exact op de gekozen betekenis.

### AC-07 — Verlopen voorraad

Gegeven dat een partij is verlopen  
Dan blijft die partij zichtbaar met een rood label dat het aantal verlopen dagen toont  
En wordt de partij niet automatisch verwijderd of op nul gezet.
