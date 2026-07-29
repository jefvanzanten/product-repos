# Specificatie - browsbare productcatalogus

## Status

- Onderdeel: admin dashboard > productcatalogus
- Route: `/admin/product-catalogus`
- Status: geimplementeerd; categorietitel, subcategorie-aanmaak en categorienaam bewerken toegevoegd
- Gerelateerde specs:
  - [product-zoeken-specificatie.md](./product-zoeken-specificatie.md)
  - [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md)
  - [product-detail-specificatie.md](./product-detail-specificatie.md)

Deze spec is leidend voor de browsbare productcatalogus: de categorieboom, categorie-inhoud, categoriebeheer op de browsepagina en de primaire toegang tot product aanmaken vanuit een expliciete categoriecontext. Zoekgedrag, zoekresultaten en zoekgestuurde resultaatstates staan in [product-zoeken-specificatie.md](./product-zoeken-specificatie.md).

## Doel

Een beheerder kan door bestaande catalogusdata bladeren, rootcategorieën beheren op de catalogusroot, concrete producten openen, vanuit een gekozen categorie sneller een nieuw product aanmaken en vanuit een geopende categorie direct een subcategorie toevoegen.

## Binnen scope voor deze feature

- Productcatalogus openen als browsbare pagina.
- Categorieboom tonen als primaire browse-navigatie.
- Directe subcategorieën en directe producten van een gekozen categorie in de categorieboom tonen.
- De gekozen categorie als opengeklapte categorierij met bijbehorende inhoud tonen.
- Vanuit de opengeklapte categorie een directe subcategorie aanmaken.
- Producten ophalen en tonen als productrijen of productkaarten.
- Productrijen linken naar productdetail.
- Category-browse state tonen na klikken op een categorie in de categorieboom.
- Lege root tonen wanneer er nog geen categorieën zijn.
- Lege geopende categorie tonen wanneer er geen directe subcategorieën en geen directe producten zijn.
- Rootcategorieën aanmaken vanaf de catalogusroot.
- Categorieën hernoemen vanuit de categorieboom.
- De product-aanmaakactie alleen tonen wanneer er een expliciete en eenduidige categoriecontext is, niet op de catalogusroot.

## Buiten scope

- Producten verwijderen of archiveren.
- Categorieën verwijderen, verplaatsen of hersorteren op de cataloguspagina.
- Extra verpakkingen beheren op de cataloguspagina.
- Productfoto's of publicatiestatus.
- Oude trapsgewijze productmanagement-flow.

## Layout

De admin-navigatie toont al dat de beheerder zich op `Productcatalogus` bevindt. De cataloguspagina rendert daarom geen extra paginakop `Productcatalogus` in de contentzone onder de navbar; de inhoud start compact onder de admin-navbar met de zoekbalk, de breadcrumb en daarna de contextuele browse-inhoud. De zoekbalk staat direct onder de navigatie met beperkte verticale tussenruimte.

De breadcrumb is leidend voor elke productcataloguspagina die een categoriecontext toont of de catalogusroot toont. De breadcrumb gebruikt `1.05rem` tekstgrootte met `1.5rem` regelhoogte, zodat deze zichtbaarer is dan standaardtekst maar niet als aparte paginatitel voelt.

Alle schermopbouw, plaatsing, visuele volgorde en lege browse-states staan in deze sectie. Gedrag en backendregels staan in de latere secties.

### Hoofdpagina zonder context

Wanneer de beheerder `/admin/product-catalogus` opent zonder query of context, toont de pagina de root van de catalogus.

```text
[ Zoek product, merk of categorie ]

Alle categorieën
- Dranken
- Voeding
- Huishouden

[ Categorie aanmaken ]
```

Op de rootpagina wordt geen product-aanmaakactie getoond, omdat er nog geen expliciete categoriecontext is. De rootpagina toont wel de actie `Categorie aanmaken`; deze maakt een nieuwe rootcategorie. De rootpagina toont geen afzonderlijke titel `Alle categorieën` in de contentkaart; de breadcrumb met alleen `Alle categorieën` is de zichtbare context.

De hoofdpagina toont geen platte lijst met alle producten. Browsen verloopt via categorieën. Producten kunnen pas vanuit een gekozen categorie of subcategorie worden aangemaakt.

### Categorie-browse

Wanneer de beheerder een categorie opent, toont de catalogus een openklapbare categorieboom. De geopende categorie blijft zichtbaar als rij in die boom. Direct onder die rij staat de inhoud die bij de geopende categorie hoort.

De pagina toont boven de categorieboom:

- de zoekbalk;
- een klikbare breadcrumb met `Alle categorieën` en het categoriepad van root naar de geopende categorie.

Een geopende categorie toont in deze volgorde:

1. de categorierij zelf, met categorienaam en bewerkicoon;
2. directe subcategorieën, als ingesprongen categorierijen onder de geopende categorie;
3. directe producten, onder de sectietitel `Producten`, wanneer de categorie directe producten bevat;
4. de acties `+ Subcategorie` en `+ Product`.

Voorbeeld met subcategorieën en directe producten:

```text
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

      [ + Subcategorie ] [ + Product ]

  ▸ Vleeswaren
```

Voorbeeld met subcategorieën en zonder directe producten:

```text
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

    [ + Subcategorie ] [ + Product ]
```

Regels:

- De zoekbalk blijft zichtbaar in categorie-browse.
- De adminnavigatie, zoekbalk en breadcrumb blijven op hun plek staan; alleen de categorieboom scrolt wanneer de browse-inhoud hoger is dan de beschikbare viewport.
- Wanneer de beheerder een al geopende categorie in de categorieboom opnieuw kiest, klapt die categorie dicht; de catalogus opent dan de parentcategorie, of de rootcatalogus wanneer de gekozen categorie geen parent heeft.
- De breadcrumb staat direct onder de zoekbalk en boven de categorieboom.
- De breadcrumb gebruikt `1.05rem` tekstgrootte met `1.5rem` regelhoogte.
- De breadcrumb begint altijd met `Alle categorieën` en toont daarna het categoriepad van root naar de geopende categorie.
- `Alle categorieën` linkt naar `/admin/product-catalogus` zonder queryparameters.
- Elke ancestorcategorie in de breadcrumb opent `/admin/product-catalogus?categoryId=<categoryId>`.
- Het laatste breadcrumbsegment toont de geopende categorie als huidige context.
- Elke categoriekaart of -rij toont rechts binnen hetzelfde categorie-item een potloodicoon om de categorie te bewerken. Het potloodicoon heeft geen eigen kaart, outline of scheidingslijn.
- Het potloodicoon opent `/admin/product-catalogus/categorieen/<categoryId>/bewerken`; bij browsernavigatie wordt deze route direct zichtbaar in de browser-URL.
- Directe subcategorieën staan onder de geopende categorierij en tonen alleen hun eigen naam.
- Producten die direct aan de geopende categorie hangen, staan in de sectie `Producten` onder die categorie.
- Producten uit onderliggende subcategorieën staan pas onder die subcategorie wanneer de beheerder die subcategorie opent.
- De inhoud onder een geopende categorie hoort visueel bij die categorie: subcategorieën, productsectie, productkaarten en actieknoppen volgen dezelfde boom-as en blijven binnen dezelfde breedte als de geopende categoriecontext.
- De contextuele product-aanmaakactie gebruikt de korte knoptekst `+ Product`.
- De categoriecontext voor product aanmaken blijft de geopende categorie en wordt via `categoryId` meegegeven.
- Er is één primaire knop `+ Product`; daarnaast staat maximaal één secundaire knop `+ Subcategorie`.
- `+ Subcategorie` en `+ Product` staan samen onder de inhoud van de geopende categorie.

### Lege categorieën in browse

De browsepagina is geen volledige categoriebeheerinterface, maar ondersteunt wel het aanmaken van directe subcategorieën vanuit een geopende categorie.

Wanneer een geopende categorie geen directe producten heeft, maar wel subcategorieën, toont de geopende categorie haar directe subcategorieën, de actie `+ Subcategorie` en de contextuele product-aanmaakactie.

Wanneer een geopende categorie geen directe producten en geen subcategorieën heeft:

```text
[ Zoek product, merk of categorie ]

Alle categorieën > ... > <Naam huidige categorie>

▾ <Naam huidige categorie>
  Deze categorie is nu nog leeg.
  Maak een nieuwe subcategorie of een product aan om hem te vullen.

  [ + Subcategorie ] [ + Product ]
```

Deze lege categorietoestand wordt getoond wanneer de geopende categorie helemaal leeg is: geen directe subcategorieën en geen directe producten. Ook in deze lege categorietoestand gebruikt de product-aanmaakactie de huidige `categoryId` als prefillcontext. De actieknoppen staan onder de lege-state-inhoud op dezelfde boom-as als de geopende categorie-inhoud.

Directe subcategorieën van de geopende categorie worden getoond, ook wanneer ze nog geen producten in hun eigen subtree hebben. Dit is nodig zodat een beheerder feedback krijgt na subcategorie-aanmaak en verder kan navigeren om de catalogus op te bouwen.

### Productrij of productkaart

Elke concrete productrij of productkaart linkt naar productdetail:

```text
/admin/product-catalogus/:productId
```

Wanneer de productrij vanuit een categoriecontext wordt geopend, blijft die browsecontext beschikbaar voor terugnavigatie naar de catalogus.

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

### Lege rootcatalogus

Wanneer er nog geen rootcategorieën zijn:

```text
Alle categorieën
Er zijn geen categorieën gevonden.
Maak je eerste categorie aan om de catalogus op te bouwen.
[ Categorie aanmaken ]
```

De actie opent de rootcategorie-modal en maakt een categorie met `parentId: null`. De lege rootstate gebruikt dezelfde browse-inhoudszone met minimale hoogte, zodat de actie onder de inhoud blijft staan.

### Modals

Rootcategorie aanmaken:

```text
Nieuwe categorie maken

[ Naam categorie ]

[ Toevoegen ] [ Annuleren ]
```

Subcategorie aanmaken, bijvoorbeeld in `Brood en broodvervangers`:

```text
Nieuwe subcategorie maken in Brood en broodvervangers

[ Naam subcategorie ]

[ Toevoegen ] [ Annuleren ]
```

Categorie bewerken:

```text
Categorie bewerken

[ Naam categorie ]

[ Opslaan ] [ Annuleren ]
```

Modalregels:

- Modals tonen geen extra uitlegtekst; alleen de modaltitel, het invoerveld en de acties zijn zichtbaar.
- Invoervelden hebben een toegankelijke naam (`Naam categorie` of `Naam subcategorie`). Als het ontwerp visueel alleen een veld toont, mag het label visueel verborgen zijn.
- `Toevoegen` of `Opslaan` is de bevestigingsactie.
- `Annuleren` is de annuleeractie.

## Rootcategorie aanmaken vanuit de catalogusroot

De actie `Categorie aanmaken` staat alleen op de rootpagina zonder geselecteerde categorie.

De actie opent de rootcategorie-modal uit Layout.

Regels:

- De modal maakt een rootcategorie met `parentId: null`.
- `Annuleren` sluit de modal zonder wijziging en keert terug naar `/admin/product-catalogus`.
- Een lege of alleen uit whitespace bestaande naam kan niet worden opgeslagen.
- Bij een backendvalidatiefout of dubbele rootcategorienaam blijft de modal open en toont de UI de fout bij het veld of in de modal.
- Na succesvol aanmaken sluit de modal, blijft de beheerder op de rootpagina en wordt de lijst met rootcategorieën vernieuwd zodat de nieuwe categorie zichtbaar is.
- De nieuwe categorie linkt naar `/admin/product-catalogus?categoryId=<nieuwCategoryId>`.

## Subcategorie aanmaken vanuit categorie-browse

De actie `+ Subcategorie` staat in dezelfde actiezone als `+ Product` onder de geopende categorie.

De actie opent de subcategorie-modal uit Layout.

Regels:

- De modal maakt een directe childcategorie onder de huidige categorie.
- `Annuleren` sluit de modal zonder wijziging.
- Buiten de modal klikken of Escape sluit de modal zonder wijziging, tenzij dit conflicteert met bestaande modalrichtlijnen.
- Een lege of alleen uit whitespace bestaande naam kan niet worden opgeslagen.
- Bij een backendvalidatiefout of dubbele siblingnaam blijft de modal open en toont de UI de fout bij het veld of in de modal.
- Na succesvol aanmaken sluit de modal, blijft de beheerder op de huidige categoriepagina en wordt de lijst met subcategorieën vernieuwd zodat de nieuwe subcategorie zichtbaar is.
- De nieuwe subcategorie linkt naar `/admin/product-catalogus?categoryId=<nieuwCategoryId>`.

## Categorie bewerken vanuit de categorieboom

Elke zichtbare categorie in de rootlijst en subcategorielijst heeft rechts binnen hetzelfde categorie-item een potloodicoon met een toegankelijke naam zoals `Categorie <naam> bewerken`. Het potloodicoon heeft geen eigen kaart, outline of scheidingslijn.

De bewerkactie opent een modal op de route:

```text
/admin/product-catalogus/categorieen/<categoryId>/bewerken
```

Regels:

- De route is direct zichtbaar/deelbaar wanneer de beheerder het potloodicoon gebruikt.
- De categorie-bewerken-modal uit Layout is voorgevuld met de huidige categorienaam.
- `Annuleren` sluit de modal zonder wijziging en keert terug naar de lijst waarin de categorie stond: root voor rootcategorieën, of de parentcategorie voor subcategorieën.
- Een lege of alleen uit whitespace bestaande naam kan niet worden opgeslagen.
- Een naam die al bestaat bij dezelfde parentcategorie/root blijft geblokkeerd.
- Bij een backendvalidatiefout of dubbele siblingnaam blijft de modal open en toont de UI de fout bij het veld of in de modal.
- Na succesvol opslaan sluit de modal en wordt de beheerder teruggestuurd naar de bijbehorende categorielijst, waar de nieuwe naam zichtbaar is.
- Hernoemen wijzigt alleen de categorienaam; parent, sortering, producten en subcategorieën blijven ongewijzigd.

## Productlimieten en meer laden

Per getoonde productlijst worden in de eerste versie maximaal 50 producten getoond.

Als er meer producten zijn, toont de UI:

```text
[ Meer laden ]
```

Dit geldt voor directe producten in een categorie.


## Product aanmaken vanuit browse

De product-aanmaakactie wordt alleen getoond wanneer er een expliciete categoriecontext is waaruit het formulier betekenisvol kan worden voorgevuld.

| State                        | Knoptekst                                            | Prefill             |
| ---------------------------- | ---------------------------------------------------- | ------------------- |
| Hoofdpagina/root             | geen product-aanmaakactie; toon `Categorie aanmaken` | Niet van toepassing |
| Lege root zonder categorieën | geen product-aanmaakactie; toon `Categorie aanmaken` | Niet van toepassing |
| Categorie-browse             | `+ Product`                                          | `categoryId`        |

Regels:

- Alleen expliciet gekozen categoriecontext wordt meegenomen.
- Op de rootpagina zonder geselecteerde categorie wordt geen product-aanmaakactie getoond.
- In categorie-browse blijft de knoptekst kort: `+ Product`.
- De volledige categoriecontext staat zichtbaar via de klikbare breadcrumb.

Voorbeeld:

```text
+ Product
```

## URL-state

De browsecatalogus gebruikt queryparameters en routes voor deelbare en testbare categoriebrowse-state:

```text
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

Productkaarten binnen een categoriecontext linken naar productdetail en bewaren de cataloguscontext. Terugnavigatie vanuit productdetail of verpakkingspagina's brengt de beheerder terug naar dezelfde browsecontext waar dat logisch is.

Bij klikken op het potloodicoon voor categorie bewerken wordt de bewerkroute direct zichtbaar in de URL.

## Benodigde backend/API

De browsepagina gebruikt de bestaande admin-dashboard endpoints:

```text
GET /products?categoryId=<categoryId>&limit=<limit>
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
Dan ziet de beheerder de breadcrumb `Alle categorieën` met daaronder de root-categorieën van de browsbare catalogus  
En ziet de beheerder geen afzonderlijke contenttitel `Alle categorieën`  
En geen platte lijst met alle producten  
En geen actie `+ Product`  
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
En ziet de beheerder een secundaire actie `+ Subcategorie` naast de primaire actie `+ Product` onder de geopende categorie  
En gebruikt `+ Product` de geopende categorie als prefillcontext.

### AC-03 - Product openen

Gegeven dat een productrij zichtbaar is in een browsecontext  
Wanneer de beheerder het product opent  
Dan navigeert de UI naar productdetail  
En blijft de cataloguscontext beschikbaar voor terugnavigatie naar dezelfde geopende categorie.

### AC-04 - Contextueel product aanmaken vanuit categorie

Gegeven dat de beheerder in een categorie-browse state zit  
Wanneer de beheerder de primaire aanmaakactie kiest  
Dan opent het productformulier met de expliciete categoriecontext vooraf geselecteerd  
En gebruikt categorie-browse de korte knoptekst `+ Product`.

### AC-05 - Lege rootcatalogus

Gegeven dat er geen rootcategorieën bestaan  
Wanneer de beheerder de productcatalogus opent  
Dan ziet de beheerder een lege categorie-toestand met tekst `Er zijn geen categorieën gevonden.`  
En kan de beheerder de eerste categorie aanmaken  
En blijft de actie `Categorie aanmaken` onder de browse-inhoudszone staan.

### AC-06 - Geen oude flow

Gegeven dat de browsbare catalogus wordt gebouwd  
Dan gebruikt de UI alleen categorie, merk, product en verpakking  
En wordt er geen oude trapsgewijze productmanagement-flow teruggebracht.

### AC-07 - Breadcrumb navigatie

Gegeven dat de beheerder in een geneste categorie zit  
Wanneer de beheerder `Alle categorieën` in de breadcrumb kiest  
Dan opent de rootcatalogus zonder `categoryId`  
En wanneer de beheerder een ancestorcategorie in de breadcrumb kiest  
Dan opent de catalogus die categorie met `categoryId=<ancestorCategoryId>`.

### AC-08 - Subcategorie aanmaken vanuit browse

Gegeven dat de beheerder een categorie-browse pagina geopend heeft  
Wanneer de beheerder `+ Subcategorie` kiest  
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

### AC-09 - Rootcategorie aanmaken vanuit root

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

### AC-10 - Categorie bewerken vanuit categorieboom

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
