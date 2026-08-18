# Domeinregels — productcatalogus doelmodel

## Doel

De catalogus scheidt een gedeelde inhoudelijke productsamenstelling van ieder concreet koopbaar product. Clients selecteren uitsluitend concrete producten.

## Productsamenstelling

- Ieder `product` hoort bij exact één `product_composition`, ook wanneer die samenstelling maar één concreet product heeft.
- De samenstelling draagt naam, optioneel merk, categorie, een nullable consumptietype en een optioneel bewaard macroprofiel.
- De combinatie merk, categorie en getrimde case-insensitieve naam is uniek.
- `product_composition` is geen zoekresultaat voor consumptie, recepten of voorraad en is niet zelfstandig archiveerbaar.
- Een samenstelling zonder actieve producten blijft in admin-autocomplete vindbaar om een nieuw product eraan toe te voegen.
- Latere ingrediëntenlijsten en allergenen van fabrieksproducten horen bij de samenstelling, niet bij de verpakking.

## Concrete producten

- Eén `product` is één concrete koopbare uitvoering, bijvoorbeeld `Heinz Tomatenpuree — blik 200 g`.
- Verschillende verpakkingstypen of inhouden zijn verschillende producten.
- Verpakkingstype en inhoud mogen onbekend zijn; bekende waarden worden expliciet opgeslagen.
- Producten dragen hun eigen afbeelding, optionele barcode en archiveringsstatus.
- De combinatie samenstelling, verpakkingstype en inhoud is uniek wanneer verpakkingstype en inhoud bekend zijn; barcode is platformbreed uniek.
- Alle clients gebruiken dezelfde afgeleide weergavenaam: `[merk] [naam] — [verpakkingstype] [inhoud + eenheid]`. Ontbrekende delen worden zonder lege scheidingstekens weggelaten.
- Een nieuw product kan vanuit een bestaand product met dezelfde samenstelling worden gestart; alleen concrete productvelden worden opnieuw ingevoerd.
- Een foutief product met werkelijk afwijkende samenstelling wordt in de MVP gearchiveerd en opnieuw aangemaakt; bestaande verwijzingen worden niet automatisch gemigreerd.

## Porties en eenheden

- Een product kan één optionele portiedefinitie hebben met enkelvoud, meervoud, expliciete grootte en optioneel aantal per product.
- Volledige inhoud en portiegrootte hebben dezelfde dimensie, maar hoeven rekenkundig niet exact te sluiten.
- Massa, volume en aantallen zijn gescheiden dimensies. Alleen binnen dezelfde dimensie wordt omgerekend.
- Basiseenheden zijn gram, milliliter en één stuk/dosis.
- Verpakkingstypen en productporties bewaren expliciete enkelvouds- en meervoudsnamen.

## Consumptieclassificatie

- `consumption_type` is `FOOD`, `DRINK`, `SUPPLEMENT` of `NULL` en blijft eigendom van `product_composition`.
- `NULL` betekent expliciet dat de samenstelling geen consumptieproduct is; het betekent niet `OTHER` of een onbekende classificatie.
- Alleen actieve concrete producten met een niet-null consumptietype zijn beschikbaar voor nieuwe Calorie Tracker-logs en nieuwe receptingrediënten.
- Categorie en consumptietype blijven onafhankelijk: categorie classificeert de algemene catalogus, consumptietype uitsluitend consumptieregistratie.
- Een wijziging naar `NULL` verwijdert geen bestaande logs, receptversies of voedingswaarden. Historische relaties blijven leesbaar en berekenbaar.

## Macroprofiel

- `product_macro_profile` behoudt zijn naam en hoort één-op-één bij `product_composition` via `product_composition_id` als primary key.
- Een bewaard profiel heeft afzonderlijk een actieve/inactieve status. Uitschakelen verwijdert de waarden niet.
- Alle concrete producten binnen dezelfde samenstelling gebruiken automatisch hetzelfde actieve profiel.
- Alleen een actief profiel wordt gelezen door voedingsberekeningen; een inactief of ontbrekend profiel draagt niets bij.
- Een wijziging aan actieve waarden werkt direct door naar alle gekoppelde producten, recepten, logs en statistieken.
- Een afwijkende receptuur hoort in een andere productsamenstelling.
- Referentiebasis is `PER_100_G`, `PER_100_ML` of `PER_UNIT`.
- Een consumptieproduct zonder actief profiel blijft selecteerbaar en draagt niet bij aan onbekende voedingswaarden.
- Wanneer een samenstelling geen consumptieproduct meer is, wordt het profiel inactief; opnieuw inschakelen van het consumptieproduct activeert het profiel niet automatisch.
- `NULL` in een voedingswaarde betekent onbekend en `0` een bekende nulwaarde.
- Calorieën mogen uit complete eiwit-, koolhydraat- en vetwaarden met 4/4/9 worden berekend; handmatig gecorrigeerde calorieën worden niet automatisch overschreven.
- Een wijziging van referentiedimensie wordt geblokkeerd wanneer bestaande receptingrediënten daarmee incompatibel worden.

## Archivering en correcties

- Concrete producten worden gearchiveerd en hersteld; ze worden niet definitief verwijderd zolang logs, recepten of voorraad ernaar verwijzen.
- Gearchiveerde producten verdwijnen uit nieuwe selecties, maar blijven zichtbaar en berekenbaar in bestaande relaties.
- Bestaande receptversies met een gearchiveerd product blijven logbaar.
- Een nieuwe of inhoudelijk gewijzigde receptversie mag geen gearchiveerd product opnieuw selecteren.
- Correcties aan samenstelling, productinhoud of macroprofiel werken live door; er zijn geen product- of voedingssnapshots.

## Migratie uit het oude model

- Oud `product` wordt standaard `product_composition`.
- Iedere oude `product_package` wordt één nieuw concreet `product` met nieuwe UUID.
- Een tijdelijke mapping `oude product_package.id -> nieuwe product.id` migreert logs, receptingrediënten en voorraad.
- Naam, merk, categorie en consumptietype blijven op de samenstelling; verpakkingstype, inhoud, afbeelding en archivering komen van de oude verpakking.
- Een nieuw product is gearchiveerd wanneer de oude root of oude verpakking gearchiveerd was.
- Voor roots met meerdere verpakkingen wordt vooraf een afwijkingsrapport gemaakt; semantisch afwijkende producten worden vóór of tijdens migratie gesplitst.
