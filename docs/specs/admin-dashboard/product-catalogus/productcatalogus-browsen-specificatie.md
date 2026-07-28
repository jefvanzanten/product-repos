# Specificatie - browsbare productcatalogus

## Status

- Onderdeel: admin dashboard > productcatalogus
- Route: `/admin/product-catalogus`
- Status: geimplementeerd; categorietitel, subcategorie-aanmaak en categorienaam bewerken toegevoegd
- Gerelateerde specs:
  - [product-zoeken-specificatie.md](./product-zoeken-specificatie.md)
  - [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md)
  - [product-detail-specificatie.md](./product-detail-specificatie.md)

Deze spec is leidend voor alles wat zichtbaar is op de productcatalogus-hoofdpagina: browsen, zoekresultaten, resultaatstates en de primaire toegang tot product aanmaken.

## Doel

Een beheerder kan door bestaande catalogusdata bladeren, rootcategorieën beheren op de catalogusroot, zoeken op product/merk/categorie, concrete producten openen, vanuit expliciete context sneller een nieuw product aanmaken en vanuit een geopende categorie direct een subcategorie toevoegen.

## Binnen scope voor deze feature

- Productcatalogus openen als browsbare pagina.
- Categorieboom tonen als primaire browse-navigatie.
- Directe subcategorieën en directe producten van een gekozen categorie in de categorieboom tonen.
- De gekozen categorie als opengeklapte categorierij met bijbehorende inhoud tonen.
- Vanuit de opengeklapte categorie een directe subcategorie aanmaken.
- Producten ophalen en tonen als productrijen of productkaarten.
- Productrijen linken naar productdetail.
- Zoeken op product, merk en categorie.
- Gegroepeerde zoekresultaten tonen.
- Brand-result state tonen na klikken op merkresultaat.
- Category-browse state tonen na klikken op categorie of categorieresultaat.
- Lege root tonen wanneer er nog geen categorieën zijn.
- Lege geopende categorie tonen wanneer er geen directe subcategorieën en geen directe producten zijn.
- Geen-resultaten toestand tonen wanneer een zoekterm niets oplevert.
- Rootcategorieën aanmaken vanaf de catalogusroot.
- Categorieën hernoemen vanuit de categorieboom.
- `Product aanmaken` alleen tonen wanneer er een expliciete en eenduidige merk- of categoriecontext is, niet op de catalogusroot.

## Buiten scope

- Vaste filterdropdowns zoals `Categorie: Alle` of `Merk: Alle`.
- Persistente filterchips, zoals `Coca-Cola x`.
- Inline uitbreiden van merkresultaten binnen zoekresultaten.
- Producten verwijderen of archiveren.
- Categorieën verwijderen, verplaatsen of hersorteren op de cataloguspagina.
- Extra verpakkingen beheren op de cataloguspagina.
- Barcode/EAN zoeken.
- Productfoto's of publicatiestatus.
- Oude trapsgewijze productmanagement-flow.

## Hoofdpagina zonder context

Wanneer de beheerder `/admin/product-catalogus` opent zonder query of context, toont de pagina de root van de catalogus.

```text
Productcatalogus

[ Zoek product, merk of categorie ]

Alle categorieën
- Dranken
- Voeding
- Huishouden

[ Categorie aanmaken ]
```

Op de rootpagina wordt geen `Product aanmaken` getoond, omdat er nog geen expliciete categoriecontext is. De rootpagina toont wel de actie `Categorie aanmaken`; deze maakt een nieuwe rootcategorie.

De hoofdpagina toont geen platte lijst met alle producten. Browsen verloopt via categorieën of zoeken. Producten kunnen pas vanuit een gekozen categorie, subcategorie of merkcontext worden aangemaakt.

## Categorie-browse

Wanneer de beheerder een categorie opent, toont de catalogus een openklapbare categorieboom. De geopende categorie blijft zichtbaar als rij in die boom. Direct onder die rij staat de inhoud die bij de geopende categorie hoort.

De pagina toont boven de categorieboom:

- de zoekbalk;
- een klikbare breadcrumb met `Alle categorieën` en het categoriepad van root naar de geopende categorie.

Een geopende categorie toont in deze volgorde:

1. de categorierij zelf, met categorienaam en bewerkicoon;
2. directe subcategorieën, als ingesprongen categorierijen onder de geopende categorie;
3. directe producten, onder de sectietitel `Producten`, wanneer de categorie directe producten bevat;
4. de acties `Subcategorie aanmaken` en `Product aanmaken`.

Voorbeeld met subcategorieën en directe producten:

```text
Productcatalogus

[ Zoek product, merk of categorie ]

Alle categorieën > Voeding > Tussendoortjes > Rijstwafels met smaak

▸ Drinken
▸ Drogisterij
▸ Supplementen
▾ Voeding
  ▸ Brood en broodvervangers
  ▸ Chips, zoutjes en noten
  ▸ Chocolade
  ▸ Salades en spreads
  ▾ Tussendoortjes
    ▸ Knabbelspek
    ▾ Rijstwafels met smaak

      Producten
      - Snack a Jacks Rijstwafels met kaassmaak
        Merk: Snack a Jacks
        zak 23 gram

      [ Subcategorie aanmaken ] [ Product aanmaken ]

  ▸ Vleeswaren
```

Voorbeeld met subcategorieën en zonder directe producten:

```text
Productcatalogus

[ Zoek product, merk of categorie ]

Alle categorieën > Voeding > Tussendoortjes

▸ Drinken
▸ Drogisterij
▸ Supplementen
▾ Voeding
  ▸ Brood en broodvervangers
  ▾ Tussendoortjes
    ▸ Knabbelspek
    ▸ Rijstwafels met smaak

    [ Subcategorie aanmaken ] [ Product aanmaken ]
```

Regels:

- De zoekbalk blijft zichtbaar in categorie-browse.
- De breadcrumb staat direct onder de zoekbalk en boven de categorieboom.
- De breadcrumb begint altijd met `Alle categorieën` en toont daarna het categoriepad van root naar de geopende categorie.
- `Alle categorieën` linkt naar `/admin/product-catalogus` zonder queryparameters.
- Elke ancestorcategorie in de breadcrumb opent `/admin/product-catalogus?categoryId=<categoryId>`.
- Het laatste breadcrumbsegment toont de geopende categorie als huidige context.
- Elke categoriekaart of -rij toont rechts een potloodicoon om de categorie te bewerken.
- Het potloodicoon opent `/admin/product-catalogus/categorieen/<categoryId>/bewerken`; bij browsernavigatie wordt deze route direct zichtbaar in de browser-URL.
- Directe subcategorieën staan onder de geopende categorierij en tonen alleen hun eigen naam.
- Producten die direct aan de geopende categorie hangen, staan in de sectie `Producten` onder die categorie.
- Producten uit onderliggende subcategorieën staan pas onder die subcategorie wanneer de beheerder die subcategorie opent.
- De inhoud onder een geopende categorie hoort visueel bij die categorie: subcategorieën, productsectie, productkaarten en actieknoppen volgen dezelfde boom-as en blijven binnen dezelfde breedte als de geopende categoriecontext.
- De contextuele product-aanmaakactie gebruikt de korte knoptekst `Product aanmaken`.
- De categoriecontext voor product aanmaken blijft de geopende categorie en wordt via `categoryId` meegegeven.
- Er is één primaire knop `Product aanmaken`; daarnaast staat maximaal één secundaire knop `Subcategorie aanmaken`.
- `Subcategorie aanmaken` en `Product aanmaken` staan samen onder de inhoud van de geopende categorie.

## Lege categorieën in browse

De browsepagina is geen volledige categoriebeheerinterface, maar ondersteunt wel het aanmaken van directe subcategorieën vanuit een geopende categorie.

Wanneer een geopende categorie geen directe producten heeft, maar wel subcategorieën, toont de geopende categorie haar directe subcategorieën, de actie `Subcategorie aanmaken` en de contextuele product-aanmaakactie.

Wanneer een geopende categorie geen directe producten en geen subcategorieën heeft:

```text
[ Zoek product, merk of categorie ]

Alle categorieën > ... > <Naam huidige categorie>

▾ <Naam huidige categorie>
  Deze categorie is nu nog leeg.
  Maak een nieuwe subcategorie of een product aan om hem te vullen.

  [ Subcategorie aanmaken ] [ Product aanmaken ]
```

Deze lege categorietoestand wordt getoond wanneer de geopende categorie helemaal leeg is: geen directe subcategorieën en geen directe producten. Ook in deze lege categorietoestand gebruikt de product-aanmaakactie de huidige `categoryId` als prefillcontext. De actieknoppen staan onder de lege-state-inhoud op dezelfde boom-as als de geopende categorie-inhoud.

Directe subcategorieën van de geopende categorie worden getoond, ook wanneer ze nog geen producten in hun eigen subtree hebben. Dit is nodig zodat een beheerder feedback krijgt na subcategorie-aanmaak en verder kan navigeren om de catalogus op te bouwen.

## Rootcategorie aanmaken vanuit de catalogusroot

De actie `Categorie aanmaken` staat alleen op de rootpagina zonder geselecteerde categorie.

De actie opent een modal:

```text
Nieuwe categorie maken

[ Naam categorie ]

[ Toevoegen ] [ Annuleren ]
```

Regels:

- De modal maakt een rootcategorie met `parentId: null`.
- De modal toont geen extra uitlegtekst; alleen de modaltitel, het invoerveld en de acties zijn zichtbaar.
- Het invoerveld heeft een toegankelijke naam, bijvoorbeeld `Naam categorie`.
- `Toevoegen` is de bevestigingsactie.
- `Annuleren` sluit de modal zonder wijziging en keert terug naar `/admin/product-catalogus`.
- Een lege of alleen uit whitespace bestaande naam kan niet worden opgeslagen.
- Bij een backendvalidatiefout of dubbele rootcategorienaam blijft de modal open en toont de UI de fout bij het veld of in de modal.
- Na succesvol aanmaken sluit de modal, blijft de beheerder op de rootpagina en wordt de lijst met rootcategorieën vernieuwd zodat de nieuwe categorie zichtbaar is.
- De nieuwe categorie linkt naar `/admin/product-catalogus?categoryId=<nieuwCategoryId>`.

## Subcategorie aanmaken vanuit categorie-browse

De actie `Subcategorie aanmaken` staat in dezelfde actiezone als `Product aanmaken` onder de geopende categorie.

De actie opent een modal. Voorbeeld voor de categorie `Brood en broodvervangers`:

```text
Nieuwe subcategorie maken in Brood en broodvervangers

[ Naam subcategorie ]

[ Toevoegen ] [ Annuleren ]
```

Regels:

- De modal maakt een directe childcategorie onder de huidige categorie.
- De modal toont geen extra uitlegtekst; alleen de modaltitel, het invoerveld en de acties zijn zichtbaar.
- Het invoerveld heeft een toegankelijke naam, bijvoorbeeld `Naam subcategorie`. Als het ontwerp visueel alleen een veld toont, mag het label visueel verborgen zijn.
- `Toevoegen` is de bevestigingsactie.
- `Annuleren` sluit de modal zonder wijziging.
- Buiten de modal klikken of Escape sluit de modal zonder wijziging, tenzij dit conflicteert met bestaande modalrichtlijnen.
- Een lege of alleen uit whitespace bestaande naam kan niet worden opgeslagen.
- Bij een backendvalidatiefout of dubbele siblingnaam blijft de modal open en toont de UI de fout bij het veld of in de modal.
- Na succesvol aanmaken sluit de modal, blijft de beheerder op de huidige categoriepagina en wordt de lijst met subcategorieën vernieuwd zodat de nieuwe subcategorie zichtbaar is.
- De nieuwe subcategorie linkt naar `/admin/product-catalogus?categoryId=<nieuwCategoryId>`.

## Categorie bewerken vanuit de categorieboom

Elke zichtbare categorie in de rootlijst, subcategorielijst en categorieresultaten heeft rechts een potloodicoon met een toegankelijke naam zoals `Categorie <naam> bewerken`.

De bewerkactie opent een modal op de route:

```text
/admin/product-catalogus/categorieen/<categoryId>/bewerken
```

Regels:

- De route is direct zichtbaar/deelbaar wanneer de beheerder het potloodicoon gebruikt.
- De modal heeft titel `Categorie bewerken`.
- Het invoerveld heeft toegankelijke naam `Naam categorie` en is voorgevuld met de huidige categorienaam.
- `Opslaan` is de bevestigingsactie.
- `Annuleren` sluit de modal zonder wijziging en keert terug naar de lijst waarin de categorie stond: root voor rootcategorieën, of de parentcategorie voor subcategorieën.
- Een lege of alleen uit whitespace bestaande naam kan niet worden opgeslagen.
- Een naam die al bestaat bij dezelfde parentcategorie/root blijft geblokkeerd.
- Bij een backendvalidatiefout of dubbele siblingnaam blijft de modal open en toont de UI de fout bij het veld of in de modal.
- Na succesvol opslaan sluit de modal en wordt de beheerder teruggestuurd naar de bijbehorende categorielijst, waar de nieuwe naam zichtbaar is.
- Hernoemen wijzigt alleen de categorienaam; parent, sortering, producten en subcategorieën blijven ongewijzigd.

## Productrij of productkaart

Elke concrete productrij of productkaart linkt naar productdetail:

```text
/admin/product-catalogus/:productId
```

Wanneer de productrij vanuit een categorie- of merkcontext wordt geopend, blijft die browsecontext beschikbaar voor terugnavigatie naar de catalogus.

Elke rij/kaart toont minimaal:

- weergavenaam;
- merk wanneer aanwezig;
- korte verpakkingssamenvatting.

Als producten binnen een geopende categorie staan, is het categoriepad al zichtbaar als context en hoeft dit niet in elke rij herhaald te worden. Productkaarten in een geopende categorie staan op dezelfde visuele as en binnen dezelfde breedte als de inhoud van die geopende categorie.

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
/admin/product-catalogus/:productId
```

### Merkresultaat

Klik op een merkresultaat opent een brand-result state op dezelfde cataloguspagina.

Voorbeeld URL:

```text
/admin/product-catalogus?brandId=<brandId>
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
/admin/product-catalogus?categoryId=<categoryId>
```

Bij selectie van een categorieresultaat:

- wordt `q` verwijderd uit de URL;
- blijft de zoekbalk zichtbaar maar leeg;
- toont de pagina de breadcrumb direct onder de zoekbalk;
- toont de pagina de gekozen categorie met klikbare breadcrumb, directe subcategorieën en directe producten wanneer die bestaan;
- de primaire actie blijft `Product aanmaken` en neemt de gekozen `categoryId` als context mee.

## Product aanmaken vanuit browse en resultaten

`Product aanmaken` wordt alleen getoond wanneer er een expliciete context is waaruit het formulier betekenisvol kan worden voorgevuld.

| State | Knoptekst | Prefill |
| --- | --- | --- |
| Hoofdpagina/root | geen product-aanmaakactie; toon `Categorie aanmaken` | Niet van toepassing |
| Lege root zonder categorieën | geen product-aanmaakactie; toon `Categorie aanmaken` | Niet van toepassing |
| Categorie-browse | `Product aanmaken` | `categoryId` |
| Brand-result state | `Product aanmaken voor <merk>` | `brandId` |
| Alleen typed zoekterm | geen product-aanmaakactie | Niet van toepassing |

Regels:

- Alleen expliciet gekozen context wordt meegenomen.
- Een typed zoekterm wordt niet gebruikt als productnaam, merk of categorie en toont geen product-aanmaakactie.
- Op de rootpagina zonder geselecteerde categorie wordt geen product-aanmaakactie getoond.
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

## Lege rootcatalogus

Wanneer er nog geen rootcategorieën zijn:

```text
Alle categorieën
Er zijn geen categorieën gevonden.
Maak je eerste categorie aan om de catalogus op te bouwen.
[ Categorie aanmaken ]
```

De actie opent de rootcategorie-modal en maakt een categorie met `parentId: null`. De lege rootstate gebruikt dezelfde browse-inhoudszone met minimale hoogte, zodat de actie onder de inhoud blijft staan.

## Geen zoekresultaten

Wanneer zoeken niets oplevert:

```text
Geen resultaten gevonden voor "<zoekterm>".
Pas je zoekterm aan of kies een categorie om een product aan te maken.
```

Er wordt geen product-aanmaakactie getoond, omdat een zoekterm geen expliciete categorie- of merkcontext is.

## URL-state

De catalogus gebruikt queryparameters voor deelbare en testbare state:

```text
/admin/product-catalogus?q=<zoekterm>
/admin/product-catalogus?brandId=<brandId>
/admin/product-catalogus?categoryId=<categoryId>
/admin/product-catalogus/categorieen/<categoryId>/bewerken
```

`categoryId` bepaalt welke categorie in de categorieboom geopend is. Wanneer de beheerder een categorie opent, wordt de URL:

```text
/admin/product-catalogus?categoryId=<categoryId>
```

Wanneer deze URL direct wordt geopend:

- toont de catalogus de categorieboom;
- zijn alle parentcategorieën van de gekozen categorie opengeklapt;
- is de gekozen categorie zichtbaar als geopende categorierij;
- staan directe subcategorieën, directe producten en acties onder die geopende categorie.

Productkaarten binnen een categorie- of merkcontext linken naar productdetail en bewaren de cataloguscontext. Terugnavigatie vanuit productdetail of verpakkingspagina's brengt de beheerder terug naar dezelfde browsecontext waar dat logisch is.

Bij klikken op een merk- of categorieresultaat wordt `q` verwijderd. De zoekterm blijft niet als verborgen context bestaan. Bij klikken op het potloodicoon voor categorie bewerken wordt de bewerkroute direct zichtbaar in de URL.

## Benodigde backend/API

De browsepagina gebruikt de bestaande admin-dashboard endpoints:

```text
GET /products?categoryId=<categoryId>&limit=<limit>
GET /products?brandId=<brandId>&limit=<limit>
GET /products/search?query=<query>&productLimit=<limit>&brandLimit=<limit>&categoryLimit=<limit>
POST /categories
GET /admin/product-catalogus/categorieen/<categoryId>/bewerken
POST /admin/product-catalogus/categorieen/<categoryId>/bewerken
```

Voor rootcategorie-aanmaak verstuurt de UI:

```json
{
  "name": "Nieuwe categorie",
  "parentId": null
}
```

Voor subcategorie-aanmaak verstuurt de UI:

```json
{
  "name": "Nieuwe subcategorie",
  "parentId": 123
}
```

Regels:

- Voor rootcategorie-aanmaak is `parentId` altijd `null`.
- Voor subcategorie-aanmaak is `parentId` altijd de huidige categorie uit de actieve category-browse state.
- Voor categorie hernoemen verstuurt de HTML-route alleen de nieuwe `name`; de bestaande parent blijft behouden.
- Succesrespons `201 Created` bevat de nieuwe categorie met `id`, `name` en `parentId`.
- `409 CATEGORY_ALREADY_EXISTS` wordt als fout in de modal getoond.
- `400 VALIDATION_ERROR` of `400 REFERENCE_NOT_FOUND` wordt als veld- of modalfout getoond.

## Acceptatiecriteria

### AC-01 - Root toont categorieen

Gegeven dat de beheerder de productcatalogus opent zonder query of context  
Dan ziet de beheerder de titel `Alle categorieën` met de root-categorieën van de browsbare catalogus  
En geen platte lijst met alle producten  
En geen actie `Product aanmaken`  
En wel de actie `Categorie aanmaken`.

### AC-02 - Categorie openen

Gegeven dat een categorie bestaat  
Wanneer de beheerder de categorie opent  
Dan ziet de beheerder de zoekbalk boven de breadcrumb  
En ziet de beheerder een klikbare breadcrumb met `Alle categorieën` en het categoriepad boven de categorieboom  
En ziet de beheerder de geopende categorie als rij in de categorieboom  
En ziet de beheerder directe subcategorieën als ingesprongen categorierijen onder de geopende categorie  
En tonen subcategorieën alleen hun directe naam  
En ziet de beheerder directe producten in de sectie `Producten` onder de geopende categorie wanneer die bestaan  
En volgen subcategorieën, productsectie, productkaarten en actieknoppen dezelfde visuele boom-as  
En ziet de beheerder een lege categorietoestand met tekst `Deze categorie is nu nog leeg.` wanneer er geen directe subcategorieën en geen directe producten bestaan  
En ziet de beheerder een secundaire actie `Subcategorie aanmaken` naast de primaire actie `Product aanmaken` onder de geopende categorie  
En gebruikt `Product aanmaken` de geopende categorie als prefillcontext.

### AC-03 - Product openen

Gegeven dat een productrij zichtbaar is in een browsecontext  
Wanneer de beheerder het product opent  
Dan navigeert de UI naar productdetail  
En blijft de cataloguscontext beschikbaar voor terugnavigatie naar dezelfde geopende categorie of merkcontext.

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

### AC-06 - Geen productaanmaak vanuit zoekterm

Gegeven dat de beheerder alleen een zoekterm heeft getypt  
Wanneer de catalogus zoekresultaten of een geen-resultaten state toont  
Dan wordt de zoekterm niet gebruikt als productnaam-, merk- of categorie-prefill  
En toont de UI geen product-aanmaakactie zonder expliciete categorie- of merkcontext.

### AC-07 - Lege rootcatalogus

Gegeven dat er geen rootcategorieën bestaan  
Wanneer de beheerder de productcatalogus opent  
Dan ziet de beheerder een lege categorie-toestand met tekst `Er zijn geen categorieën gevonden.`  
En kan de beheerder de eerste categorie aanmaken  
En blijft de actie `Categorie aanmaken` onder de browse-inhoudszone staan.

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

### AC-10 - Subcategorie aanmaken vanuit browse

Gegeven dat de beheerder een categorie-browse pagina geopend heeft  
Wanneer de beheerder `Subcategorie aanmaken` kiest  
Dan opent een modal met titel `Nieuwe subcategorie maken in <huidige categorie>`  
En ziet de beheerder een invoerveld voor de subcategorienaam  
En ziet de beheerder de acties `Toevoegen` en `Annuleren`.

Wanneer de beheerder een geldige naam invult en `Toevoegen` kiest  
Dan wordt een directe subcategorie onder de huidige categorie aangemaakt  
En sluit de modal  
En blijft de beheerder op de huidige categorie-browse pagina  
En is de nieuwe subcategorie zichtbaar en klikbaar in de lijst met subcategorieën.

Wanneer de naam leeg is of al bestaat onder dezelfde parentcategorie  
Dan blijft de modal open  
En ziet de beheerder een duidelijke foutmelding.

### AC-11 - Rootcategorie aanmaken vanuit root

Gegeven dat de beheerder de catalogusroot geopend heeft  
Wanneer de beheerder `Categorie aanmaken` kiest  
Dan opent een modal met titel `Nieuwe categorie maken`  
En ziet de beheerder een invoerveld `Naam categorie`  
En ziet de beheerder de acties `Toevoegen` en `Annuleren`.

Wanneer de beheerder een geldige naam invult en `Toevoegen` kiest  
Dan wordt een rootcategorie met `parentId: null` aangemaakt  
En sluit de modal  
En blijft de beheerder op de rootcatalogus  
En is de nieuwe categorie zichtbaar en klikbaar in de lijst met rootcategorieën.

Wanneer de naam leeg is of al bestaat als rootcategorie  
Dan blijft de modal open  
En ziet de beheerder een duidelijke foutmelding.

### AC-12 - Categorie bewerken vanuit categorieboom

Gegeven dat categorieën zichtbaar zijn in de categorieboom  
Dan ziet de beheerder rechts in elk categorie-item een potloodicoon om te bewerken.

Wanneer de beheerder het potloodicoon bij een categorie kiest  
Dan opent de route `/admin/product-catalogus/categorieen/<categoryId>/bewerken`  
En is deze route direct zichtbaar in de browser-URL  
En ziet de beheerder een modal `Categorie bewerken` met het veld `Naam categorie` voorgevuld met de huidige naam.

Wanneer de beheerder een geldige nieuwe naam invult en `Opslaan` kiest  
Dan wordt de categorienaam aangepast  
En blijft parent, sortering, producten en subcategorieën ongewijzigd  
En keert de beheerder terug naar de bijbehorende categorielijst waar de nieuwe naam zichtbaar is.

Wanneer de naam leeg is of al bestaat onder dezelfde parent/root  
Dan blijft de modal open  
En ziet de beheerder een duidelijke foutmelding.
