# Specificatie — browsbare productcatalogus

## Status

- Onderdeel: admin dashboard > productcatalogus
- Route: `/admin/product-catalogus/producten`
- Status: gepland / nog niet geïmplementeerd

Deze spec is de plek voor alles wat gaat over inhoud tonen op de productcatalogus-hoofdpagina. Dit staat los van de huidige product-aanmaak vertical slice.

## Doel

Een beheerder kan snel door bestaande producten bladeren, zoeken/filteren en vanaf dezelfde plek direct een nieuw product toevoegen.

## Binnen scope voor deze feature

- Producten ophalen en tonen op de productcataloguspagina.
- Productkaarten of productrijen tonen.
- Zoeken op product, merk, categorie en verpakking.
- Filteren op categorie en merk.
- Lege catalogus tonen wanneer er nog geen producten zijn.
- Geen-resultaten toestand tonen wanneer zoekterm of filters niets opleveren.
- `Product aanmaken` altijd bereikbaar houden.

## Buiten scope

- Productdetail, zolang hiervoor geen eigen spec bestaat.
- Product bewerken.
- Extra verpakkingen beheren.
- Barcode/EAN zoeken.
- Productfoto's of publicatiestatus.
- Oude trapsgewijze productmanagement-flow.

## Scherminhoud

```text
Productcatalogus
Producten

[ Zoek product, merk, categorie of verpakking ]
[Categorie: Alle] [Merk: Alle]

<Productkaart>
  Categoriepad
  Productnaam
  Merk, indien aanwezig
  Verpakkingssamenvatting

<Productkaart>
  ...

[ Product aanmaken ]
```

Op mobiel mag `Product aanmaken` sticky onderaan staan, boven de hoofdnavigatie.

## Productkaart of productrij

Elke kaart/rij toont minimaal:

- productnaam of weergavenaam;
- merk wanneer aanwezig;
- categoriepad of eindcategorie;
- korte verpakkingssamenvatting.

Voorbeelden van verpakkingssamenvatting:

```text
fles 1.5 liter
blik 330 milliliter
3 verpakkingen
```

## Lege catalogus

Wanneer er nog geen producten zijn:

```text
Nog geen producten
Voeg je eerste product toe om de catalogus op te bouwen.
[ Eerste product aanmaken ]
```

De actie opent `/admin/product-catalogus/producten/nieuw`.

## Geen resultaten

Wanneer zoeken of filteren niets oplevert:

```text
Geen producten gevonden voor “<zoekterm>”.
Pas je zoekterm of filters aan, of maak een nieuw product aan.
[ Zoekopdracht wissen ]
[ Product aanmaken ]
```

De zoekterm mag als suggestie zichtbaar zijn, maar wordt niet automatisch als productnaam, merk of categorie opgeslagen.

## Snelle toevoegactie

- De primaire toevoegactie heet `Product aanmaken`.
- De actie blijft zichtbaar vanaf browse-, lege- en geen-resultaten-states.
- In de eerste versie opent deze actie de bestaande product-aanmaakpagina.
- Een latere bottomsheet/sneltoevoeging mag pas worden uitgewerkt in een eigen spec of uitbreiding van deze spec.

## Benodigde backend/API — nog te specificeren

Deze feature heeft eerst expliciete endpoint- en contractkeuzes nodig. Waarschijnlijke API-vorm:

```text
GET /products?query=&categoryId=&brandId=&cursor=
```

Nog te bepalen:

- response DTO voor productkaart/rij;
- sortering;
- paginering of infinite scroll;
- filteropties;
- hoe meerdere verpakkingen worden samengevat;
- of productdetail bestaat en waar een kaart naartoe linkt.

## Acceptatiecriteria

### AC-01 — Producten tonen

Gegeven dat er producten bestaan  
Wanneer de beheerder de productcatalogus opent  
Dan ziet de beheerder productkaarten of productrijen.

### AC-02 — Lege catalogus

Gegeven dat er geen producten bestaan  
Wanneer de beheerder de productcatalogus opent  
Dan ziet de beheerder een lege toestand  
En kan de beheerder het eerste product aanmaken.

### AC-03 — Geen resultaten

Gegeven dat een zoekterm of filter geen resultaten oplevert  
Dan blijft `Product aanmaken` beschikbaar  
En kan de beheerder de zoekopdracht wissen.

### AC-04 — Geen oude flow

Gegeven dat de browsbare catalogus wordt gebouwd  
Dan gebruikt de UI alleen categorie, merk, product en verpakking  
En wordt er geen oude trapsgewijze productmanagement-flow teruggebracht.
