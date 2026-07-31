# Domeinregels - productcatalogus

## Status

- Type: gedeeld domeindocument
- Datamodel: [Product ERD](../backend/ERD/PRODUCT_ERD.md)
- Backendcontract: [Admin dashboard endpoints](../backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md)
- Belangrijkste features:
  - [Product aanmaken](../specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md)
  - [Productdetail en verpakkingen](../specs/admin-dashboard/product-catalogus/product-detail-specificatie.md)
  - [Producten en verpakkingen archiveren](../specs/admin-dashboard/product-catalogus/product-archiveren-specificatie.md)

## Doel

Dit document bewaart gedeelde productcataloguskennis die door meerdere specs, endpoints en ERD's wordt gebruikt. ERD's blijven beperkt tot opslagstructuur. Endpointdocumenten blijven beperkt tot HTTP-contracten.

## Producten en verpakkingen

- Ieder product heeft exact één consumptietype: `FOOD`, `DRINK` of `SUPPLEMENT`.
- Een product hoort bij één categorie en kan optioneel een merk hebben.
- Een product heeft één of meer verpakkingen.
- Zoek- en keuzestates tonen verpakkingen wanneer de keuze een concrete consumptie of voorraadregistratie nodig heeft; kale producten zijn daarvoor onvoldoende.
- Iedere verpakking bewaart de volledige verpakkingsinhoud, bijvoorbeeld `88 g`.
- Een verpakking kan daarnaast één optionele portiedefinitie hebben met een vrije naam, een expliciete portiegrootte en een optioneel aantal porties of stuks per verpakking.
- De volledige inhoud en portiegrootte zijn onafhankelijke cataloguswaarden: een afgeronde portiegrootte maal het aantal hoeft niet exact gelijk te zijn aan de volledige inhoud.
- Als een portie bestaat, hebben volledige inhoud en portiegrootte dezelfde dimensie.

## Namen, duplicaten en decimalen

- Namen worden getrimd voordat ze worden gevalideerd of opgeslagen.
- Duplicaten worden case-insensitief gecontroleerd na trimmen.
- Interne whitespace, punctuation en hyphens worden voorlopig niet genormaliseerd.
- Decimalen worden canoniek bewaard met `.` als separator.
- Decimalen die dezelfde waarde vertegenwoordigen, zoals `1.5`, `1.50` en `01.500`, verwijzen naar dezelfde inhoudshoeveelheid.

## Eenheden en inhoud

- Massa, volume en aantallen zijn gescheiden dimensies.
- Massa-, volume- en teleenheden worden niet automatisch onderling omgerekend.
- Binnen dezelfde dimensie kan worden omgerekend via de conversie naar de basiseenheid.
- De basiseenheden zijn gram voor massa, milliliter voor volume en één item of dosis voor aantallen.
- Eenheidstypen en verpakkingstypen zijn referentiedata die wordt geseed of door een beheerder wordt beheerd.

## Macroprofiel

- Een macroprofiel hoort bij het product en niet bij een afzonderlijke verpakking.
- Een macroprofiel is optioneel; zonder macroprofiel kan een product wel worden gebruikt, maar draagt het niet bij aan calorie- of macrototalen.
- Een opgeslagen macroprofiel vereist minimaal één voedingswaarde groter dan nul.
- `NULL` betekent onbekend; `0` betekent een bekende nulwaarde.
- De referentiebasis is één van:
  - per 100 gram;
  - per 100 milliliter;
  - per stuk of dosis.
- De referentiebasis moet compatibel zijn met iedere verpakking van het product.
- Wanneer calorieën ontbreken, mogen ze alleen automatisch worden berekend met `4 × eiwit + 4 × koolhydraten + 9 × vet` wanneer alle drie macrovelden aanwezig zijn.
- Automatisch berekende calorieën worden opnieuw berekend bij macrowijzigingen.
- Handmatig opgegeven of gecorrigeerde calorieën worden niet automatisch overschreven.

## Archivering en selecteerbaarheid

- Producten en verpakkingen worden niet definitief verwijderd zolang andere domeinen ernaar kunnen verwijzen.
- Een product of verpakking is actief selecteerbaar wanneer zowel het product als de verpakking niet gearchiveerd zijn.
- Gearchiveerde producten en verpakkingen verdwijnen uit actieve zoek- en keuzestates voor nieuwe consumptielogs en voorraadregistraties.
- Bestaande consumptielogs en voorraadregistraties blijven naar gearchiveerde catalogusdata verwijzen.
- Productarchivering wijzigt de eigen archiveringsstatus van onderliggende verpakkingen niet.
- Na productherstel worden alleen verpakkingen met een eigen actieve status opnieuw actief selecteerbaar.

## Cataloguscorrecties

- Gebruikte product- en verpakkingsdata mag worden gecorrigeerd.
- Correcties aan consumptietype, verpakking, inhoud of macroprofiel werken direct door in gekoppelde domeinen.
- Gekoppelde consumptielogs gebruiken geen product-, verpakking- of voedingssnapshot.
- De backend hoeft voor deze correcties geen afhankelijkheidsaantallen op te halen.
- Een correctie die het product incompatibel maakt met het macroprofiel wordt geblokkeerd.
