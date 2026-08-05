# Specificatie - browsbare productcatalogus

## Status

- Onderdeel: admin dashboard > productcatalogus
- Route: `/product-catalogus`
- Status: geimplementeerd; categorietitel, subcategorie-aanmaak en categorienaam bewerken toegevoegd
- Gerelateerde specs:
  - [product-zoeken-specificatie.md](./product-zoeken-specificatie.md)
  - [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md)
  - [product-detail-specificatie.md](./product-detail-specificatie.md)
  - [product-archiveren-specificatie.md](./product-archiveren-specificatie.md)

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
- Standaard alleen actieve producten tonen.
- Via een expliciet statusfilter gearchiveerde producten terugvinden.
- Category-browse state tonen na klikken op een categorie in de categorieboom.
- Lege root tonen wanneer er nog geen categorieën zijn.
- Lege geopende categorie tonen wanneer er geen directe subcategorieën en geen directe producten zijn.
- Rootcategorieën aanmaken vanaf de catalogusroot.
- Categorieën hernoemen vanuit de categorieboom.
- De product-aanmaakactie alleen tonen wanneer er een expliciete en eenduidige categoriecontext is, niet op de catalogusroot.

## Buiten scope

- Producten of verpakkingen definitief verwijderen.
- Archiveren of heractiveren vanuit de browsekaart; deze acties staan op detail.
- Categorieën verwijderen, verplaatsen of hersorteren op de cataloguspagina.
- Extra verpakkingen beheren op de cataloguspagina.
- Publicatiestatus naast actief/gearchiveerd.
- Oude trapsgewijze productmanagement-flow.

## UI-specificatie

De paginaopbouw, categorieboom, productpresentatie, modals en lege states staan in [productcatalogus-browsen-ui-specificatie.md](./productcatalogus-browsen-ui-specificatie.md).

De catalogusroot toont geen platte productlijst en geen product-aanmaakactie. Een geopende categorie toont haar directe subcategorieën en directe producten en biedt de contextuele acties `+ Subcategorie` en `+ Product`.

## Browsegedrag

- Wanneer de beheerder een al geopende categorie opnieuw kiest, klapt die categorie dicht en opent de catalogus de parentcategorie of, zonder parent, de rootcatalogus.
- De breadcrumb begint met `Alle categorieën`. Dit segment opent `/product-catalogus` zonder catalogusqueryparameters; iedere ancestor opent `/product-catalogus?categoryId=<categoryId>`. Een geldige `source` blijft behouden.
- Directe producten staan bij de geopende categorie. Producten uit een onderliggende subcategorie verschijnen pas wanneer die subcategorie wordt geopend.
- Iedere productrij opent `/product-catalogus/:productId` en behoudt de browsecontext voor terugnavigatie.
- Ook lege directe subcategorieën blijven zichtbaar, zodat de beheerder na aanmaken verder door de catalogus kan navigeren.

## Rootcategorie aanmaken vanuit de catalogusroot

De actie `Categorie aanmaken` staat alleen op de rootpagina zonder geselecteerde categorie.

De actie opent de rootcategorie-modal uit de [UI-specificatie](./productcatalogus-browsen-ui-specificatie.md).

Regels:

- De modal maakt een rootcategorie met `parentId: null`.
- `Annuleren` sluit de modal zonder wijziging en keert terug naar `/product-catalogus`.
- Een lege of alleen uit whitespace bestaande naam kan niet worden opgeslagen.
- Bij een backendvalidatiefout of dubbele rootcategorienaam blijft de modal open en toont de UI de fout bij het veld of in de modal.
- Na succesvol aanmaken sluit de modal, blijft de beheerder op de rootpagina en wordt de lijst met rootcategorieën vernieuwd zodat de nieuwe categorie zichtbaar is.
- De nieuwe categorie linkt naar `/product-catalogus?categoryId=<nieuwCategoryId>`.

## Subcategorie aanmaken vanuit categorie-browse

De actie `+ Subcategorie` staat in dezelfde actiezone als `+ Product` onder de geopende categorie.

De actie opent de subcategorie-modal uit de UI-specificatie.

Regels:

- De modal maakt een directe childcategorie onder de huidige categorie.
- `Annuleren` sluit de modal zonder wijziging.
- Buiten de modal klikken of Escape sluit de modal zonder wijziging, tenzij dit conflicteert met bestaande modalrichtlijnen.
- Een lege of alleen uit whitespace bestaande naam kan niet worden opgeslagen.
- Bij een backendvalidatiefout of dubbele siblingnaam blijft de modal open en toont de UI de fout bij het veld of in de modal.
- Na succesvol aanmaken sluit de modal, blijft de beheerder op de huidige categoriepagina en wordt de lijst met subcategorieën vernieuwd zodat de nieuwe subcategorie zichtbaar is.
- De nieuwe subcategorie linkt naar `/product-catalogus?categoryId=<nieuwCategoryId>`.

## Categorie beheren vanuit de categorieboom

Elke zichtbare categorie in de rootlijst en subcategorielijst heeft rechts binnen hetzelfde categorie-item een beheerknop met potloodicoon en de toegankelijke naam `Categorie <naam> beheren`. De knop heeft geen eigen kaart, outline of scheidingslijn.

De beheerknop opent een compact actiemenu met:

- `Naam wijzigen`;
- `Verwijderen`.

Het menu sluit bij een klik buiten het menu en bij `Escape`. De categorie zelf blijft afzonderlijk klikbaar om de categorieboom te openen of sluiten.

### Naam wijzigen

`Naam wijzigen` opent de modal op de route:

```text
/product-catalogus/categorieen/<categoryId>/bewerken
```

Regels:

- De route is direct zichtbaar en deelbaar.
- De categorie-bewerken-modal uit de UI-specificatie is voorgevuld met de huidige categorienaam.
- `Annuleren` sluit de modal zonder wijziging en keert terug naar de lijst waarin de categorie stond: root voor rootcategorieën, of de parentcategorie voor subcategorieën.
- Een lege of alleen uit whitespace bestaande naam kan niet worden opgeslagen.
- Een naam die al bestaat bij dezelfde parentcategorie/root blijft geblokkeerd.
- Bij een backendvalidatiefout of dubbele siblingnaam blijft de modal open en toont de UI de fout bij het veld of in de modal.
- Eén klik op `Opslaan` verwerkt de wijziging. Na succesvol opslaan sluit de modal direct en wordt de beheerder teruggestuurd naar de bijbehorende categorielijst, waar de nieuwe naam zichtbaar is.
- Hernoemen wijzigt alleen de categorienaam; parent, sortering, producten en subcategorieën blijven ongewijzigd.

### Verwijderen

`Verwijderen` gebruikt `DELETE /categories/:id`. De actie vraagt in deze versie geen extra bevestigingsdialoog.

Regels:

- De backend blokkeert verwijderen wanneer de categorie subcategorieën of producten bevat.
- Een backendfout wordt als zichtbare formulierfout op de cataloguspagina getoond en laat de categorie bestaan.
- Na succesvolle verwijdering verdwijnt de categorie uit de boom.
- Na verwijdering van een subcategorie navigeert de beheerder naar de parentcategorie; na verwijdering van een rootcategorie naar de catalogusroot.
- Een geldige `source`-context blijft bij deze redirect behouden.

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
/product-catalogus?categoryId=<categoryId>
/product-catalogus/categorieen/<categoryId>/bewerken
```

`categoryId` bepaalt welke categorie in de categorieboom geopend is. De optionele parameter `status=archived` opent expliciet de gearchiveerde catalogusstate; zonder deze parameter is de status actief. Wanneer de beheerder een categorie opent, wordt de URL:

```text
/product-catalogus?categoryId=<categoryId>
```

Wanneer deze URL direct wordt geopend:

- toont de catalogus de categorieboom;
- zijn alle parentcategorieën van de gekozen categorie opengeklapt;
- is de gekozen categorie zichtbaar als geopende categorierij;
- staan directe subcategorieën, directe producten en acties onder die geopende categorie.

Productkaarten binnen een categoriecontext linken naar productdetail en bewaren de cataloguscontext. Terugnavigatie vanuit productdetail of verpakkingspagina's brengt de beheerder terug naar dezelfde browsecontext waar dat logisch is.

Bij `Naam wijzigen` in het categorie-actiemenu wordt de bewerkroute direct zichtbaar in de URL.

## Benodigde backend/API

De browsepagina gebruikt de bestaande admin-dashboard endpoints:

```text
GET /products?categoryId=<categoryId>&status=<active|archived>&limit=<limit>
POST /categories
DELETE /categories/:categoryId
GET /product-catalogus/categorieen/<categoryId>/bewerken
POST /product-catalogus/categorieen/<categoryId>/bewerken
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
En staan in die lege categorietoestand de secundaire actie `+ Subcategorie` en de primaire actie `+ Product` samen binnen het lege-state-kaartje, onder de uitlegtekst  
En ziet de beheerder in een niet-lege categorie de secundaire actie `+ Subcategorie` naast de primaire actie `+ Product` onder de geopende categorie  
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

### AC-10 - Categorie beheren vanuit categorieboom

Gegeven dat categorieën zichtbaar zijn in de categorieboom  
Dan ziet de beheerder rechts in elk categorie-item een beheerknop met potloodicoon.

Wanneer de beheerder de knop bij een categorie kiest
Dan opent een actiemenu met `Naam wijzigen` en `Verwijderen`
En sluit dit menu bij `Escape` of een klik erbuiten.

Wanneer de beheerder `Naam wijzigen` kiest
Dan opent de route `/product-catalogus/categorieen/<categoryId>/bewerken`  
En is deze route direct zichtbaar in de browser-URL  
En ziet de beheerder een modal `Categorie bewerken` met het veld `Naam categorie` voorgevuld met de huidige naam.

Wanneer de beheerder een geldige nieuwe naam invult en één keer `Opslaan` kiest
Dan wordt de categorienaam aangepast  
En sluit de modal direct na de succesvolle verwerking
En blijft parent, sortering, producten en subcategorieën ongewijzigd  
En keert de beheerder terug naar de bijbehorende categorielijst waar de nieuwe naam zichtbaar is.

Wanneer de naam leeg is of al bestaat onder dezelfde parent/root  
Dan blijft de modal open  
En ziet de beheerder een duidelijke foutmelding.

Wanneer de beheerder `Verwijderen` kiest voor een lege categorie
Dan wordt de categorie verwijderd
En navigeert de beheerder naar de parentcategorie of, voor een rootcategorie, naar de catalogusroot
En blijft een geldige `source`-context behouden.

Wanneer de categorie nog subcategorieën of producten bevat
Dan blokkeert de backend de verwijdering
En blijft de categorie zichtbaar.

### AC-11 - Gearchiveerde producten browsen

Gegeven dat de catalogus standaard geopend is
Dan toont zij alleen actieve producten.
Wanneer de beheerder het statusfilter `Gearchiveerd` kiest
Dan gebruikt de URL `status=archived`
En toont iedere productkaart een zichtbaar statuslabel
En kan de beheerder productdetail openen om het product te heractiveren.
