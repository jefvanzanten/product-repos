# Spec-index — inventory client

Dit is de index voor de client/inventarisatiekant van de app. Dit is niet de admin productcatalogus.

## Actuele specs

| Feature | Functionele spec | UI-specificatie | Status |
| --- | --- | --- | --- |
| Voorraad inzien | [voorraad-inzien-specificatie.md](./voorraad-inzien-specificatie.md) | [voorraad-inzien-ui-specificatie.md](./voorraad-inzien-ui-specificatie.md) | Gepland / te herwerken |
| Voorraad toevoegen | [voorraad-toevoegen-bottom-sheet-specificatie.md](./voorraad-toevoegen-bottom-sheet-specificatie.md) | [voorraad-toevoegen-bottom-sheet-ui-specificatie.md](./voorraad-toevoegen-bottom-sheet-ui-specificatie.md) | Geïmplementeerd |
| Voorraad aanpassen | [voorraad-aanpassen-specificatie.md](./voorraad-aanpassen-specificatie.md) | [voorraad-aanpassen-ui-specificatie.md](./voorraad-aanpassen-ui-specificatie.md) | Gepland |

## Rollen

Iedere ingelogde gebruiker kan de voorraad inzien en doorzoeken. Alleen beheerders kunnen voorraad toevoegen en aanpassen; mutatie-endpoints weigeren niet-beheerders zelfstandig. Voorraad is gedeeld over alle ingelogde gebruikers. Product- en locatiebeheer blijft in Product Management Admin. De gedeelde locatieregels staan in [opbergplaatsen-domeinregels.md](../../domein/opbergplaatsen-domeinregels.md).

## UI-specificaties

Featurepresentatie staat in de gekoppelde UI-specificaties van de onderliggende features. De overkoepelende navigatie volgt de [functionele specificatie](../shared/bottom-tabbar-specificatie.md) en [UI-specificatie](../shared/bottom-tabbar-ui-specificatie.md) voor de gedeelde bottom-tabbar en applicatieshell.

## Routes en adminnavigatie

De React Router-routes van deze app worden in productie onder het publieke basispad `/inventory` gemount.

| Bestemming | App-interne route | Publieke bestemming |
| --- | --- | --- |
| Inventory client / inventarisatie-tab | `/` | `/inventory` |
| Product Management Admin | niet van toepassing | `/product-management-admin/product-catalogus?source=inventory` |

De adminbestemming is voor een ingelogde beheerder een gewone browserlink naar een andere deployment. Product Management Admin gebruikt `source=inventory` om in zijn bottom-tabbar een terugkeertab naar `/inventory` te tonen. Inventory bevat zelf geen inhoudelijke adminroutes. De regels voor bronbehoud staan in de [gedeelde bottom-tabbar- en applicatieshellspecificatie](../shared/bottom-tabbar-specificatie.md).

## Richting

De inventory client is bedoeld voor voorraad gebruiken en bijwerken. Voorraad is een geheel aantal gekozen verpakkingen per combinatie productverpakking + opbergplaats + houdbaarheidsdatum; opbergplaats is altijd verplicht. Catalogusbeheer blijft in Product Management Admin. Inventory toont geen cross-app links; wanneer een product of opbergplaats ontbreekt, ziet de gebruiker alleen een neutrale melding of een disabled toevoegflow.

## Overkoepelend acceptatiecriterium — zelfstandige adminnavigatie

Gegeven dat een ingelogde beheerder Inventory gebruikt
Wanneer die Product Management Admin opent
Dan verlaat de browser de Inventory-deployment
En opent `/product-management-admin/product-catalogus?source=inventory`
En bevat Inventory zelf geen inhoudelijke adminroute.
