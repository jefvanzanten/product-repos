# Specificatie — Consumptielog toevoegen

## Doel

Een ingelogde gebruiker logt één concreet catalogusproduct of één toegankelijk bestaand gerecht op een gekozen datum en tijd.

## Binnen scope

- Gecombineerd zoeken naar concrete producten en gerechten.
- Zonder zoekterm recente eigen consumptiekeuzes tonen.
- Producthoeveelheid invoeren als volledig product, productportie of compatibele inhoudseenheid.
- Gerecht in decimale receptporties loggen.
- Datum en tijd vastleggen; toekomstige consumptie blokkeren.
- Link `Recepten` naar de afzonderlijke app.

## Buiten scope

- Recept of gerecht aanmaken, bewerken of archiveren.
- Automatische terugkeer uit de recepten-app.
- Voorraad automatisch aanpassen.

## Zoeken

- Productresultaten zijn actieve concrete producten en bevatten één `productId`.
- Zoektekst matcht samenstellingsnaam en merk; resultaatweergave bevat verpakkingstype en inhoud wanneer bekend.
- Gerechtresultaten zijn eigen niet-gearchiveerde recepten plus publieke niet-gearchiveerde recepten van anderen.
- Met zoekterm: eerst producten en daarna gerechten, alfabetisch binnen type.
- Zonder zoekterm: recente producten en gerechten gemengd op consumptierecentie.
- Een toegankelijk gerecht kan een link `Recept bekijken` tonen.

## Producthoeveelheid

Na selectie kiest de gebruiker exact één invoermodus:

- `FULL_PRODUCT`: hoeveelheid concrete producten/verpakkingen;
- `PRODUCT_PORTION`: optionele benoemde productportie;
- `CONTENT_UNIT`: compatibele massa-, volume- of teleenheid.

De productinhoud of portiedefinitie bepaalt de omrekening. Invoer is positief decimaal, behalve waar COUNT uitsluitend gehele stuks vereist.

## Gerecht

- De gebruiker voert een positief decimaal aantal receptporties in.
- De backend pint de nieuwste `dish_version` op create-moment.
- Publieke recepten van anderen zijn logbaar; private recepten alleen door de maker.
- De voedingsberekening gebruikt de gepinde ingrediënten/hoeveelheden en actuele productmacro's.

## Opslaan

- Client genereert vooraf een log-UUID voor idempotente retries.
- Browsertijdzone is verplicht en bepaalt de lokale kalenderdag.
- Bij succes wordt het logboek voor de gekozen datum opnieuw gevalideerd en sluit de routegebonden modal.

## Acceptatiecriteria

### AC-01 — Geen beheer

Gegeven de zoekstap
Dan bestaat geen actie `Nieuw gerecht aanmaken`
En is `Recepten` een cross-app navigatielink.

### AC-02 — Productlog

Gegeven een actief concreet product
Wanneer een geldige hoeveelheid en invoermodus worden opgeslagen
Dan verwijst het log naar `product.id`.

### AC-03 — Publiek gerecht

Gegeven een publiek recept van een andere maker
Wanneer de gebruiker dit als gerecht logt
Dan pint het log de nieuwste versie
En blijft de maker eigenaar.
