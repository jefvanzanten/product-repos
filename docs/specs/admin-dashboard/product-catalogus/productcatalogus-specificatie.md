# Spec-index — admin productcatalogus

## Doelmodel

De structurele bron van waarheid voor de catalogusrevamp is [productmodel-v2-specificatie.md](./productmodel-v2-specificatie.md). In het doelmodel:

- één `product_composition` deelt naam, merk, categorie, consumptietype en macroprofiel;
- iedere concrete verpakking/uitvoering is één rechtstreeks selecteerbaar `product`;
- catalogusresultaten zijn een platte lijst concrete producten;
- `product_package` verdwijnt als zelfstandig domein- en selectieniveau.

## Specs

| Feature | Specificatie | Status |
| --- | --- | --- |
| Productmodel v2 | [productmodel-v2-specificatie.md](./productmodel-v2-specificatie.md) | Doelmodel, leidend voor migratie |
| Product aanmaken | [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md) | Huidige v1-flow; te vervangen door v2-slices |
| Product zoeken | [product-zoeken-specificatie.md](./product-zoeken-specificatie.md) | Huidige UI; resultaten migreren naar concrete producten |
| Browsen | [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md) | Huidige UI; resultaten migreren naar concrete producten |
| Productdetail | [product-detail-specificatie.md](./product-detail-specificatie.md) | Huidige root/package-flow; te migreren |
| Archiveren | [product-archiveren-specificatie.md](./product-archiveren-specificatie.md) | Concrete producten archiveren in v2 |

## Applicatie en routes

Product Management Admin blijft zelfstandig gemount onder `/product-management-admin`; app-interne productcatalogusroutes beginnen met `/product-catalogus`. Beheerdersautorisatie en geldige `source=inventory|calorie-tracker`-context blijven ongewijzigd.

De v2-routes gebruiken concrete `productId`'s:

| Route | Doel |
| --- | --- |
| `/product-catalogus` | concrete producten zoeken en browsen |
| `/product-catalogus/nieuw` | samenstelling kiezen/maken en concreet product aanmaken |
| `/product-catalogus/:productId` | concreet productdetail plus gedeelde samenstellingsdata |

Oude package-detailroutes verdwijnen na een compatibiliteitsperiode.

## Bronnen

- [Product ERD](../../../backend/ERD/PRODUCT_ERD.md)
- [Productcatalogus domeinregels](../../../domein/productcatalogus-domeinregels.md)
- [Productcatalogus v2 endpoints](../../../backend/Endpoints/PRODUCT_CATALOG_V2_ENDPOINTS.md)
- [Migratie- en appplannen](../../../plans/productmodel-v2-masterplan.md)
