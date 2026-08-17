# Specificatie - productdetail en verpakkingen (huidige v1-flow)

> De structurele bron van waarheid voor het doelmodel is [productmodel-v2-specificatie.md](./productmodel-v2-specificatie.md). Package-subroutes en root-productdetail hieronder worden gemigreerd naar één concreet productdetail met gedeelde `product_composition`-velden.

## Status

- Onderdeel: admin dashboard > productcatalogus
- Status: productdetail, consumptietype, macroprofiel, gescheiden bewerkflows en verpakkingsafbeeldingen geïmplementeerd; productafbeeldingen en archiveren zijn concept
- Hoort bij:
  - [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md)
  - [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md)
  - [product-archiveren-specificatie.md](./product-archiveren-specificatie.md)
- Backendcontract: `docs/backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md`
- Datamodel: `docs/backend/ERD/PRODUCT_ERD.md`

## Doel

Een beheerder kan een bestaand product openen, controleren en beheren. Productdetail is de centrale plek voor:

- productgegevens bekijken;
- productgegevens bewerken;
- verpakkingen van het product bekijken;
- een verpakking toevoegen;
- een verpakking openen en bewerken;
- afbeeldingen, consumptietype en voedingswaarden beheren;
- producten en verpakkingen archiveren of heractiveren.

## Routes

| Route | Doel |
| --- | --- |
| `/product-catalogus/:productId` | Productdetail |
| `/product-catalogus/:productId/verpakkingen/nieuw` | Verpakking toevoegen |
| `/product-catalogus/:productId/verpakkingen/:packageId` | Verpakking bewerken |

## Binnen scope

- Productdetail openen vanuit productrijen/kaarten in de catalogus.
- Productgegevens read-only tonen.
- Productgegevens bewerken via expliciete bewerkmodus.
- Categorie wijzigen.
- Merk wijzigen of leeg maken.
- Productnaam en optionele productafbeelding wijzigen.
- Consumptietype beheren.
- Een optioneel macroprofiel toevoegen, wijzigen of uitschakelen.
- Merk vanuit het merkveld aanmaken tijdens product bewerken.
- Categorie inline aanmaken vanuit product bewerken.
- Verpakkingenlijst tonen op productdetail.
- Verpakking toevoegen via aparte route/pagina.
- Verpakking direct bewerken via een aparte route/pagina, zonder tussenliggende read-only detailpagina.
- Per verpakking een optionele PNG-, JPEG- of WebP-afbeelding uploaden.
- Producten en verpakkingen archiveren en heractiveren.
- Impact tonen wanneer een correctie gekoppelde consumptielogs of voorraadregistraties beïnvloedt.
- Validatie- en duplicate-regels gelijk houden aan product aanmaken en eerste verpakking.

## Buiten scope

- Producten of verpakkingen definitief verwijderen.
- Inhoudelijke voorraad-, inventarisatie- of opslaglocatie-informatie tonen.
- Auditmetadata tonen, zoals aangemaakt op of laatst bijgewerkt.
- Nieuwe verpakkingstypes of inhoudseenheden beheren via UI.
- Aparte edit-route voor productgegevens.

## UI-specificatie

De read-only kaarten, breadcrumbs, verpakkingenlijst, responsive bewerkformulieren en niet-gevonden-toestanden staan in [product-detail-ui-specificatie.md](./product-detail-ui-specificatie.md).

Productdetail toont functioneel de productgegevens, het optionele macroprofiel en alle verpakkingen. De categorie-breadcrumb begint met `Alle categorieën`; ieder segment opent de overeenkomstige categoriecontext met behoud van een geldige `source`. Productgegevens en voedingswaarden hebben afzonderlijke afgeschermde bewerkmodi. Iedere verpakkingrij opent direct de eigen bewerkpagina en biedt geen tussenliggende read-only verpakkingdetailpagina.

De foto-uploadcomponent accepteert uitsluitend PNG, JPEG en WebP, toont vóór opslaan een lokale preview, ondersteunt verwijderen en hanteert een maximale bestandsgrootte van 5 MB. De server controleert de werkelijke bestandsinhoud en vertrouwt niet alleen op extensie of browser-MIME-type.

## Detailgegevens

Productdetail toont minimaal:

- categorie en volledig categoriepad;
- merk wanneer aanwezig;
- productnaam en afgeleide weergavenaam;
- actieve of gearchiveerde status;
- consumptietype;
- productafbeelding of fallback;
- het optionele macroprofiel met referentiebasis en alle bekende waarden;
- alle verpakkingen van het product.

Iedere verpakking toont minimaal:

- verpakkingsafbeelding of fallback;
- actieve of gearchiveerde status;
- verpakkingstype;
- volledige inhoud en inhoudseenheid;
- optionele portienaam, portiegrootte en aantal per verpakking;
- een bewerkactie die direct naar de verpakking-bewerkpagina gaat.

## Product bewerken

Productdetail schakelt op dezelfde pagina naar bewerkmodus. Er is geen aparte product-edit-route in MVP.

De productgegevens-bewerkmodus bevat uitsluitend categorie, productnaam, merk en consumptietype; voedingswaarden zijn daarin niet zichtbaar of wijzigbaar. De responsive kaart- en actieopbouw staat in de UI-specificatie.

De actie in de voedingswaardenkaart opent afzonderlijk `Voedingswaarden bewerken`. Alleen de optionele macroprofielschakelaar, referentiebasis en voedingswaarden zijn daar zichtbaar en wijzigbaar. Productgegevens en verpakkingen blijven bij deze mutatie ongewijzigd.

Verpakkingen worden niet in product-bewerkmodus bewerkt. Verpakkingen hebben eigen routes en acties.

### Validatie bij bewerken

Productgegevens bewerken gebruikt voor zijn eigen velden dezelfde regels als product aanmaken:

- ieder product heeft exact één consumptietype;
- een ontbrekende productafbeelding blokkeert opslaan niet;
- categorie is verplicht;
- productnaam is verplicht;
- merk is optioneel;
- merk en productnaam blijven gescheiden;
- duplicaat product wordt geblokkeerd op dezelfde categorie, hetzelfde merk en dezelfde genormaliseerde productnaam;
- bij bewerken telt het huidige product zelf niet als duplicaat.

Voedingswaarden bewerken gebruikt afzonderlijk de macroprofielregels:

- een ingeschakeld macroprofiel heeft een expliciete basis en minimaal één voedingswaarde groter dan nul;
- de macroprofielbasis blijft compatibel met alle verpakkingen;
- een automatisch berekende caloriewaarde wordt bij gewijzigde macro's opnieuw berekend;
- een handmatig gecorrigeerde caloriewaarde wordt bij gewijzigde macro's niet automatisch overschreven.

Bij validatiefouten:

- blijft de gebruiker in bewerkmodus;
- blijven ingevulde waarden behouden;
- verschijnen veldfouten onder de relevante velden;
- wordt er niets opgeslagen;
- vindt er geen redirect plaats.

Na succesvol opslaan:

- blijft de gebruiker op productdetail;
- keert de pagina terug naar read-only mode;
- toont de pagina de bijgewerkte gegevens.

## Verpakking toevoegen

`Verpakking toevoegen` opent een aparte pagina:

```text
/product-catalogus/:productId/verpakkingen/nieuw
```

Na succesvol toevoegen navigeert de gebruiker naar de bewerkpagina van de nieuwe verpakking.

## Verpakking bewerken

Verpakking bewerken gebruikt dezelfde velden en validatie als eerste verpakking bij product aanmaken:

- verpakkingstype verplicht;
- volledige inhoud en inhoudseenheid verplicht en consistent;
- een optionele portie heeft een vrije naam, verplichte portiegrootte en verplichte inhoudseenheid;
- het aantal porties of stuks is optioneel en, wanneer ingevuld, een positief geheel getal;
- volledige inhoud en portiegrootte hebben dezelfde dimensie;
- de som van porties is informatief en hoeft niet exact gelijk te zijn aan de volledige inhoud;
- een optionele PNG-, JPEG- of WebP-verpakkingsafbeelding van maximaal 5 MB;
- de verpakking blijft compatibel met een eventueel productmacroprofiel;
- dubbele verpakking onder hetzelfde product wordt geblokkeerd;
- bij bewerken telt de huidige verpakking zelf niet als duplicaat.

Bij validatiefouten:

- blijft de gebruiker op dezelfde pagina/formuliermodus;
- blijven ingevulde waarden behouden;
- verschijnen veldfouten onder de relevante velden;
- wordt er niets opgeslagen;
- vindt er geen redirect plaats.

Na succesvol bewerken:

- keert de gebruiker terug naar productdetail;
- toont de verpakkingrij de bijgewerkte verpakking en afbeelding.

## Cataloguscorrecties

De catalogus is de actuele bron van waarheid voor consumptielogs en voorraadregistraties. Gebruikte product- en verpakkingsdata mag worden gecorrigeerd, ook bij een typo of misclick.

Bij een wijziging aan consumptietype, verpakkingstype, volledige inhoud, portiegrootte, inhoudseenheid of aantal porties:

- werken de nieuwe waarden na opslaan direct door naar gekoppelde domeinen;
- wordt een wijziging geblokkeerd als deze niet compatibel is met het macroprofiel.

Er worden geen afhankelijkheidsaantallen opgehaald of getoond. Er wordt geen product- of voedingssnapshot in een consumptielog bijgewerkt, omdat logs actuele catalogusdata gebruiken.

## Archiveren en heractiveren

Productdetail en de verpakking-bewerkpagina tonen afhankelijk van de status een archiveer- of herstelactie. Producten en verpakkingen worden nooit definitief verwijderd. Alle regels voor archiveren, herstellen en selecteerbaarheid staan in [product-archiveren-specificatie.md](./product-archiveren-specificatie.md).

## Navigatie en fouttoestanden

Op een bestaand productdetail vervalt de afzonderlijke link `Terug naar productcatalogus`. De interactieve categorie-breadcrumb onder de productnaam is de navigatie terug naar de catalogus. `Alle categorieën` opent de catalogusroot en een categorienaam opent die categorie in de categorieboom.

De verpakking-bewerkpagina heeft een zichtbare terugactie naar het product. Verpakking toevoegen en verpakking bewerken bewaren de product- en cataloguscontext waar dat logisch is, zodat de beheerder via productdetail terug kan naar dezelfde geopende categorie of merkcontext.

Bij een onbekend product of een onbekende verpakking toont de pagina de bijbehorende niet-gevonden-toestand uit de UI-specificatie met een relevante terugactie.

## Backend/API

Het HTTP-contract staat in `docs/backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md` en beschrijft:

```text
GET /products/:productId
PATCH /products/:productId
GET /products/:productId/packages/:packageId
POST /products/:productId/packages
PATCH /products/:productId/packages/:packageId
POST /products/:productId/packages/:packageId/image
DELETE /products/:productId/packages/:packageId/image
GET /package-images/:fileName
POST /products/:productId/archive
POST /products/:productId/restore
POST /products/:productId/packages/:packageId/archive
POST /products/:productId/packages/:packageId/restore
```

Het contract bevat de DTO's voor consumptietype, macroprofiel, rekenbare eenheden, volledige verpakkingsinhoud, optionele portiedefinities, archivering en foutcodes.

## Acceptatiecriteria

### AC-01 - Productdetail openen

Gegeven dat een product bestaat  
Wanneer de beheerder een productrij in de catalogus opent  
Dan opent `/product-catalogus/:productId`  
En ziet de beheerder productgegevens en verpakkingen  
En ziet de beheerder onder de productnaam een klikbare categorie-breadcrumb met `Alle categorieën` en het categoriepad  
En opent elke categorielink de catalogus met die categorie geopend in de categorieboom
En toont productdetail geen afzonderlijke link `Terug naar productcatalogus`.

### AC-02 - Product bewerken

Gegeven dat een productdetail geopend is  
Wanneer de beheerder `Productgegevens bewerken` kiest
Dan schakelt de pagina naar de afgeschermde productgegevens-bewerkmodus
En kan de beheerder categorie, merk, productnaam en consumptietype aanpassen

En kan die bewerkmodus geen voedingswaarden of verpakkingen wijzigen.

### AC-03 - Product bewerken opslaan

Gegeven dat de bewerkte productgegevens geldig zijn  
Wanneer de beheerder opslaat  
Dan blijft de beheerder op productdetail  
En ziet de beheerder de bijgewerkte read-only gegevens.

### AC-04 - Verpakkingenlijst tonen

Gegeven dat een product verpakkingen heeft  
Wanneer de beheerder productdetail opent  
Dan ziet de beheerder alle verpakkingen in een aparte lijst  
En staat in iedere verpakkingrij de actie `Verpakking bewerken`.

### AC-05 - Verpakking toevoegen

Gegeven dat de beheerder productdetail geopend heeft  
Wanneer de beheerder `Verpakking toevoegen` kiest  
Dan opent de aparte verpakking-aanmaakpagina voor dat product.

### AC-06 - Verpakking bewerken

Gegeven dat productdetail geopend is
Wanneer de beheerder `Verpakking bewerken` in een verpakkingrij kiest
Dan opent direct de verpakking-bewerkpagina

En kan de beheerder ook de optionele afbeelding van deze specifieke verpakking wijzigen

En gelden dezelfde validatieregels als bij eerste verpakking.

### AC-07 - Geen definitief verwijderen

Gegeven dat productdetail of de verpakking-bewerkpagina geopend is

Dan toont de UI geen actie om catalogusdata definitief te verwijderen
En toont zij afhankelijk van de status een archiveer- of herstelactie.

### AC-08 - Macroprofiel beheren

Gegeven dat productdetail geopend is
Wanneer de beheerder de actie in de voedingswaardenkaart kiest
Dan opent de afgeschermde voedingswaarden-bewerkmodus
En kan de beheerder een optioneel macroprofiel toevoegen, wijzigen of uitschakelen
En kunnen productgegevens en verpakkingen vanuit die modus niet worden gewijzigd
En blijft het profiel gekoppeld aan het product in plaats van een verpakking.

### AC-09 - Afbeeldingsfallback

Gegeven dat een verpakking een eigen afbeelding heeft
Dan toont productdetail die verpakkingsafbeelding.

Gegeven dat een verpakking geen eigen afbeelding heeft
Dan toont productdetail een vaste placeholder.

### AC-10 - Cataloguscorrectie

Gegeven dat een product- of verpakkingswijziging logs of voorraadregistraties beïnvloedt
Dan gebruikt ieder gekoppeld domein na opslaan de gecorrigeerde catalogusdata
En worden geen afhankelijkheidsaantallen vereist.

### AC-11 - Portie naast volledige inhoud beheren

Gegeven dat een verpakking een volledige inhoud en een portiedefinitie heeft
Wanneer de beheerder de verpakking-bewerkpagina opent
Dan blijven volledige inhoud, portienaam, portiegrootte en optioneel aantal afzonderlijk zichtbaar en wijzigbaar
En vervangt portiegrootte nooit de volledige verpakkingsinhoud.
