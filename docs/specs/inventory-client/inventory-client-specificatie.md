# Spec-index — inventory client

Dit is de index voor de client/inventarisatiekant van de app. Dit is niet de admin productcatalogus.

## Actuele specs

| Feature | Spec | Status |
| --- | --- | --- |
| Voorraad inzien | [voorraad-inzien-specificatie.md](./voorraad-inzien-specificatie.md) | Gepland / te herwerken |
| Voorraad toevoegen | [voorraad-toevoegen-bottom-sheet-specificatie.md](./voorraad-toevoegen-bottom-sheet-specificatie.md) | Gepland |

## Layout

Feature-inhoud staat in de `Layout`-sectie van de onderliggende specs. De overkoepelende navigatie volgt de [specificatie voor de gedeelde bottom-tabbar en applicatieshell](../shared/bottom-tabbar-specificatie.md).

## Routes en adminnavigatie

De React Router-routes van deze app worden in productie onder het publieke basispad `/inventory` gemount.

| Bestemming | App-interne route | Publieke bestemming |
| --- | --- | --- |
| Inventory client / inventarisatie-tab | `/` | `/inventory` |
| Product Management Admin | niet van toepassing | `/product-management-admin/product-catalogus?source=inventory` |

De adminbestemming is voor een ingelogde beheerder een gewone browserlink naar een andere deployment. Product Management Admin gebruikt `source=inventory` om in zijn bottom-tabbar een terugkeertab naar `/inventory` te tonen. Inventory bevat zelf geen inhoudelijke adminroutes. De regels voor bronbehoud staan in de [gedeelde bottom-tabbar- en applicatieshellspecificatie](../shared/bottom-tabbar-specificatie.md).

## Richting

De inventory client is bedoeld voor voorraad gebruiken en bijwerken. Catalogusbeheer blijft in Product Management Admin. Wanneer een product ontbreekt, verwijst de client naar de catalogus-aanmaakflow met `source=inventory` of een expliciet nog te specificeren snelle toevoegflow.

## Overkoepelend acceptatiecriterium — zelfstandige adminnavigatie

Gegeven dat een ingelogde beheerder Inventory gebruikt
Wanneer die Product Management Admin opent
Dan verlaat de browser de Inventory-deployment
En opent `/product-management-admin/product-catalogus?source=inventory`
En bevat Inventory zelf geen inhoudelijke adminroute.
