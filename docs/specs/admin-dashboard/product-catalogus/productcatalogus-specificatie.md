# Spec-index - admin productcatalogus

Dit bestand is alleen een index. Gedrag staat per feature in losse specs, zodat oude flows niet door elkaar blijven lopen.

## Actuele specs

| Feature | Spec | Status |
| --- | --- | --- |
| Product aanmaken | [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md) | Huidige vertical slice |
| Product zoeken | [product-zoeken-specificatie.md](./product-zoeken-specificatie.md) | Geimplementeerd |
| Browsbare productcatalogus | [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md) | Geimplementeerd |
| Productdetail en verpakkingen | [product-detail-specificatie.md](./product-detail-specificatie.md) | Geimplementeerd |

## Onderliggende backenddocumenten

- [Admin dashboard endpoints](../../../backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md)
- [Product ERD](../../../backend/ERD/PRODUCT_ERD.md)

## Productcatalogus-routes

| Route | Hoort bij | Status |
| --- | --- | --- |
| `/admin/product-catalogus` | zoeken + browsen + rootcategorie aanmaken | geimplementeerd |
| `/admin/product-catalogus/categorieen/nieuw` | rootcategorie aanmaken | geimplementeerd |
| `/admin/product-catalogus/nieuw` | product aanmaken vanuit expliciete context | geimplementeerd |
| `/admin/product-catalogus/:productId` | productdetail | geimplementeerd |
| `/admin/product-catalogus/:productId/verpakkingen/nieuw` | verpakking toevoegen | geimplementeerd |
| `/admin/product-catalogus/:productId/verpakkingen/:packageId` | verpakkingdetail | geimplementeerd |

## Leidende termen

Gebruik in de UI en specs alleen deze catalogustermen:

- categorie;
- merk;
- product/productnaam;
- verpakking/verpakkingstype;
- inhoud/inhoudseenheid;
- aantal per verpakking.

Verwijderde productmanagementmodellen horen niet terug in deze specs. Nieuwe requirements horen in de feature-spec waar ze bij horen.
