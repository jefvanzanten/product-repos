# Specificatie - productdetail en verpakkingen

## Status

- Onderdeel: admin dashboard > productcatalogus
- Status: geimplementeerd
- Hoort bij:
  - [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md)
  - [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md)
- Backendcontract: `docs/backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md`
- Datamodel: `docs/backend/ERD/PRODUCT_ERD.md`

## Doel

Een beheerder kan een bestaand product openen, controleren en beheren. Productdetail is de centrale plek voor:

- productgegevens bekijken;
- productgegevens bewerken;
- verpakkingen van het product bekijken;
- een verpakking toevoegen;
- een verpakking openen en bewerken.

## Routes

| Route | Doel |
| --- | --- |
| `/admin/product-catalogus/:productId` | Productdetail |
| `/admin/product-catalogus/:productId/verpakkingen/nieuw` | Verpakking toevoegen |
| `/admin/product-catalogus/:productId/verpakkingen/:packageId` | Verpakkingdetail |

## Binnen scope

- Productdetail openen vanuit productrijen/kaarten in de catalogus.
- Productgegevens read-only tonen.
- Productgegevens bewerken via expliciete bewerkmodus.
- Categorie wijzigen.
- Merk wijzigen of leeg maken.
- Productnaam wijzigen.
- Merk vanuit het merkveld aanmaken tijdens product bewerken.
- Categorie inline aanmaken vanuit product bewerken.
- Verpakkingenlijst tonen op productdetail.
- Verpakking toevoegen via aparte route/pagina.
- Verpakkingdetail bekijken via aparte route/pagina.
- Verpakking bewerken via expliciete bewerkmodus.
- Validatie- en duplicate-regels gelijk houden aan product aanmaken en eerste verpakking.

## Buiten scope

- Product verwijderen.
- Product archiveren of heractiveren.
- Verpakking verwijderen.
- Verpakking archiveren of heractiveren.
- Voorraad-, inventarisatie- of opslaglocatie-informatie tonen.
- Auditmetadata tonen, zoals aangemaakt op of laatst bijgewerkt.
- Nieuwe verpakkingstypes, inhoudseenheden of eenheidsoorten beheren via UI.
- Aparte edit-route voor productgegevens.

## Layout

### Productdetail - read-only

#### Header

De header toont:

- weergavenaam als titel;
- interactieve categorie-breadcrumb onder de titel.

Voorbeeld:

```text
Coca-Cola Zero Sugar
Alle categorieën > Voeding > Dranken > Frisdrank > Cola
```

Regels:

- De breadcrumb begint met `Alle categorieën`.
- `Alle categorieën` linkt naar `/admin/product-catalogus` zonder queryparameters.
- Elke categorie in de breadcrumb is afzonderlijk klikbaar en opent `/admin/product-catalogus?categoryId=<categoryId>`.
- Ook de huidige productcategorie is klikbaar.
- Wanneer de beheerder via een categorielink teruggaat naar de catalogus, opent de catalogus de categorieboom met alle parentcategorieën uitgeklapt tot en met die categorie.
- De productgegevenssectie mag de categorie daarnaast als volledig tekstpad tonen.

#### Productgegevens

De productgegevenssectie toont:

```text
Productgegevens
Categorie: Voeding > Dranken > Frisdrank > Cola
Merk: Coca-Cola
Productnaam: Zero Sugar
Weergavenaam: Coca-Cola Zero Sugar
```

Bij merkloos product:

```text
Productgegevens
Categorie: Voeding > Snoep & chocolade > Chocolade
Merk: -
Productnaam: Chocoladevlokken
Weergavenaam: Chocoladevlokken
```

Product bewerken start met een potlood-icoon of editknop met toegankelijk label `Product bewerken`.

Bewerkmodus toont:

- categorie;
- merk, inclusief leeg maken;
- productnaam;
- `Opslaan`;
- `Annuleren`.

### Verpakkingenlijst op productdetail

Productdetail toont een aparte sectie `Verpakkingen` onder de productgegevens.

Elke verpakkingrij toont minimaal:

- verpakkingstype;
- inhoudshoeveelheid + inhoudseenheid, indien aanwezig;
- aantal per verpakking;
- eenheidsoort wanneer relevant;
- een duidelijke samenvatting;
- link/tap naar verpakkingdetail.

Voorbeelden:

```text
fles 1,5 l
```

```text
multipack 6 x blik 330 ml
```

Bij meerdere verpakkingen worden alle verpakkingen in deze lijst getoond. De actie `Verpakking toevoegen` staat bij deze sectie.

Als een product door oude of corrupte data geen verpakkingen heeft, toont de pagina:

```text
Geen verpakkingen gevonden voor dit product.
[ Verpakking toevoegen ]
```

### Verpakkingdetail - read-only

Verpakkingdetail is eerst read-only. Bewerken start via een potlood-icoon of editknop met toegankelijk label `Verpakking bewerken`.

Read-only toont minimaal:

```text
Verpakking
Type: fles
Inhoud: 1,5 l
Aantal per verpakking: 1
Eenheidsoort: fles
Samenvatting: fles 1,5 l
```

Bij multipack:

```text
Verpakking
Type: multipack
Inhoud: 330 ml
Aantal per verpakking: 6
Eenheidsoort: blik
Samenvatting: multipack 6 x blik 330 ml
```

## Product bewerken

Productdetail schakelt op dezelfde pagina naar bewerkmodus. Er is geen aparte product-edit-route in MVP.

Verpakkingen worden niet in product-bewerkmodus bewerkt. Verpakkingen hebben eigen routes en acties.

### Validatie bij product bewerken

Product bewerken gebruikt dezelfde regels als product aanmaken:

- categorie is verplicht;
- productnaam is verplicht;
- merk is optioneel;
- merk en productnaam blijven gescheiden;
- duplicaat product wordt geblokkeerd op dezelfde categorie, hetzelfde merk en dezelfde genormaliseerde productnaam;
- bij bewerken telt het huidige product zelf niet als duplicaat.

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
/admin/product-catalogus/:productId/verpakkingen/nieuw
```

Na succesvol toevoegen navigeert de gebruiker naar verpakkingdetail van de nieuwe verpakking.

## Verpakking bewerken

Verpakking bewerken gebruikt dezelfde velden en validatie als eerste verpakking bij product aanmaken:

- verpakkingstype verplicht;
- inhoud en inhoudseenheid consistent;
- aantal per verpakking verplicht, standaard `1` bij toevoegen;
- eenheidsoort verplicht wanneer relevant;
- dubbele verpakking onder hetzelfde product wordt geblokkeerd;
- bij bewerken telt de huidige verpakking zelf niet als duplicaat.

Bij validatiefouten:

- blijft de gebruiker op dezelfde pagina/formuliermodus;
- blijven ingevulde waarden behouden;
- verschijnen veldfouten onder de relevante velden;
- wordt er niets opgeslagen;
- vindt er geen redirect plaats.

Na succesvol bewerken:

- blijft de gebruiker op verpakkingdetail;
- keert de pagina terug naar read-only mode;
- toont de pagina de bijgewerkte verpakking.

## Navigatie en fouttoestanden

Productdetail heeft een zichtbare link:

```text
Terug naar productcatalogus
```

Wanneer productdetail is geopend vanuit een categorie- of merkcontext, brengt `Terug naar productcatalogus` de beheerder terug naar dezelfde browsecontext.

Verpakkingdetail heeft een zichtbare link:

```text
Terug naar product
```

Verpakking toevoegen, verpakkingdetail en verpakking bewerken bewaren de product- en cataloguscontext waar dat logisch is, zodat de beheerder via productdetail terug kan naar dezelfde geopende categorie of merkcontext.

Bij onbekend product toont productdetail binnen de admin-layout:

```text
Product niet gevonden.
[ Terug naar productcatalogus ]
```

Bij verpakkingdetail:

- product niet gevonden:

```text
Product niet gevonden.
[ Terug naar productcatalogus ]
```

- verpakking niet gevonden binnen bestaand product:

```text
Verpakking niet gevonden.
[ Terug naar product ]
```

## Backend/API - nog te specificeren

Deze feature vereist aparte endpoint- en DTO-keuzes. Waarschijnlijke API-vorm:

```text
GET /products/:productId
PATCH /products/:productId
GET /products/:productId/packages/:packageId
POST /products/:productId/packages
PATCH /products/:productId/packages/:packageId
```

Nog te bepalen:

- exacte response DTO voor productdetail;
- exacte response DTO voor verpakkingdetail;
- exacte patch-request DTO's;
- foutcodes voor niet gevonden product/verpakking;
- duplicate-foutcodes voor product en verpakking.

## Acceptatiecriteria

### AC-01 - Productdetail openen

Gegeven dat een product bestaat  
Wanneer de beheerder een productrij in de catalogus opent  
Dan opent `/admin/product-catalogus/:productId`  
En ziet de beheerder productgegevens en verpakkingen  
En ziet de beheerder onder de productnaam een klikbare categorie-breadcrumb met `Alle categorieën` en het categoriepad  
En opent elke categorielink de catalogus met die categorie geopend in de categorieboom.

### AC-02 - Product bewerken

Gegeven dat een productdetail geopend is  
Wanneer de beheerder `Product bewerken` kiest  
Dan schakelt de pagina naar bewerkmodus  
En kan de beheerder categorie, merk en productnaam aanpassen.

### AC-03 - Product bewerken opslaan

Gegeven dat de bewerkte productgegevens geldig zijn  
Wanneer de beheerder opslaat  
Dan blijft de beheerder op productdetail  
En ziet de beheerder de bijgewerkte read-only gegevens.

### AC-04 - Verpakkingenlijst tonen

Gegeven dat een product verpakkingen heeft  
Wanneer de beheerder productdetail opent  
Dan ziet de beheerder alle verpakkingen in een aparte lijst  
En kan elke verpakking worden geopend.

### AC-05 - Verpakking toevoegen

Gegeven dat de beheerder productdetail geopend heeft  
Wanneer de beheerder `Verpakking toevoegen` kiest  
Dan opent de aparte verpakking-aanmaakpagina voor dat product.

### AC-06 - Verpakking bewerken

Gegeven dat verpakkingdetail geopend is  
Wanneer de beheerder `Verpakking bewerken` kiest  
Dan schakelt de pagina naar bewerkmodus  
En gelden dezelfde validatieregels als bij eerste verpakking.

### AC-07 - Geen verwijderen of archiveren

Gegeven dat productdetail of verpakkingdetail geopend is  
Dan toont de MVP geen verwijder- of archiefactie.
