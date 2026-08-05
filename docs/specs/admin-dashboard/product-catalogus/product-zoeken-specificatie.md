# Specificatie - product en merk zoeken

## Status

- Onderdeel: admin dashboard > productcatalogus
- Routes:
  - `/product-catalogus`
  - `/product-catalogus/nieuw`
- Status:
  - cataloguszoekveld: geimplementeerd;
  - merk zoeken in productformulier: geimplementeerd voor product aanmaken en product bewerken;
  - echte cataloguszoekresultaten: geimplementeerd.
- Gerelateerde specs:
  - [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md)
  - [product-archiveren-specificatie.md](./product-archiveren-specificatie.md)

## Doel

Zoeken helpt de beheerder om bestaande catalogusdata te vinden en duplicaten te voorkomen. Zoeken is nooit verplicht om een product aan te maken.

Deze spec beschrijft de algemene zoekregels, de cataloguszoekresultaten, het klikgedrag vanuit zoekresultaten en zoekgestuurde resultaatstates op de cataloguspagina.

## Zoekvormen

| Zoekvorm | Waar | Status |
| --- | --- | --- |
| Productcatalogus zoeken | `/product-catalogus?q=...` | Werkt met gegroepeerde resultaten volgens deze spec |
| Merk zoeken | merkveld in product-aanmaakformulier en product-bewerkformulier | Werkt via `GET /brands?query=...` |
| Productresultaten zoeken | productcataloguspagina | Geimplementeerd |
| Categorie zoeken | productcataloguspagina | Geimplementeerd |

## UI-specificatie

De presentatie van het zoekveld, de gegroepeerde resultaten en resultaatstates staat in [product-zoeken-ui-specificatie.md](./product-zoeken-ui-specificatie.md).

## Cataloguszoekveld

- Het zoekveld gebruikt queryparameter `q`.
- Zonder statusparameter zoekt de catalogus uitsluitend actieve producten.
- Met `status=archived` zoekt de catalogus uitsluitend gearchiveerde producten.
- Openen van `/product-catalogus?q=cola` vult het zoekveld met `cola`.
- De zoekterm wordt niet automatisch opgesplitst in merk, categorie of productnaam.
- De zoekterm wordt niet automatisch ingevuld in het productformulier.
- De product-aanmaakactie wordt niet getoond zolang er geen expliciete categorie- of merkcontext is.

## Product zoeken op cataloguspagina

### Zoekgedrag

De cataloguszoeker zoekt vanaf minimaal twee tekens.

De zoekterm wordt gematcht op:

- productnaam;
- merknaam;
- categorienaam;
- categoriepad.

De zoekterm wordt niet gematcht op:

- verpakkingstype;
- verpakkingsinhoud;
- barcode/EAN;
- alias;
- externe productdata.

Voorbeeld:

Wanneer de beheerder zoekt op `cola`, toont de UI matches zoals:

- producten waarvan de productnaam `cola` bevat, bijvoorbeeld `Cola Zero Sugar`;
- merken waarvan de merknaam `cola` bevat, bijvoorbeeld `Coca-Cola`;
- categorieën waarvan de naam of het pad `cola` bevat, bijvoorbeeld `Dranken > Frisdrank > Cola`.

Zoeken is case-insensitive contains-search.

Bij nul of één teken wordt geen productzoekopdracht uitgevoerd.

### Live zoeken en submit

Zoekresultaten verschijnen live tijdens typen, vanaf minimaal twee tekens.

Regels:

- live zoeken is debounced;
- Enter/form submit blijft werken voor keyboardgebruik en deelbare URL;
- de URL gebruikt `q=<zoekterm>` zolang de gebruiker in tekstzoekmodus zit.

## Zoekresultaten op cataloguspagina

Zoekresultaten worden semantisch gegroepeerd als producten, merken en categorieën. De visuele uitwerking staat in de UI-specificatie.

Zoekresultaten krijgen per groep een eigen limiet:

- Producten: max 20
- Merken: max 10
- Categorieën: max 10

Als er meer resultaten zijn dan de limiet, toont de UI per groep een eigen actie:

```text
[ Meer producten tonen ]
[ Meer merken tonen ]
[ Meer categorieën tonen ]
```

### Productresultaat openen

Klik op een productresultaat opent productdetail:

```text
/product-catalogus/:productId
```

Wanneer de productrij vanuit zoekresultaten wordt geopend, blijft de zoekcontext beschikbaar voor terugnavigatie naar de catalogus waar dat logisch is. Een gearchiveerd resultaat toont altijd het tekstlabel `Gearchiveerd`.

### Merkresultaat openen

Klik op een merkresultaat opent een brand-result state op dezelfde cataloguspagina.

De brand-result state gebruikt `/product-catalogus?brandId=<brandId>`.

Bij selectie van een merkresultaat:

- wordt `q` verwijderd uit de URL;
- wordt de zoekbalk leeg;
- wordt er geen merkchip getoond;
- wordt er geen inline expand in de zoekresultaten gebruikt.

### Brand-result state

De UI toont producten van het gekozen merk, gegroepeerd onder categorieheaders. De opbouw van deze state staat in de UI-specificatie.

Regels:

- categorieën zijn headers/groepering, geen klikbare filteritems;
- producten zijn klikbaar naar productdetail;
- de primaire actie staat onder de gegroepeerde producten;
- de primaire actie opent product aanmaken met `brandId` vooraf geselecteerd;
- de knoptekst mag de merknaam tonen, omdat de context geen breadcrumb heeft.

Per getoonde productlijst in brand-result state worden in de eerste versie maximaal 50 producten getoond. Als er meer producten zijn, toont de UI:

```text
[ Meer laden ]
```

### Categorieresultaat openen

Klik op een categorieresultaat opent de categorie-browse state op dezelfde cataloguspagina.

Voorbeeld URL:

```text
/product-catalogus?categoryId=<categoryId>
```

Bij selectie van een categorieresultaat:

- wordt `q` verwijderd uit de URL;
- blijft de zoekbalk zichtbaar maar leeg;
- toont de pagina de breadcrumb direct onder de zoekbalk;
- toont de pagina de gekozen categorie met klikbare breadcrumb, directe subcategorieën en directe producten wanneer die bestaan;
- de primaire actie blijft `+ Product` en neemt de gekozen `categoryId` als context mee.

Wanneer een categorieresultaat is geopend in de categorieboom, heeft iedere zichtbare categorie rechts dezelfde beheerknop met potloodicoon als in de browseflow. Het menu biedt `Naam wijzigen` en `Verwijderen`; naam wijzigen gebruikt dezelfde route en modalregels als categorie beheren vanuit de categorieboom.

De volledige category-browse layout en categoriebeheerregels staan in [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md).

### Geen zoekresultaten

Wanneer zoeken niets oplevert, toont de UI de geen-resultaten-toestand uit de UI-specificatie. Er wordt geen product-aanmaakactie getoond, omdat een zoekterm geen expliciete categorie- of merkcontext is.

### Resultaatselectie en URL-state

De cataloguszoeker gebruikt queryparameters voor deelbare en testbare zoek- en resultaatstate:

```text
/product-catalogus?q=<zoekterm>
/product-catalogus?q=<zoekterm>&status=archived
/product-catalogus?brandId=<brandId>
/product-catalogus?categoryId=<categoryId>
```

Bij klikken op een merk- of categorieresultaat wordt `q` verwijderd. De zoekterm blijft niet als verborgen context bestaan.

## Geen automatische productinvulling

Een zoekterm vult nooit automatisch productnaam, merk of categorie in.

Wel mag product aanmaken expliciete context meenemen wanneer de gebruiker een resultaat of browsecontext heeft gekozen, bijvoorbeeld:

- brand-result state opent product aanmaken met `brandId`;
- category-browse state opent product aanmaken met `categoryId`.

Voorbeelden:

```text
Product aanmaken voor Coca-Cola
```

Dit staat verder uitgewerkt in de product-aanmaken-spec.

## Merk zoeken in product aanmaken en product bewerken

### Gedrag

- Het merkveld zoekt bestaande merken vanaf minimaal twee tekens.
- API: `GET /brands?query=<zoekterm>`.
- Resultaten zijn case-insensitive en gelimiteerd.
- De beheerder kiest een bestaande suggestie of bevestigt expliciet een nieuw merk.
- Een losse tekst zonder gekozen of bevestigd merk blokkeert opslaan met een veldfout.

### Geen automatische productinvulling

Een merkzoekterm vult nooit automatisch productnaam, categorie of verpakking in.

## Benodigde backend/API

De cataloguszoeker en merkcontext gebruiken de bestaande admin-dashboard endpoints:

```text
GET /products/search?query=<query>&status=<active|archived>&productLimit=<limit>&brandLimit=<limit>&categoryLimit=<limit>
GET /products?brandId=<brandId>&limit=<limit>
GET /brands?query=<zoekterm>
```

Regels:

- `GET /products/search` levert gegroepeerde product-, merk- en categorieresultaten voor de cataloguspagina.
- `GET /products?brandId=...` levert de producten voor de brand-result state.
- `GET /brands?query=...` levert merksuggesties in product aanmaken en product bewerken.

## Buiten scope

- Zoeken op verpakkingstype of verpakkingsinhoud.
- Barcode zoeken.
- Vaste filterdropdowns zoals `Categorie: Alle` of `Merk: Alle`.
- Persistente filterchips, zoals `Coca-Cola x`.
- Inline uitbreiden van merkresultaten binnen zoekresultaten.
- Full-text ranking of fuzzy matching.
- Automatisch product aanmaken op basis van zoekterm.
- Oude productmanagement-search-flow met producttype/merkproduct/variant/SKU.

## Acceptatiecriteria

### AC-01 - Zoekterm blijft zichtbaar

Gegeven dat de beheerder `/product-catalogus?q=cola` opent  
Dan staat `cola` in het zoekveld  
En wordt er geen product automatisch aangemaakt of ingevuld.

### AC-02 - Geen product aanmaken zonder resultaatcontext

Gegeven dat er alleen een zoekterm is ingevuld  
Wanneer er geen expliciet gekozen merk- of categorieresultaatcontext is  
Dan toont de catalogus geen product-aanmaakactie  
En wordt de zoekterm niet als prefill gebruikt.

### AC-03 - Merk suggesties zoeken

Gegeven dat de beheerder in het productformulier minimaal twee tekens in het merkveld typt  
Dan vraagt de UI `GET /brands?query=...` op  
En kan de beheerder een bestaand merk kiezen.

### AC-04 - Merk niet impliciet kiezen

Gegeven dat de beheerder tekst in het merkveld typt maar geen suggestie of nieuw merk bevestigt  
Wanneer de beheerder het product opslaat  
Dan toont de UI een veldfout bij merk.

### AC-05 - Productzoekopdracht vanaf twee tekens

Gegeven dat de beheerder nul of één teken in het cataloguszoekveld heeft ingevuld  
Dan wordt er geen productzoekopdracht uitgevoerd.  
Wanneer de beheerder minimaal twee tekens invult  
Dan zoekt de UI naar producten, merken en categorieën die de zoekterm bevatten.

### AC-06 - Gegroepeerde zoekresultaten

Gegeven dat de zoekterm producten, merken of categorieën matcht  
Dan toont de UI resultaten gegroepeerd onder `Producten`, `Merken` en `Categorieën` waar relevant.

### AC-07 - Geen resultaten

Gegeven dat een zoekterm geen producten, merken of categorieën matcht  
Dan toont de UI een geen-resultaten toestand  
En toont de UI geen product-aanmaakactie zonder expliciete categorie- of merkcontext.

### AC-08 - Resultaatselectie verwijdert q

Gegeven dat de beheerder zoekresultaten ziet  
Wanneer de beheerder een merk- of categorieresultaat opent  
Dan wordt `q` verwijderd uit de URL  
En toont de pagina een expliciete browse- of resultaatstaat.

### AC-09 - Merkresultaat openen

Gegeven dat de zoekterm een merk matcht  
Wanneer de beheerder het merkresultaat opent  
Dan toont de catalogus producten van dat merk gegroepeerd per categorie  
En toont de UI geen merkchip of inline uitgeklapte zoekresultaten  
En opent de actie `Product aanmaken voor <merk>` het productformulier met `brandId` vooraf geselecteerd.

### AC-10 - Categorieresultaat openen

Gegeven dat de zoekterm een categorie matcht  
Wanneer de beheerder het categorieresultaat opent  
Dan wordt `q` verwijderd uit de URL  
En opent de catalogus de category-browse state voor die categorie met `categoryId=<categoryId>`.

### AC-11 - Zoeken op status

Gegeven dat geen statusparameter bestaat
Dan levert zoeken alleen actieve producten.
Gegeven dat `status=archived` actief is
Dan levert zoeken alleen gearchiveerde producten
En toont ieder productresultaat het label `Gearchiveerd`.
