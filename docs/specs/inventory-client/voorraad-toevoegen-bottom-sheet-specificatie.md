# Specificatie — voorraad toevoegen bottomsheet

## Status

- Onderdeel: inventory client
- Opent vanaf route: `/`
- UI-vorm: bottomsheet/modal, geen aparte pagina
- Status: gepland

## Doel

Een gebruiker kan vanaf de inventory-tab snel voorraad toevoegen zonder de pagina te verlaten.

## Binnen scope

- Bottomsheet openen vanaf een toevoegknop op de inventory-tab.
- Product of productverpakking zoeken/kiezen uit de catalogus.
- Hoeveelheid invullen.
- Opbergplaats kiezen wanneer opbergplaatsen beschikbaar zijn.
- Opslaan en daarna de voorraadlijst verversen.
- Annuleren zonder wijzigingen.

## Buiten scope

- Volledige productcatalogus beheren.
- Productdetails bewerken.
- Nieuwe catalogusproducten aanmaken, tenzij later als aparte snelle flow gespecificeerd.
- Barcode-scanning.
- Bulkvoorraad toevoegen.

## Scherminhoud

```text
Bottomsheet: Voorraad toevoegen

Product
[ Zoek product of verpakking ]

Gekozen product/verpakking
<Productnaam>
<Verpakking>

Hoeveelheid
[ aantal ]

Opbergplaats
[ kies opbergplaats ]

[ Toevoegen ]
[ Annuleren ]
```

## Gedrag

- De bottomsheet opent bovenop de inventory-tab.
- Sluiten via annuleren, backdrop of escape wist niet opgeslagen invoer.
- Na succesvol opslaan sluit de sheet.
- De voorraadlijst op de achtergrond wordt daarna bijgewerkt.
- Fouten blijven in de sheet zichtbaar en wissen de invoer niet.

## Product ontbreekt

Als het product niet gevonden wordt:

- de gebruiker krijgt een duidelijke geen-resultaten toestand;
- de sheet maakt niet automatisch een catalogusproduct aan;
- een eventuele actie `Product aanmaken` verwijst naar de admin product-aanmaakflow of naar een later te specificeren snelle catalogusflow.

## Benodigde backend/API — nog te specificeren

Nog te bepalen:

- zoeken van productverpakkingen voor inventorygebruik;
- endpoint om voorraad toe te voegen;
- request/response DTO;
- voorraadmutatie versus logregistratie;
- foutcodes voor niet-bestaand product, verpakking of opbergplaats.

## Acceptatiecriteria

### AC-01 — Bottomsheet openen

Gegeven dat de gebruiker op de inventory-tab staat  
Wanneer de gebruiker de toevoegknop kiest  
Dan opent een bottomsheet op dezelfde pagina.

### AC-02 — Voorraad toevoegen

Gegeven dat de gebruiker een product/verpakking kiest en een geldige hoeveelheid invult  
Wanneer de gebruiker `Toevoegen` kiest  
Dan wordt de voorraad opgeslagen  
En wordt de voorraadlijst bijgewerkt.

### AC-03 — Annuleren

Gegeven dat de bottomsheet open is  
Wanneer de gebruiker annuleert  
Dan sluit de bottomsheet  
En wordt er niets opgeslagen.

### AC-04 — Fout behouden

Gegeven dat opslaan mislukt  
Dan blijft de bottomsheet open  
En blijven ingevulde waarden behouden.
