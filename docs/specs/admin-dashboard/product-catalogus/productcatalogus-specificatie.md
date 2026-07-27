# Spec-index — admin productcatalogus

Dit bestand is alleen een index. Gedrag staat per feature in losse specs, zodat oude flows niet door elkaar blijven lopen.

## Actuele specs

| Feature | Spec | Status |
| --- | --- | --- |
| Product aanmaken | [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md) | Huidige vertical slice |
| Product zoeken | [product-zoeken-specificatie.md](./product-zoeken-specificatie.md) | Deels aanwezig: zoekveld en merk-suggesties |
| Browsbare productcatalogus | [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md) | Gepland / nog niet geïmplementeerd |

## Onderliggende backenddocumenten

- [Admin dashboard endpoints](../../../backend/Endpoints/ADMIN_DASHBOARD_ENDPOINTS.md)
- [Product ERD](../../../backend/ERD/PRODUCT_ERD.md)

## Productcatalogus-routes

| Route | Hoort bij | Status |
| --- | --- | --- |
| `/admin/product-catalogus/producten` | zoeken + browsen + toegang tot product aanmaken | huidige pagina is nog minimaal |
| `/admin/product-catalogus/producten/nieuw` | product aanmaken | huidige vertical slice |

## Leidende termen

Gebruik in de UI en specs alleen deze catalogustermen:

- categorie;
- merk;
- product/productnaam;
- verpakking/verpakkingstype;
- inhoud/inhoudseenheid;
- aantal per verpakking.

Verwijderde productmanagementmodellen horen niet terug in deze specs. Nieuwe requirements horen in de feature-spec waar ze bij horen.
