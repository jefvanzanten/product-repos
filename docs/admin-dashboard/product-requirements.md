# Product requirements — admin productcatalogus

## Status

- Product: `apps/product-management-admin`
- Gebied: admin dashboard > productcatalogus
- Spec-index: `docs/specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md`

## Doel

Het admin dashboard beheert catalogusstamdata. De inventory client gebruikt die data later om voorraad te kunnen registreren en bekijken.

## Huidige werkende slice

De huidige admin-slice is product aanmaken:

- productcataloguspagina openen;
- direct naar `Product aanmaken` navigeren;
- categorie kiezen, inline aanmaken en veilig verwijderen;
- merk zoeken, kiezen of vanuit het merkveld aanmaken;
- productnaam en eerste verpakking invullen;
- product plus eerste verpakking transactioneel opslaan.

Zie: [Product aanmaken](../specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md).

## Admin productcatalogus roadmap

| Feature | Spec | Status |
| --- | --- | --- |
| Product aanmaken | [product-aanmaken-specificatie.md](../specs/admin-dashboard/product-catalogus/product-aanmaken-specificatie.md) | huidige vertical slice |
| Product zoeken | [product-zoeken-specificatie.md](../specs/admin-dashboard/product-catalogus/product-zoeken-specificatie.md) | deels aanwezig |
| Browsbare productcatalogus | [productcatalogus-browsen-specificatie.md](../specs/admin-dashboard/product-catalogus/productcatalogus-browsen-specificatie.md) | gepland |

## Niet in admin productcatalogus nu

- Productdetail.
- Product bewerken.
- Extra verpakkingen beheren.
- Barcode/EAN.
- Productfoto's.
- Publicatiestatus/archief.
- Apart merkenbeheer.
- Apart categoriebeheer buiten inline acties.

## Routes

De routes hieronder zijn app-intern. Het publieke basispad `/product-management-admin` wordt ervoor geplaatst.

| App-interne route | Feature |
| --- | --- |
| `/product-catalogus` | zoeken/browsen + toegang tot product aanmaken |
| `/product-catalogus/nieuw` | product aanmaken |
| `/locations` | opbergplaatsen beheren, buiten productcatalogus-specs |

Een geldige `source`-queryparameter blijft tijdens navigatie binnen deze routes behouden volgens de [gedeelde bottom-tabbar- en applicatieshellspecificatie](../specs/shared/bottom-tabbar-specificatie.md).

## Backendbronnen

- [Admin dashboard endpoints](../backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md)
- [Product ERD](../backend/ERD/PRODUCT_ERD.md)
