# Specificatie - browsbare productcatalogus

## Status

- Onderdeel: admin dashboard > productcatalogus
- Route: `/admin/product-catalogus/producten`
- Status: geimplementeerd
- Gerelateerde specs:
  - [product-zoeken-specificatie.md](./product-zoeken-specificatie.md)
  - [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md)
  - [product-detail-specificatie.md](./product-detail-specificatie.md)

Deze spec is leidend voor alles wat zichtbaar is op de productcatalogus-hoofdpagina: browsen, zoekresultaten, resultaatstates en de primaire toegang tot product aanmaken.

## Doel

Een beheerder kan door bestaande catalogusdata bladeren, zoeken op product/merk/categorie, concrete producten openen en vanuit expliciete context sneller een nieuw product aanmaken.

## Binnen scope voor deze feature

- Productcatalogus openen als browsbare pagina.
- Categorieboom tonen als primaire browse-navigatie.
- Directe subcategorieën en directe producten van een gekozen categorie tonen.
- Producten ophalen en tonen als productrijen of productkaarten.
- Productrijen linken naar productdetail.
- Zoeken op product, merk en categorie.
- Gegroepeerde zoekresultaten tonen.
- Brand-result state tonen na klikken op merkresultaat.
- Category-browse state tonen na klikken op categorie of categorieresultaat.
- Lege catalogus tonen wanneer er nog geen producten zijn.
- Geen-resultaten toestand tonen wanneer een zoekterm niets oplevert.
- `Product aanmaken` altijd bereikbaar houden.
- `Product aanmaken` contextueel maken wanneer er een expliciete en eenduidige merk- of categoriecontext is.

## Buiten scope

- Vaste filterdropdowns zoals `Categorie: Alle` of `Merk: Alle`.
- Persistente filterchips, zoals `Coca-Cola x`.
- Inline uitbreiden van merkresultaten binnen zoekresultaten.
- Producten verwijderen of archiveren.
- Extra verpakkingen beheren op de cataloguspagina.
- Barcode/EAN zoeken.
- Productfoto's of publicatiestatus.
- Oude trapsgewijze productmanagement-flow.

## Hoofdpagina zonder context

Wanneer de beheerder `/admin/product-catalogus/producten` opent zonder query of context, toont de pagina de root van de catalogus.

```text
Productcatalogus
Producten

[ Zoek product, merk of categorie ]

Categorieën
- Dranken
- Voeding
- Huishouden

[ Product aanmaken ]
```

Op de rootpagina is `Product aanmaken` niet contextueel. De actie opent:

```text
/admin/product-catalogus/producten/nieuw
```

De hoofdpagina toont geen platte lijst met alle producten. Browsen verloopt via categorieën of zoeken.

## Categorie-browse

Wanneer de beheerder een categorie opent, toont de pagina:

- een generieke paginacontext, geen volledige breadcrumb als paginatitel;
- een klikbare breadcrumb als aparte navigatie;
- directe subcategorieën;
- directe producten in deze categorie;
- primaire actie voor de huidige categorie.

Voorbeeld:

```text
Productcatalogus
Producten

Alle categorieën > Voeding > Dranken > Frisdrank

Subcategorieën
- Cola
- Sinas
- IJsthee

Producten in Frisdrank
- Spa Rood
- Fanta Orange

[ Product aanmaken ]
```

Regels:

- De volledige categoriecontext wordt niet als paginatitel herhaald; de sectietitel `Producten in <categorie>` en de breadcrumb geven samen voldoende context.
- De zoekbalk wordt niet getoond in categorie-browse, omdat de beheerder al binnen een expliciete categoriecontext navigeert.
- De breadcrumb begint altijd met `Alle categorieën` en toont daarna het categoriepad van root naar huidige categorie.
- `Alle categorieën` linkt naar `/admin/product-catalogus/producten` zonder queryparameters.
- Elke ancestorcategorie in de breadcrumb is afzonderlijk klikbaar en opent `/admin/product-catalogus/producten?categoryId=<categoryId>`.
- De huidige categorie mag als laatste, niet-klikbaar breadcrumbsegment worden getoond.
- Producten uit subcategorieën worden niet automatisch getoond op de parentcategorie.
- Om producten in een subcategorie te zien, navigeert de beheerder naar die subcategorie.
- Producten die direct aan een parentcategorie hangen, worden wel op die parentcategorie getoond.
- De contextuele aanmaakactie gebruikt de korte knoptekst `Product aanmaken`, ook wanneer er een categoriecontext is.
- De categoriecontext voor aanmaken blijft de huidige categorie en wordt via `categoryId` meegegeven.
- Er is maar één primaire knop; er staan geen plusknoppen bij elke subcategorie.

## Lege categorieën in browse

De browseboom is geen categoriebeheerinterface. Categorieën zonder producten in hun eigen subtree hoeven niet in de browseboom getoond te worden, behalve wanneer ze nodig zijn als parent om een relevante tak te tonen.

Wanneer een geopende categorie geen directe producten heeft, maar wel subcategorieën, toont de pagina de subcategorieën en blijft de contextuele aanmaakactie beschikbaar.

Wanneer een geopende categorie geen directe producten en geen subcategorieën heeft:

```text
Nog geen producten in deze categorie.
[ Product aanmaken ]
```

Ook in deze lege categorietoestand gebruikt de aanmaakactie de huidige `categoryId` als prefillcontext.

## Productrij of productkaart

Elke concrete productrij of productkaart linkt naar productdetail:

```text
/admin/product-catalogus/producten/:productId
```

Elke rij/kaart toont minimaal:

- weergavenaam;
- merk wanneer aanwezig;
- korte verpakkingssamenvatting.

Als producten binnen een categorie staan, is het categoriepad al zichtbaar als context en hoeft dit niet in elke rij herhaald te worden.

Voorbeelden van verpakkingssamenvatting:

```text
fles 1,5 l
blik 330 ml
3 verpakkingen
```

## Productlimieten en meer laden

Per getoonde productlijst worden in de eerste versie maximaal 50 producten getoond.

Als er meer producten zijn, toont de UI:

```text
[ Meer laden ]
```

Dit geldt voor:

- directe producten in een categorie;
- producten in een brand-result state.

## Zoeken op de cataloguspagina

Zoeken gebruikt de regels uit [product-zoeken-specificatie.md](./product-zoeken-specificatie.md):

- zoeken vanaf minimaal twee tekens;
- live tijdens typen, debounced;
- Enter/form submit blijft werken;
- URL gebruikt `q`;
- zoeken matcht productnaam, merknaam, categorienaam en categoriepad;
- zoeken matcht niet op verpakking, barcode, alias of externe data.

Zoekresultaten worden gegroepeerd:

```text
Producten
- Cola Zero Sugar
  Merk: Coca-Cola
  Categorie: Dranken > Frisdrank > Cola

Merken
- Coca-Cola
  4 producten

Categorieën
- Dranken > Frisdrank > Cola
  12 producten
```

### Zoekresultaatlimieten

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

## Klikgedrag vanuit zoekresultaten

### Productresultaat

Klik op een productresultaat opent productdetail:

```text
/admin/product-catalogus/producten/:productId
```

### Merkresultaat

Klik op een merkresultaat opent een brand-result state op dezelfde cataloguspagina.

Voorbeeld URL:

```text
/admin/product-catalogus/producten?brandId=<brandId>
```

Bij selectie van een merkresultaat:

- wordt `q` verwijderd uit de URL;
- wordt de zoekbalk leeg;
- wordt er geen merkchip getoond;
- wordt er geen inline expand in de zoekresultaten gebruikt.

De UI toont producten van dat merk, gegroepeerd onder categorieheaders.

Voorbeeld:

```text
Productcatalogus
Producten van Heinz

[ Zoek product, merk of categorie ]

Sauzen
- Heinz Tomato Ketchup
- Heinz Mayonaise

Bonen
- Heinz Baked Beans

[ Product aanmaken voor Heinz ]
```

In brand-result state:

- categorieën zijn headers/groepering, geen klikbare filteritems;
- producten zijn klikbaar naar productdetail;
- de primaire actie opent product aanmaken met `brandId` vooraf geselecteerd.

### Categorieresultaat

Klik op een categorieresultaat opent de categorie-browse state op dezelfde cataloguspagina.

Voorbeeld URL:

```text
/admin/product-catalogus/producten?categoryId=<categoryId>
```

Bij selectie van een categorieresultaat:

- wordt `q` verwijderd uit de URL;
- wordt de zoekbalk verborgen zolang de gekozen categoriecontext actief is;
- toont de pagina de gekozen categorie met klikbare breadcrumb, directe subcategorieën en directe producten;
- de primaire actie blijft `Product aanmaken` en neemt de gekozen `categoryId` als context mee.

## Product aanmaken vanuit browse en resultaten

Er is altijd één primaire actie.

| State | Knoptekst | Prefill |
| --- | --- | --- |
| Hoofdpagina/root | `Product aanmaken` | Geen context |
| Lege catalogus | `Eerste product aanmaken` | Geen context |
| Categorie-browse | `Product aanmaken` | `categoryId` |
| Brand-result state | `Product aanmaken voor <merk>` | `brandId` |
| Alleen typed zoekterm | `Product aanmaken` | Geen context |

Regels:

- Alleen expliciet gekozen context wordt meegenomen.
- Een typed zoekterm wordt niet gebruikt als productnaam, merk of categorie.
- In categorie-browse blijft de knoptekst kort: `Product aanmaken`.
- De volledige categoriecontext staat zichtbaar via de klikbare breadcrumb.
- Brand-result state mag de merknaam in de knoptekst tonen, omdat de context geen breadcrumb heeft.

Voorbeelden:

```text
Product aanmaken
```

```text
Product aanmaken voor Coca-Cola
```

## Lege catalogus

Wanneer er nog geen producten zijn:

```text
Nog geen producten
Voeg je eerste product toe om de catalogus op te bouwen.
[ Eerste product aanmaken ]
```

De actie opent `/admin/product-catalogus/producten/nieuw` zonder context.

## Geen zoekresultaten

Wanneer zoeken niets oplevert:

```text
Geen resultaten gevonden voor "<zoekterm>".
Pas je zoekterm aan of maak een nieuw product aan.
[ Product aanmaken ]
```

`Product aanmaken` blijft beschikbaar, maar krijgt geen prefill vanuit de zoekterm.

## URL-state

De catalogus gebruikt queryparameters voor deelbare en testbare state:

```text
/admin/product-catalogus/producten?q=<zoekterm>
/admin/product-catalogus/producten?brandId=<brandId>
/admin/product-catalogus/producten?categoryId=<categoryId>
```

Bij klikken op een merk- of categorieresultaat wordt `q` verwijderd. De zoekterm blijft niet als verborgen context bestaan.

## Benodigde backend/API - nog te specificeren

Waarschijnlijke API-vorm:

```text
GET /products?query=&categoryId=&brandId=&cursor=
GET /products/search?query=&productLimit=&brandLimit=&categoryLimit=
```

Nog te bepalen:

- response DTO voor productrij/kaart;
- response DTO voor gegroepeerde zoekresultaten (`Producten`, `Merken`, `Categorieën`);
- response DTO voor categorieboom/takken;
- sortering per categorie;
- cursor of paginering;
- hoe meerdere verpakkingen worden samengevat voor productkaarten;
- exacte endpointnamen.

## Acceptatiecriteria

### AC-01 - Root toont categorieen

Gegeven dat de beheerder de productcatalogus opent zonder query of context  
Dan ziet de beheerder de root-categorieën van de browsbare catalogus  
En geen platte lijst met alle producten.

### AC-02 - Categorie openen

Gegeven dat een categorie bestaat  
Wanneer de beheerder de categorie opent  
Dan ziet de beheerder directe subcategorieën en directe producten in die categorie  
En ziet de beheerder een klikbare breadcrumb met `Alle categorieën` en het categoriepad  
En ziet de beheerder geen zoekbalk in deze categoriecontext  
En een primaire actie `Product aanmaken` met de huidige categorie als prefillcontext.

### AC-03 - Product openen

Gegeven dat een productrij zichtbaar is  
Wanneer de beheerder het product opent  
Dan navigeert de UI naar productdetail.

### AC-04 - Merkresultaat openen

Gegeven dat de zoekterm een merk matcht  
Wanneer de beheerder het merkresultaat opent  
Dan toont de catalogus producten van dat merk gegroepeerd per categorie  
En toont de UI geen merkchip of inline uitgeklapte zoekresultaten.

### AC-05 - Contextueel product aanmaken

Gegeven dat de beheerder in een categorie-browse of brand-result state zit  
Wanneer de beheerder de primaire aanmaakactie kiest  
Dan opent het productformulier met de expliciete categorie- of merkcontext vooraf geselecteerd  
En gebruikt categorie-browse de korte knoptekst `Product aanmaken`.

### AC-06 - Geen prefill vanuit zoekterm

Gegeven dat de beheerder alleen een zoekterm heeft getypt  
Wanneer de beheerder `Product aanmaken` kiest  
Dan opent het productformulier zonder productnaam-, merk- of categorie-prefill vanuit die zoekterm.

### AC-07 - Lege catalogus

Gegeven dat er geen producten bestaan  
Wanneer de beheerder de productcatalogus opent  
Dan ziet de beheerder een lege toestand  
En kan de beheerder het eerste product aanmaken.

### AC-08 - Geen oude flow

Gegeven dat de browsbare catalogus wordt gebouwd  
Dan gebruikt de UI alleen categorie, merk, product en verpakking  
En wordt er geen oude trapsgewijze productmanagement-flow teruggebracht.

### AC-09 - Breadcrumb navigatie

Gegeven dat de beheerder in een geneste categorie zit  
Wanneer de beheerder `Alle categorieën` in de breadcrumb kiest  
Dan opent de rootcatalogus zonder `categoryId`  
En wanneer de beheerder een ancestorcategorie in de breadcrumb kiest  
Dan opent de catalogus die categorie met `categoryId=<ancestorCategoryId>`.
