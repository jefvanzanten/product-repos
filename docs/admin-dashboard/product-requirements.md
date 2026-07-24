# Product Requirements Document: Admin panel inventaris

## Status

- Product: `apps/inventory+admin_panel`
- Scope: admin panel onder `/admin/*`
- Versie: 0.1
- Bron: huidige React Router admin panel implementatie en backend/product-contracten

## Doel

Het admin panel stelt beheerders in staat om de productcatalogus en opbergplaatsen te beheren zodat de inventarisatie-app betrouwbare stamdata kan gebruiken voor voorraadregistratie.

## Gebruikers

- **Beheerder catalogus**: onderhoudt producttypes, merken, varianten en uitvoeringen.
- **Beheerder opslag**: onderhoudt opbergplaatsen/locaties waar voorraad kan liggen.
- **Inventarisatie-gebruiker**: profiteert indirect van correcte stamdata tijdens voorraadopname.

## Probleem

Voorraadregistratie valt of staat met consistente stamdata. Zonder beheerscherm ontstaan duplicaten zoals verschillende schrijfwijzen voor producttypes/merken en ontbrekende uitvoeringen/verpakkingen. Het admin panel moet dit proces snel, mobiel bruikbaar en foutarm maken.

## Productdoelen

1. Beheerders kunnen productdata vinden voordat ze nieuwe data toevoegen.
2. Nieuwe producttypes, merken, varianten en uitvoeringen kunnen worden aangemaakt vanuit de context waar ze ontbreken.
3. Navigatie tussen admin onderdelen is duidelijk en blijft geïntegreerd met de inventarisatie-app.
4. Opbergplaatsen worden beheersbaar zodat voorraad later aan een locatie gekoppeld kan worden.
5. Het panel gebruikt de bestaande backend API en gedeelde contracts voor consistente datatypes.

## Niet-doelen voor deze fase

- Authenticatie/autorisatie en rollenbeheer.
- Bulkimport/export van producten.
- Volledig voorraadbeheer; dat hoort bij inventarisatie/voorraadflows.
- Bewerken/verwijderen van bestaande productdata, tenzij expliciet in een latere scope toegevoegd.
- Barcode-scanning in het admin panel.

## Huidige routes en onderdelen

| Route | Doel | Status |
| --- | --- | --- |
| `/admin/product-management` | Productcatalogus beheren | Grotendeels geïmplementeerd |
| `/admin/locations` | Opbergplaatsen beheren | Placeholder aanwezig |
| `/` | Inventarisatie-tab buiten admin | Placeholder aanwezig |

## Functionele requirements

### Navigatie

- **ADM-NAV-001**: De globale ondernavigatie toont `Inventarisatie` en `Admin`.
- **ADM-NAV-002**: Binnen admin toont de topnavigatie `Producten` en `Opbergplaatsen`.
- **ADM-NAV-003**: De actieve tab is visueel herkenbaar.
- **ADM-NAV-004**: Admin routes blijven bereikbaar onder `/admin/*`.

### Productmanagement

- **ADM-PM-001**: Een beheerder kan zoeken op producttype, merkproduct en variant via queryparameter `q`.
- **ADM-PM-002**: Zoekresultaten zijn gegroepeerd in `Producttype`, `Merken` en `Varianten`.
- **ADM-PM-003**: Als geen producttype bestaat voor de zoekterm, kan de beheerder dit producttype direct aanmaken.
- **ADM-PM-004**: Een beheerder kan vanuit een producttype merken bekijken en een nieuw merk toevoegen.
- **ADM-PM-005**: Een beheerder kan vanuit een merkproduct varianten bekijken en een nieuwe variant toevoegen.
- **ADM-PM-006**: Een beheerder kan vanuit een variant uitvoeringen bekijken en een nieuwe uitvoering toevoegen.
- **ADM-PM-007**: Een uitvoering bevat serving size, eenheid, verpakkingsmateriaal en aantal per verpakking.
- **ADM-PM-008**: Het systeem voorkomt of signaleert dubbele merknamen binnen hetzelfde producttype, case-insensitief en whitespace-insensitief.
- **ADM-PM-009**: Terugnavigatie bewaart de oorspronkelijke zoekcontext waar mogelijk.
- **ADM-PM-010**: Formulieren valideren verplichte velden en numerieke grenzen voordat data wordt opgeslagen.

### Opbergplaatsen

- **ADM-LOC-001**: Een beheerder kan opbergplaatsen zien.
- **ADM-LOC-002**: Een beheerder kan opbergplaatsen hiërarchisch beheren via `parentId`.
- **ADM-LOC-003**: Opbergplaatsnamen zijn uniek binnen dezelfde parent.
- **ADM-LOC-004**: De UI maakt duidelijk wanneer locatiebeheer nog leeg is of nog niet volledig geïmplementeerd.

### Data en integratie

- **ADM-API-001**: Het admin panel gebruikt `API_URL` met fallback `http://localhost:3000`.
- **ADM-API-002**: Productzoekresultaten volgen `ProductSearchResponse` uit `@product-repos/contracts`.
- **ADM-API-003**: Lijsten voor eenheden en verpakkingsmaterialen worden opgehaald voordat uitvoeringen worden aangemaakt.
- **ADM-API-004**: Backendfouten worden niet stil genegeerd; de gebruiker krijgt minimaal een foutmelding bij mislukte create-acties.

## UX requirements

- Mobiel eerst: de bestaande bottom tabbar en compacte lijstkaarten blijven geschikt voor telefoongebruik.
- Interacties zijn toetsenbord- en screenreader-vriendelijk waar mogelijk (`nav` labels, formulierlabels, sluitknoppen met `aria-label`).
- Primaire create-acties gebruiken één duidelijke call-to-action.
- Empty states geven een vervolgstap, bijvoorbeeld producttype aanmaken.

## Succescriteria

- Een beheerder kan binnen één flow zoeken naar `cola`, een producttype selecteren, een merk toevoegen, een variant toevoegen en een uitvoering toevoegen.
- Duplicaat-merken binnen hetzelfde producttype worden geblokkeerd of duidelijk gemeld.
- De admin navigatie laat altijd zien of de gebruiker in `Producten` of `Opbergplaatsen` zit.
- Locatiebeheer heeft een uitgewerkte specificatie die aansluit op de bestaande `location` tabel.

## Bijbehorende specs

- [Admin navigatie](./specs/01-admin-navigation.md)
- [Productmanagement](./specs/02-product-management.md)
- [Opbergplaatsenbeheer](./specs/03-storage-location-management.md)
- [API- en datacontracten](./specs/04-api-data-contracts.md)
