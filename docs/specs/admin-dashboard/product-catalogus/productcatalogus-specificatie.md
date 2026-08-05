# Spec-index - admin productcatalogus

Dit bestand is alleen een index. Gedrag staat per feature in losse specs, zodat oude flows niet door elkaar blijven lopen.

## Actuele specs

| Feature | Functionele spec | UI-specificatie | Status |
| --- | --- | --- | --- |
| Product aanmaken | [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md) | [product-aanmaken-ui-specificatie.md](./product-aanmaken-ui-specificatie.md) | Huidige vertical slice |
| Product zoeken | [product-zoeken-specificatie.md](./product-zoeken-specificatie.md) | [product-zoeken-ui-specificatie.md](./product-zoeken-ui-specificatie.md) | Geimplementeerd |
| Browsbare productcatalogus | [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md) | [productcatalogus-browsen-ui-specificatie.md](./productcatalogus-browsen-ui-specificatie.md) | Geimplementeerd |
| Productdetail en verpakkingen | [product-detail-specificatie.md](./product-detail-specificatie.md) | [product-detail-ui-specificatie.md](./product-detail-ui-specificatie.md) | Geïmplementeerde basis; uitbreiding concept |
| Producten en verpakkingen archiveren | [product-archiveren-specificatie.md](./product-archiveren-specificatie.md) | [product-archiveren-ui-specificatie.md](./product-archiveren-ui-specificatie.md) | Concept |

## Applicatie, routes en autorisatie

- Product Management Admin is een zelfstandige applicatie onder het publieke basispad `/product-management-admin`.
- De productcatalogusimplementatie, routes, loaders, actions, server-adapters en featurecomponenten staan rechtstreeks onder `apps/product-management-admin`.
- Er is geen afzonderlijk `packages/admin-dashboard`-package en Calorie Tracker en Inventory importeren geen adminfeaturecode.
- De routes in deze spec en de onderliggende featurespecificaties zijn app-interne routes; de publieke URL ontstaat door `/product-management-admin` ervoor te plaatsen.
- Alle routes onder `/product-catalogus` vereisen een ingelogde gebruiker met de beheerdersrol.
- Alleen ingelogd zijn is niet voldoende.
- De beheerder krijgt via deze routes geen toegang tot persoonlijke consumptielogs of doelen van andere gebruikers.
- De optionele queryparameter `source` bevat uitsluitend `inventory` of `calorie-tracker` en bepaalt de terugkeertab van de admin-app.
- Iedere interne link, GET-formulieractie, mutation en redirect behoudt een geldige `source` naast featureparameters zoals `q`, `categoryId`, `brandId` en `status`.
- Routevoorbeelden in de productcatalogusspecificaties laten `source` alleen voor leesbaarheid weg; wanneer de admin-app met een geldige broncontext is geopend, blijft die parameter wel aanwezig.

## UI-specificaties

Dit bestand is alleen een functionele index. Presentatie-eisen staan in de gekoppelde `*-ui-specificatie.md`-bestanden van de onderliggende features.

## Onderliggende documenten

- [Productcatalogus domeinregels](../../../domein/productcatalogus-domeinregels.md)
- [Admin dashboard endpoints](../../../backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md)
- [Product ERD](../../../backend/ERD/PRODUCT_ERD.md)

## Productcatalogus-routes

| App-interne route | Hoort bij | Status |
| --- | --- | --- |
| `/product-catalogus` | zoeken + browsen + rootcategorie aanmaken | geimplementeerd |
| `/product-catalogus/categorieen/nieuw` | rootcategorie aanmaken | geimplementeerd |
| `/product-catalogus/nieuw` | product aanmaken vanuit expliciete context | geimplementeerd |
| `/product-catalogus/:productId` | productdetail | geimplementeerd |
| `/product-catalogus/:productId/verpakkingen/nieuw` | verpakking toevoegen | geimplementeerd |
| `/product-catalogus/:productId/verpakkingen/:packageId` | verpakkingdetail | geimplementeerd |

## Leidende termen

Gebruik in de UI en specs alleen deze catalogustermen:

- categorie;
- merk;
- product/productnaam;
- verpakking/verpakkingstype;
- inhoud/inhoudseenheid;
- aantal per verpakking;
- product- en verpakkingsafbeelding;
- consumptietype;
- macroprofiel;
- actief/gearchiveerd.

Producten en verpakkingen worden nooit definitief verwijderd. Archiveren en heractiveren staan in [product-archiveren-specificatie.md](./product-archiveren-specificatie.md).

Verwijderde productmanagementmodellen horen niet terug in deze specs. Nieuwe requirements horen in de feature-spec waar ze bij horen.
