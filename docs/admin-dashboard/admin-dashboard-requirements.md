# Admin dashboard requirements

Dit bestand is een korte ingang naar de actuele admin-docs. Gedrag staat per feature in de specs.

## Algemene layout

- Op desktop staat de admin-dashboardcontent horizontaal en verticaal gecentreerd in de viewport.
- Op kleinere schermen blijft de mobiele/top-aligned layout leidend, met een rand van ongeveer 1em rondom de admin-content.
- De admin-navbar heeft bovenaan extra ademruimte binnen het dashboardframe.
- De afstand tussen de admin-navbar en de eerste content, zoals de productcatalogus-zoekbalk, is compact zodat de zoekbalk visueel dichter onder de navigatie staat.

## Gedeelde applicatiestructuur

- De inhoudelijke adminpagina's, paginacomponenten, loaders en actions worden gedeeld vanuit `packages/admin-dashboard`.
- Iedere host-app beheert haar eigen admin-layout, navbar en dashboardframe.
- De gedeelde adminpagina wordt binnen de React Router `Outlet` van deze app-specifieke layout gerenderd.
- Inventory en Calorie Tracker bieden de gedeelde adminroutes onder `/admin` aan.
- Iedere app-specifieke admin-layout volgt de algemene lay-outregels uit dit document.

## Productcatalogus

- Product requirements: [product-requirements.md](./product-requirements.md)
- Spec-index: [productcatalogus-specificatie.md](../specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md)

Actuele admin productcatalogus-features:

1. [Product aanmaken](../specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md)
2. [Product zoeken](../specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md)
3. [Browsbare productcatalogus](../specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md)

## Buiten admin

Inventory/inventarisatie-client specs staan apart onder:

- [Inventory client spec-index](../specs/inventory-client/inventory-client-specificatie.md)
