# Specificatie - product aanmaken

## Status

- Onderdeel: admin dashboard > productcatalogus
- Route: `/admin/product-catalogus/nieuw`
- Status: geïmplementeerde basis; afbeeldingen, Calorie Tracker-data en macroprofiel zijn concept
- Backendcontract: `docs/backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md`
- Datamodel: `docs/backend/ERD/PRODUCT_ERD.md`
- Gerelateerde specs:
  - [product-detail-specificatie.md](./product-detail-specificatie.md)
  - [product-archiveren-specificatie.md](./product-archiveren-specificatie.md)

## Doel

Een beheerder kan zonder verplichte zoekstap een product aanmaken met:

1. een categorie;
2. optioneel een merk;
3. een productnaam;
4. precies één eerste verpakking;
5. optioneel een product- en verpakkingsafbeelding;
6. optionele beschikbaarheid voor de Calorie Tracker;
7. optioneel een macroprofiel.

Opslaan maakt transactioneel één `product`, één eerste `product_package` en eventuele Calorie Tracker-data aan. Na succesvol opslaan navigeert de UI naar productdetail van het nieuwe product.

## Binnen scope

- Productformulier openen vanuit een expliciete categorie- of merkcontext.
- Productformulier openen met expliciete context via queryparameters:
  - `brandId` voor vooraf geselecteerd merk;
  - `categoryId` voor vooraf geselecteerde categorie.
- Categorie kiezen uit een categorieboom.
- Eén categorie inline aanmaken als hoofdcategorie of onder een bestaande categorie.
- Categorie verwijderen vanuit het formulier wanneer de backend dit toestaat.
- Merk optioneel zoeken, kiezen of vanuit het merkveld aanmaken.
- Productnaam invullen.
- Een optionele productafbeelding kiezen.
- Optioneel het product beschikbaar maken voor de Calorie Tracker en exact één consumptietype kiezen.
- Optioneel een macroprofiel op productniveau toevoegen.
- Eerste verpakking en een optionele verpakkingsafbeelding invullen.
- Product opslaan via `POST /products`.
- Na succesvol opslaan redirecten naar productdetail.
- Backendfouten zichtbaar maken zonder ingevulde waarden te wissen.

## Buiten scope

- Op dezelfde aanmaakpagina blijven na succesvol opslaan.
- Producten bewerken.
- Extra verpakkingen toevoegen of bewerken.
- Echte productresultaten op de cataloguspagina.
- Barcode/EAN.
- Producten of verpakkingen definitief verwijderen.
- Archiveren tijdens de eerste aanmaak; een nieuw product start actief.
- Apart merken- of categoriebeheer buiten de acties in dit formulier.
- Een apart veld `eenheidsoort`.

## Layout

```text
<- Productcatalogus
Product aanmaken
Vul categorie, merk, product en verpakking in.

Categorie
- bestaande categorieboom
- hoofdcategorie toevoegen
- subcategorie toevoegen
- categorie verwijderen wanneer toegestaan

Merk, optioneel
- typ om merken te zoeken
- bestaand merk kiezen
- nieuw merk aanmaken

Product
- productnaam
- optionele productafbeelding
- live weergavenaam: merk + productnaam

Calorie Tracker, standaard uit
- beschikbaar voor Calorie Tracker
- consumptietype: voeding, drinken of supplement

Voedingswaarden, standaard uit
- macroprofiel toevoegen
- referentiebasis
- optionele calorieën, eiwit, koolhydraten en vet
- voorlopige berekende calorieën wanneer mogelijk

Verpakking
- verpakkingstype
- inhoud + inhoudseenheid
- aantal per verpakking
- optionele verpakkingsafbeelding

[ Product opslaan ]
```

Layoutregels:

- Bij een vooraf geselecteerde categorie via `categoryId` mag de categorieboom initieel alleen het pad naar die categorie openklappen en mogen andere, niet-bijbehorende categorieën ingeklapt blijven.

## Gedrag

### Laden

De pagina haalt vooraf benodigde referentiedata op:

- `GET /categories`
- `GET /package-types`
- `GET /unit-types`

Merken worden gezocht wanneer de gebruiker in het merkveld typt:

- `GET /brands?query=<zoekterm>`

Als de route wordt geopend met `brandId` of `categoryId`, worden deze alleen gebruikt als expliciete context die vooraf geselecteerd mag worden. Een queryparameter `q` wordt nooit gebruikt als productnaam, merknaam of categorienaam.

### Categorie kiezen en aanmaken

- Categorie is verplicht.
- Producten mogen aan elke categorie worden gekoppeld, ook aan een parentcategorie.
- Inline aanmaken gebruikt `POST /categories`.
- De nieuwe categorie wordt na succesvol aanmaken geselecteerd.
- Product- en verpakkingsvelden blijven behouden bij succes en bij fout.
- Duplicaat onder dezelfde parent toont `CATEGORY_ALREADY_EXISTS`.

### Categorie verwijderen

- Verwijderen gebruikt `DELETE /categories/:id`.
- Bij succesvolle verwijdering verdwijnt de categorie uit de boom.
- Als de verwijderde categorie geselecteerd was, wordt de selectie leeggemaakt.
- Product- en verpakkingsvelden blijven behouden bij succes en bij fout.
- Backend kan verwijderen blokkeren met:
  - `CATEGORY_HAS_CHILDREN`
  - `CATEGORY_HAS_PRODUCTS`
  - `REFERENCE_NOT_FOUND`
  - `VALIDATION_ERROR`

### Merk kiezen of aanmaken

- Merk is optioneel.
- Suggesties verschijnen vanaf minimaal twee tekens.
- De gebruiker kiest expliciet een bestaand merk of bevestigt een nieuw merk.
- De actie voor een nieuw merk wordt getoond als `Merk “<naam>” aanmaken`; de UI-tekst gebruikt niet het woord `inline`.
- Nieuw merk gebruikt `POST /brands`.
- `POST /brands` retourneert `201` voor nieuw en `200` voor bestaand/hergebruikt merk.
- Als er tekst in het merkveld staat zonder gekozen of bevestigd merk, blokkeert de UI opslaan met een veldfout.

### Productnaam en weergavenaam

- Productnaam is verplicht.
- Productnaam wordt getrimd voor validatie/opslag.
- Weergavenaam is alleen UI: `<merk> <productnaam>` of alleen productnaam.
- `displayName` wordt niet naar de backend gestuurd.

### Calorie Tracker-beschikbaarheid

- De sectie staat standaard uit.
- Zonder ingeschakelde beschikbaarheid verschijnt het product niet in productzoeken van de Calorie Tracker.
- Bij inschakelen is exact één consumptietype verplicht: `voeding`, `drinken` of `supplement`.
- Een macroprofiel is niet verplicht om het product te kunnen loggen.
- Een product zonder macroprofiel draagt niet bij aan calorie- of macrototalen.

### Optioneel macroprofiel

- Het macroprofiel hoort bij het product en niet bij een afzonderlijke verpakking.
- De sectie staat standaard uit.
- De beheerder kiest een expliciete referentiebasis: `100 g`, `100 ml` of `1 stuk/dosis`.
- `100 g` is de standaardkeuze.
- Calorieën, eiwit, koolhydraten en vet zijn ieder afzonderlijk optioneel.
- Een ingeschakeld profiel vereist minimaal één waarde groter dan nul.
- Massa-, volume- en teleenheden worden niet automatisch onderling omgerekend.
- De referentiebasis moet compatibel zijn met de eerste verpakking en later met iedere extra verpakking.
- Wanneer calorieën leeg zijn en eiwit, koolhydraten en vet alle drie bestaan, toont de client een voorlopige berekening met `4/4/9`.
- De berekende caloriewaarde wordt bij opslaan als caloriewaarde bewaard met bron `automatisch`.
- De beheerder kan de berekende waarde vóór opslaan corrigeren; de bron wordt dan `handmatig`.
- Bij latere macrowijzigingen wordt alleen een automatisch berekende caloriewaarde opnieuw berekend. Een handmatige correctie wordt niet overschreven.
- De backend valideert of herhaalt de berekening en vertrouwt niet uitsluitend op clientinvoer.

### Afbeeldingen

- Product- en verpakkingsafbeeldingen zijn optioneel.
- Een verpakkingsafbeelding is leidend voor die verpakking.
- Zonder verpakkingsafbeelding gebruikt de UI de productafbeelding en daarna een vaste placeholder.
- Een ontbrekende afbeelding blokkeert opslaan niet.

### Eerste verpakking

Verplichte velden:

- `packageTypeId` - verpakkingstype;
- `amount` - positieve decimal string;
- `unitTypeId` - inhoudseenheid;
- `unitsPerPackage` - positief geheel getal, standaard `1`.

De eerste verpakking heeft daarnaast een optionele afbeelding.

UI-invoer met komma, bijvoorbeeld `1,5`, wordt voor verzending omgezet naar `1.5`. De backend canonicaliseert decimalen, bijvoorbeeld `1.50` naar `1.5`.

## Backendregels

- Request body is strict.
- `brandId` mag ontbreken of `null` zijn.
- Categorie, merk, verpakkingstype en eenheid moeten bestaan wanneer ze worden ingestuurd.
- `unit_content` wordt gevonden of aangemaakt voor `(unitTypeId, canonicalAmount)`.
- Product, eerste verpakking, afbeeldingenmetadata, Calorie Tracker-beschikbaarheid en een eventueel macroprofiel worden in één transactie opgeslagen.
- Bij falen blijft er geen half opgeslagen product of macroprofiel over.
- Succesresponse bevat voldoende informatie om naar productdetail te navigeren.

### Benodigde contractuitbreiding

Voor deze conceptuitbreiding moeten endpoint en datamodel later expliciet worden uitgebreid met:

- productafbeelding;
- Calorie Tracker-beschikbaarheid en consumptietype;
- macroprofiel, referentiebasis, voedingswaarden en bron van calorieën;
- verpakkingsafbeelding;
- transactionele validatie van de compatibiliteit tussen macroprofiel en verpakking.

De huidige endpoint- en ERD-documenten zijn voor deze velden nog niet leidend totdat die uitbreiding afzonderlijk is uitgewerkt.

## Duplicaten

Duplicaatvergelijking gebruikt `lower(trim(...))`. Interne whitespace wordt niet genormaliseerd.

Geblokkeerd:

- dezelfde merknaam;
- dezelfde categorienaam onder dezelfde parent;
- hetzelfde product binnen dezelfde categorie en hetzelfde merk;
- hetzelfde merkloze product binnen dezelfde categorie.

## Succesgedrag

Na succesvol product aanmaken:

- navigeert de UI naar `/admin/product-catalogus/:productId`;
- blijft de gebruiker niet op het aanmaakformulier;
- wordt het formulier niet alleen gereset als eindstate;
- kan de beheerder op productdetail de aangemaakte gegevens controleren en extra verpakkingen toevoegen.

## Acceptatiecriteria

### AC-01 - Formulier vanuit context openen

Gegeven dat de beheerder in categorie-browse of brand-result state staat  
Wanneer de beheerder `Product aanmaken` kiest  
Dan opent `/admin/product-catalogus/nieuw` met de expliciete context als queryparameter zonder verplichte zoekstap.

### AC-02 - Product met bestaand merk aanmaken

Gegeven dat categorie, merk, verpakkingstype en eenheid bestaan  
Wanneer de beheerder alle verplichte velden invult  
Dan retourneert `POST /products` `201`  
En navigeert de UI naar productdetail van het aangemaakte product.

### AC-03 - Product zonder merk aanmaken

Gegeven dat de beheerder geen merk kiest  
Wanneer de overige verplichte velden geldig zijn  
Dan wordt het product aangemaakt  
En is `brand` in de response `null`  
En navigeert de UI naar productdetail van het aangemaakte product.

### AC-04 - Nieuw merk gebruiken

Gegeven dat het gewenste merk nog niet bestaat  
Wanneer de beheerder het merk bevestigt als nieuw merk  
Dan wordt het merk aangemaakt of hergebruikt  
En blijft het productformulier ingevuld.

### AC-05 - Nieuwe categorie inline gebruiken

Gegeven dat een gewenste categorie ontbreekt  
Wanneer de beheerder één categorie toevoegt  
Dan wordt de nieuwe categorie geselecteerd  
En blijven product- en verpakkingsvelden behouden.

### AC-06 - Categorie veilig verwijderen

Gegeven dat een categorie geen kinderen en geen gekoppelde producten heeft  
Wanneer de beheerder de categorie verwijdert  
Dan verdwijnt de categorie uit de boom  
En wordt de selectie leeggemaakt wanneer die categorie geselecteerd was.

### AC-07 - Duplicaat product blokkeren

Gegeven dat hetzelfde product al bestaat binnen dezelfde categorie en hetzelfde merk  
Wanneer de beheerder opslaat  
Dan retourneert de backend `409 PRODUCT_ALREADY_EXISTS`  
En toont de UI een begrijpelijke foutmelding.

### AC-08 - Context vooraf invullen

Gegeven dat de beheerder `Product aanmaken` opent met `brandId` of `categoryId` in de URL  
Dan mag het formulier het bijbehorende merk of de bijbehorende categorie vooraf selecteren  
En mag de categorieboom bij een vooraf geselecteerde categorie alleen het bijbehorende pad openklappen en overige takken ingeklapt laten  
En kan de beheerder deze waarden nog wijzigen voor opslaan.

### AC-09 - Calorie Tracker-product

Gegeven dat de beheerder beschikbaarheid voor de Calorie Tracker inschakelt
Dan is exact één consumptietype verplicht
En kan het product zonder macroprofiel worden opgeslagen.

### AC-10 - Optioneel macroprofiel

Gegeven dat de beheerder het macroprofiel inschakelt
Dan kiest de beheerder een compatibele referentiebasis
En is minimaal één voedingswaarde groter dan nul
En wordt een volledige macroset zonder calorie-invoer client-side voorlopig naar calorieën omgerekend.

### AC-11 - Afbeeldingsfallback

Gegeven dat geen verpakkingsafbeelding is gekozen
Dan kan het product worden opgeslagen
En gebruikt de UI later de productafbeelding of een placeholder.

### AC-12 - Transactioneel opslaan

Gegeven dat product, eerste verpakking en macroprofiel worden ingestuurd
Wanneer één onderdeel ongeldig is
Dan wordt geen van de onderdelen gedeeltelijk opgeslagen
En blijven de ingevulde formulierwaarden behouden.
