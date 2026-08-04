# Admin dashboard requirements

Dit bestand is een korte ingang naar de actuele admin-docs. Gedrag staat per feature in de specs.

## Algemene layout

- Op desktop staat de admin-dashboardcontent horizontaal en verticaal gecentreerd in de viewport.
- Op kleinere schermen blijft de mobiele/top-aligned layout leidend, met een rand van ongeveer 1em rondom de admin-content.
- De admin-navbar heeft bovenaan extra ademruimte binnen het dashboardframe.
- De afstand tussen de admin-navbar en de eerste content, zoals de productcatalogus-zoekbalk, is compact zodat de zoekbalk visueel dichter onder de navigatie staat.

## Zelfstandige applicatiestructuur

- Product Management Admin is een zelfstandige React Router-app onder `apps/product-management-admin`.
- De app wordt onafhankelijk van Calorie Tracker en Inventory gebouwd en gedeployed onder `/product-management-admin`.
- De inhoudelijke adminpagina's, paginacomponenten, loaders, actions, server-adapters en featurecomponenten staan rechtstreeks in `apps/product-management-admin`.
- Het tijdelijke gedeelde package `packages/admin-dashboard` vervalt, omdat geen andere applicatie de adminimplementatie meer gebruikt.
- De admin-app beheert haar eigen documentroot, routeboom, login, autorisatiegrens, applicatielayout, admin-navbar, dashboardframe en bottom-tabbar.
- Calorie Tracker en Inventory bevatten geen inhoudelijke adminroutes en verwijzen met een gewone browserlink naar deze admin-app.
- De app-interne route `/` stuurt een ingelogde beheerder door naar `/product-catalogus` met behoud van een geldige `source`.
- Een niet-ingelogde bezoeker van een inhoudelijke adminroute wordt doorgestuurd naar `/login` met behoud van de geldige bron- en terugkeercontext.
- Een ingelogde gebruiker zonder beheerdersrol krijgt geen toegang tot inhoudelijke adminroutes.
- De publieke productcatalogusroute is `/product-management-admin/product-catalogus`.
- De publieke opbergplaatsenroute is `/product-management-admin/locations`.
- De admin-app gebruikt de [gedeelde bottom-tabbar en applicatieshell](../specs/shared/bottom-tabbar-specificatie.md).
- De bottom-tabbar blijft zichtbaar op inhoudelijke adminroutes. De admin-layout reserveert 64 px aan de onderzijde: 56 px voor de tabbar en 8 px tussenruimte.

## Terugkeercontext

- Calorie Tracker opent admin met `source=calory-tracker`; Inventory gebruikt `source=inventory`.
- Alleen deze twee waarden zijn geldig. De waarde verleent geen autorisatie en wordt niet als vrije redirect-URL geïnterpreteerd.
- De admin-layout vertaalt de geldige bron naar één terugkeertab: `Calory Tracker` naar `/calory-tracker` of `Inventarisatie` naar `/inventory`.
- De actuele geldige queryparameter is leidend en blijft behouden tijdens interne links, zoekopdrachten, formulieracties, redirects en login.
- Een laatst bekende geldige bron mag als fallback worden gebruikt wanneer een vervolgverzoek geen geldige bron bevat.
- Zonder geldige actuele of bekende bron toont de admin-layout geen terugkeertab.

## Productcatalogus

- Product requirements: [product-requirements.md](./product-requirements.md)
- Spec-index: [productcatalogus-specificatie.md](../specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md)

Actuele admin productcatalogus-features:

1. [Product aanmaken](../specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md)
2. [Product zoeken](../specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md)
3. [Browsbare productcatalogus](../specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md)

## Opbergplaatsen

- Beheerfeature: [opbergplaatsen-beheren-specificatie.md](../specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-specificatie.md)
- Gedeelde domeinregels: [opbergplaatsen-domeinregels.md](../domein/opbergplaatsen-domeinregels.md)
- Endpointcontract: [LOCATION_ENDPOINTS.md](../backend/Endpoints/LOCATION_ENDPOINTS.md)
- Datamodel: [STORAGE_ERD.md](../backend/ERD/STORAGE_ERD.md)

De huidige `/locations`-pagina is een niet-functionele placeholder. De geplande feature beheert één gedeelde hiërarchische locatieboom voor Inventory.

## Buiten admin

Inventory/inventarisatie-client specs staan apart onder:

- [Inventory client spec-index](../specs/inventory-client/inventory-client-specificatie.md)
