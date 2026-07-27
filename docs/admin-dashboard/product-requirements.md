# Product requirements — admin productcatalogus

## Status

- Product: `apps/inventory-admin_panel`
- Gebied: admin dashboard > productcatalogus
- Spec-index: `docs/specs/admin-dashboard/product-catalogus/productcatalogus-specificatie.md`

## Doel

Het admin dashboard beheert catalogusstamdata. De inventory client gebruikt die data later om voorraad te kunnen registreren en bekijken.

## Huidige werkende slice

De huidige admin-slice is product aanmaken:

- productcataloguspagina openen;
- direct naar `Product aanmaken` navigeren;
- categorie kiezen, inline aanmaken en veilig verwijderen;
- merk zoeken, kiezen of inline aanmaken;
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

| Route | Feature |
| --- | --- |
| `/admin/product-catalogus/producten` | zoeken/browsen + toegang tot product aanmaken |
| `/admin/product-catalogus/producten/nieuw` | product aanmaken |
| `/admin/locations` | opbergplaatsen beheren, buiten productcatalogus-specs |

## Backendbronnen

- [Admin dashboard endpoints](../backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md)
- [Product ERD](../backend/ERD/PRODUCT_ERD.md)
