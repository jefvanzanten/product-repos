# Specificatie — voorraad toevoegen bottomsheet

## Status

- Onderdeel: inventory client
- Opent vanaf route: `/`
- UI-vorm: overlay zonder routewijziging volgens de [UI-specificatie](./voorraad-toevoegen-bottom-sheet-ui-specificatie.md); geen aparte pagina
- Status: gepland

## Doel

Een beheerder kan vanaf de inventory-tab snel voorraad toevoegen zonder de pagina te verlaten. Gewone gebruikers zien de toevoegactie niet.

## Binnen scope

- Bottomsheet openen vanaf een toevoegknop op de inventory-tab (alleen zichtbaar voor beheerders).
- Product of productverpakking zoeken/kiezen uit de actieve catalogus.
- Aantal verpakkingen invullen als positief geheel getal.
- Opbergplaats kiezen uit een compacte locatieboom; de opbergplaats is altijd verplicht.
- Optioneel een houdbaarheidsdatum invullen, standaard leeg.
- Opslaan en daarna de voorraadlijst verversen.
- Annuleren zonder wijzigingen.

## Buiten scope

- Volledige productcatalogus of opbergplaatsen beheren.
- Productdetails bewerken.
- Nieuwe catalogusproducten of opbergplaatsen aanmaken.
- Cross-app links naar Product Management Admin; Inventory toont die niet.
- Barcode-scanning.
- Bulkvoorraad toevoegen.
- Decimalen of inhoudseenheden; voorraad is altijd een geheel aantal verpakkingen.

## UI-specificatie

De responsive sheet/modalvorm, schermopbouw en toetsenbordpresentatie staan in [voorraad-toevoegen-bottom-sheet-ui-specificatie.md](./voorraad-toevoegen-bottom-sheet-ui-specificatie.md).

## Gedrag

- De flow opent als overlay bovenop de inventory-tab volgens de responsive vorm uit de UI-specificatie.
- Sluiten via annuleren, backdrop of escape sluit direct en wist de invoer, zonder bevestigingsdialoog.
- Na succesvol opslaan sluit de sheet en wordt de voorraadlijst bijgewerkt.
- Fouten blijven in de sheet zichtbaar en wissen de invoer niet.

## Product zoeken in de sheet

- Zoeken start vanaf twee ingevoerde tekens, met een korte debounce.
- Vóór twee tekens blijft het resultatengedeelte leeg; er is geen instructietekst.
- Alleen actieve, niet-gearchiveerde producten en verpakkingen zijn selecteerbaar.
- Zoeken matcht op productnaam, merk, verpakkingsomschrijving en categoriepad; niet op barcode.

## Product ontbreekt

Als het product niet gevonden wordt, toont de sheet uitsluitend de neutrale melding `Geen producten gevonden`. De sheet maakt nooit zelf producten aan, toont geen link naar Product Management Admin en bewaart geen concept over deployments heen.

## Geen opbergplaatsen beschikbaar

Als er nog geen opbergplaatsen bestaan:

- opent de sheet wel;
- is het opbergplaatsveld disabled;
- blijft `Toevoegen` disabled zolang verplichte velden ontbreken;
- is het duidelijk dat voorraad zonder opbergplaats niet kan worden toegevoegd.

Locaties aanmaken gebeurt uitsluitend in Product Management Admin.

## Veldregels

- `Hoeveelheid` is een positief geheel getal (minimaal 1); decimalen worden niet geaccepteerd.
- `Opbergplaats` is verplicht en wordt gekozen uit een compacte locatieboom: hoofdlocaties zijn zichtbaar en uitklapbaar naar sublocaties; de boom is niet doorzoekbaar. Ieder bestaand knooppunt is selecteerbaar. Gearchiveerde locaties verschijnen niet in de boom.
- `Houdbaarheidsdatum` is optioneel, staat standaard leeg en wordt niet automatisch ingevuld.
- `Toevoegen` blijft disabled zolang productverpakking, hoeveelheid of opbergplaats ontbreken.

## Toetsenbordgedrag

De flow moet correct werken met het mobiele toetsenbord: het actieve veld blijft zichtbaar en bedienbaar en de acties blokkeren het veld niet. Dit gedrag wordt op een echte mobiele viewport getest. De toegestane presentatie en fallback staan in de UI-specificatie.

## Benodigde backend/API — nog te specificeren

Nog te bepalen:

- zoeken van productverpakkingen voor inventorygebruik;
- endpoint om voorraad toe te voegen (verhogende semantiek, samenvoegend per productverpakking + opbergplaats + datum);
- request/response DTO;
- foutcodes voor niet-bestaand product, verpakking of opbergplaats, en voor niet-beheerders.

De actieve locatieboom volgt [LOCATION_ENDPOINTS.md](../../backend/Endpoints/LOCATION_ENDPOINTS.md) en de [opbergplaatsen-domeinregels](../../domein/opbergplaatsen-domeinregels.md). Het datamodel staat in het [Storage/Inventory ERD](../../backend/ERD/STORAGE_ERD.md).

## Acceptatiecriteria

### AC-01 — Bottomsheet openen

Gegeven dat een beheerder op de inventory-tab staat  
Wanneer de beheerder de toevoegknop kiest  
Dan opent een bottomsheet op dezelfde pagina.

### AC-02 — Voorraad toevoegen

Gegeven dat de beheerder een product/verpakking kiest, een positief geheel aantal invult en een opbergplaats kiest  
Wanneer de beheerder `Toevoegen` kiest  
Dan wordt de voorraad opgeslagen als partij op die combinatie  
En wordt de voorraadlijst bijgewerkt.

### AC-03 — Annuleren

Gegeven dat de bottomsheet open is  
Wanneer de beheerder annuleert, de backdrop kiest of op escape drukt  
Dan sluit de bottomsheet direct  
En wordt er niets opgeslagen.

### AC-04 — Fout behouden

Gegeven dat opslaan mislukt  
Dan blijft de bottomsheet open  
En blijven ingevulde waarden behouden  
En is de fout zichtbaar.

### AC-05 — Geen opbergplaatsen

Gegeven dat er geen opbergplaatsen bestaan  
Wanneer de beheerder de sheet opent  
Dan is het opbergplaatsveld disabled  
En blijft `Toevoegen` disabled.

### AC-06 — Geen zoekresultaten

Gegeven dat het product niet gevonden wordt  
Dan toont de sheet alleen de melding `Geen producten gevonden`  
En maakt de sheet niets automatisch aan  
En toont de sheet geen link naar Product Management Admin.

### AC-07 — Read-only gebruiker

Gegeven dat een ingelogde gebruiker geen beheerder is  
Dan ziet de gebruiker geen toevoegknop  
En weigert het toevoegendpoint deze gebruiker zelfstandig.
