# Spec-index — Inventory client doelmodel

## Doel

Inventory beheert fysieke voorraad op basis van concrete catalogusproducten. Iedere gekochte verpakking is één `inventory_item` met eigen locatie, THT en resterende inhoud. Volledige identieke items worden alleen in de presentatie gegroepeerd.

## Specs

| Feature | Functionele spec | UI-specificatie | Status |
| --- | --- | --- | --- |
| Voorraad inzien en filteren | [voorraad-inzien-specificatie.md](./voorraad-inzien-specificatie.md) | [voorraad-inzien-ui-specificatie.md](./voorraad-inzien-ui-specificatie.md) | Doelmodel |
| Voorraad toevoegen | [voorraad-toevoegen-bottom-sheet-specificatie.md](./voorraad-toevoegen-bottom-sheet-specificatie.md) | [voorraad-toevoegen-bottom-sheet-ui-specificatie.md](./voorraad-toevoegen-bottom-sheet-ui-specificatie.md) | Te migreren |
| Voorraad aanpassen | [voorraad-aanpassen-specificatie.md](./voorraad-aanpassen-specificatie.md) | [voorraad-aanpassen-ui-specificatie.md](./voorraad-aanpassen-ui-specificatie.md) | Doelmodel |

## Acceptatietests

- [Inventory-acceptatietestspecificatie](./inventory-acceptatietest-specificatie.md)

## Bronnen

- [Inventory domeinregels](../../domein/inventory-domeinregels.md)
- [Storage ERD](../../backend/ERD/STORAGE_ERD.md)
- [Inventory endpoints](../../backend/Endpoints/INVENTORY_ENDPOINTS.md)
- [Productcatalogus domeinregels](../../domein/productcatalogus-domeinregels.md)

## Rollen en routes

Iedere ingelogde gebruiker kan voorraad inzien. Alleen beheerders kunnen toevoegen of aanpassen. De app blijft gemount op `/inventory`; Product Management Admin blijft bereikbaar via `/product-management-admin/product-catalogus?source=inventory`.

## Leidende regels

- Inventory verwijst rechtstreeks naar concreet `product.id`; `product_package_id` vervalt.
- Eén persistente rij is één fysieke verpakking.
- Maximale inhoud wordt live afgeleid van het product; voorraad bewaart resterende inhoud in de basiseenheid.
- Een leeg item verdwijnt uit actieve voorraad maar mutatiehistorie blijft bewaard.
- Verschillende fysieke geopende verpakkingen kunnen tegelijk bestaan, ook op verschillende locaties en met verschillende resterende inhoud.
- Consumptielogs muteren voorraad niet automatisch.
