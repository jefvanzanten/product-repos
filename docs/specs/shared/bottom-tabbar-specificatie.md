# Specificatie — gedeelde bottom-tabbar en applicatieshell

## Status

- Onderdeel: gedeelde clientnavigatie
- Hosts: Calorie Tracker, Inventory en Product Management Admin
- Status: geïmplementeerd en uitgerold

## Doel

Calorie Tracker, Inventory en Product Management Admin gebruiken dezelfde bottom-tabbarpresentatie. De Recepten-app is in de MVP een afzonderlijke bestemming onder `/recepten`, maar geen nieuwe bottom-tab; Calorie Tracker mag er via een gewone cross-app link naartoe navigeren. Iedere applicatie blijft eigenaar van haar links, actieve status en autorisatie. Calorie Tracker en Inventory openen één zelfstandig gedeployed admin-dashboard. Het admin-dashboard toont als terugkeertab de applicatie van waaruit de beheerder het dashboard heeft geopend.

## Publieke applicatieroutes

| Applicatie | Publiek basispad |
| --- | --- |
| Calorie Tracker | `/calorie-tracker` |
| Inventory | `/inventory` |
| Product Management Admin | `/product-management-admin` |

De drie basispaden worden door drie afzonderlijke frontenddeployments bediend. Navigatie tussen deze applicaties is navigatie naar een andere deployment en gebruikt daarom een gewone browserlink. React Router-links blijven uitsluitend verantwoordelijk voor navigatie binnen de eigen applicatie.

## Architectuur

- De bottom-tabbar staat onder `packages/shared/components/bottom-tab-bar`.
- De component ontvangt de navigatielinks als `children` en kent zelf geen applicatieroutes.
- Iedere applicatie plaatst haar links in haar eigen applicatielayout rond de actieve React Router-`Outlet`.
- Een link is actief wanneer deze `aria-current="page"` heeft.
- Calorie Tracker en Inventory bevatten geen inhoudelijke adminroutes en hebben geen dependency op een adminfeaturepackage.
- Product Management Admin wordt zelfstandig onder `/product-management-admin` gemount en is rechtstreeks eigenaar van zijn adminroutes, loaders, actions, server-adapters en featurecomponenten.
- De adminimplementatie staat onder `apps/product-management-admin`; `packages/admin-dashboard` en package `@product-repos/admin-dashboard` bestaan in de doelarchitectuur niet meer.
- In de lokale ontwikkelomgeving blijven de drie zelfstandige Vite-devservers actief, zodat wijzigingen via HMR direct zichtbaar zijn; Docker is daarvoor niet vereist.
- Een cross-app devproxy handelt het React Router-endpoint `/<doelapp>/@react-router/critical.css` af vóór de React Router-middleware van de bronapp en stuurt het verzoek naar de Vite-devserver van de doelapp.
- De doorgestuurde kritieke stylesheet bevat de CSS van de doelroute; een succesvolle maar lege CSS-response is niet toegestaan.

## UI-specificatie

De maatvoering, responsive positionering, contentruimte en visuele vormgeving staan in [bottom-tabbar-ui-specificatie.md](./bottom-tabbar-ui-specificatie.md).

Iedere hostlayout moet voldoende onderruimte reserveren zodat content niet door de vaste tabbar wordt bedekt.

## App-specifieke tabs

### Calorie Tracker

| Label | Publieke bestemming | Zichtbaarheid |
| --- | --- | --- |
| `Calorie Tracker` | `/calorie-tracker` | Iedere ingelogde gebruiker |
| `Admin Dashboard` | `/product-management-admin/product-catalogus?source=calorie-tracker` | Alleen een ingelogde beheerder |

De volledige Calorie Tracker staat achter authenticatie. Zichtbaarheid van `Admin Dashboard` vereist een expliciete beheerdersrol. `Caloriestatistieken` en `Consumptielogboek` zijn geen afzonderlijke bottom-tabs, maar zijn bereikbaar via de eigen navbar bovenaan de Calorie Tracker-pagina's.

### Inventory

| Label | Publieke bestemming | Zichtbaarheid |
| --- | --- | --- |
| `Inventarisatie` | `/inventory` | Iedere ingelogde gebruiker |
| `Admin dashboard` | `/product-management-admin/product-catalogus?source=inventory` | Alleen een ingelogde beheerder |

### Product Management Admin

De admin-bottom-tabbar is afhankelijk van de geldige `source`-context:

| `source` | Terugkeerlabel | Terugkeerbestemming | Actieve adminbestemming |
| --- | --- | --- | --- |
| `inventory` | `Inventarisatie` | `/inventory` | `/product-management-admin/product-catalogus?source=inventory` |
| `calorie-tracker` | `Calorie Tracker` | `/calorie-tracker` | `/product-management-admin/product-catalogus?source=calorie-tracker` |

De terugkeertab is in de admin-app niet actief; de tab `Admin dashboard` is actief. De terugkeertab opent de bronapp op haar basisroute.

## Broncontext van het admin-dashboard

- De queryparameter heet `source`.
- Alleen `inventory` en `calorie-tracker` zijn geldige waarden.
- `source` identificeert uitsluitend de terugkeerbestemming en verleent geen toegang.
- Een willekeurige URL of vrij `returnTo`-doel wordt niet als bron geaccepteerd.
- Een geldige `source` blijft behouden in alle interne adminlinks, GET-formulieren, mutations, redirects en de loginflow.
- Andere functionele queryparameters, zoals `q`, `categoryId`, `brandId` en `status`, worden naast `source` gebruikt en mogen `source` niet verwijderen.
- Een geldige bron uit de actuele URL is leidend en wordt als laatst bekende geldige adminbron onthouden.
- Wanneer de actuele URL geen geldige bron bevat, mag de admin-layout de laatst bekende geldige adminbron gebruiken.
- Bij een ongeldige `source` zonder bekende geldige bron toont de admin-layout geen terugkeertab en verzint deze geen herkomst.
- De browserhistorie en de HTTP-`Referer` zijn geen bron van waarheid voor de terugkeerbestemming.
- Wanneer twee tabbladen verschillende geldige `source`-waarden bevatten, blijft de queryparameter in ieder tabblad leidend boven een onthouden fallback.

## Actieve status en navigatie

- Binnen alle inhoudelijke Calorie Tracker-routes, waaronder Caloriestatistieken en Consumptielogboek, is `Calorie Tracker` actief in de bottom-tabbar.
- Binnen Inventory markeert de basisroute uitsluitend `Inventarisatie` als actief.
- De navbar bovenaan de Calorie Tracker-pagina's verzorgt de navigatie en actieve status voor `Caloriestatistieken` en `Consumptielogboek`.
- Binnen Product Management Admin markeren alle inhoudelijke adminroutes `Admin dashboard` als actief.
- De bottom-tabbar blijft zichtbaar op inhoudelijke adminroutes.
- Navigatie van Calorie Tracker of Inventory naar Product Management Admin is een volledige cross-app browsernavigatie.
- Bij cross-app browsernavigatie beschikt de doelapp vóór de eerste zichtbare paint over haar kritieke CSS; er verschijnt geen ongestylede tussenweergave.
- De publieke basisroute zonder afsluitende slash blijft geldig en mag naar de slashvariant redirecten.

## Acceptatiecriteria

De maatvoering en responsive presentatie worden getoetst met de visuele acceptatiecriteria in de [UI-specificatie](./bottom-tabbar-ui-specificatie.md).

### AC-01 — Gedeelde component

Gegeven dat een van de drie applicaties de hoofdnavigatie toont
Dan gebruikt deze de bottom-tabbarcomponent uit `packages/shared`
En levert de applicatielayout zelf de links en actieve status aan.

### AC-04 — Calorie Tracker naar admin

Gegeven dat een ingelogde beheerder de Calorie Tracker gebruikt
Wanneer die `Admin Dashboard` opent
Dan navigeert de browser naar `/product-management-admin/product-catalogus?source=calorie-tracker`
En toont de admin-bottom-tabbar `Calorie Tracker` als terugkeertab naar `/calorie-tracker`.

### AC-05 — Inventory naar admin

Gegeven dat een ingelogde beheerder Inventory gebruikt
Wanneer die `Admin dashboard` opent
Dan navigeert de browser naar `/product-management-admin/product-catalogus?source=inventory`
En toont de admin-bottom-tabbar `Inventarisatie` als terugkeertab naar `/inventory`.

### AC-06 — Bron behouden

Gegeven dat Product Management Admin met een geldige `source` is geopend
Wanneer de beheerder intern navigeert, zoekt, een formulier verstuurt of na login wordt doorgestuurd
Dan blijft dezelfde geldige `source` in de resulterende admin-URL aanwezig
En blijft dezelfde terugkeertab zichtbaar.

### AC-07 — Ongeldige of ontbrekende bron

Gegeven dat Product Management Admin zonder geldige actuele of bekende bron wordt geopend
Dan toont de admin-bottom-tabbar geen terugkeertab
En wordt geen willekeurige bronapp gekozen.

### AC-08 — Autorisatie

Gegeven dat een gebruiker geen beheerdersrol heeft
Dan tonen Calorie Tracker en Inventory geen link naar Product Management Admin
En weigert Product Management Admin zelfstandig de inhoudelijke adminroutes.

### AC-09 — Navigatie binnen Calorie Tracker

Gegeven dat een ingelogde gebruiker een Calorie Tracker-pagina bekijkt
Dan bevat de bottom-tabbar geen afzonderlijke tabs voor `Caloriestatistieken` en `Consumptielogboek`
En zijn beide onderdelen bereikbaar via de eigen navbar bovenaan de pagina.

### AC-10 — Onafhankelijke applicaties

Gegeven dat een frontenddeployment afzonderlijk wordt gebouwd of uitgerold
Dan bevat Calorie Tracker geen Inventory- of adminrouteboom
En bevat Inventory geen Calorie Tracker- of adminrouteboom
En bevat Product Management Admin geen persoonlijke Calorie Tracker- of Inventory-features
En bevat Product Management Admin de adminimplementatie rechtstreeks
En bestaat er geen afzonderlijk adminfeaturepackage.

### AC-11 — Gestylede cross-app eerste paint

Gegeven dat een gebruiker via de bottom-tabbar naar een andere frontenddeployment navigeert
Wanneer het document van de doelapp voor het eerst zichtbaar wordt
Dan is de kritieke CSS van de doelroute al toegepast
En verschijnt er geen ongestylede tussenweergave
En blijven SVG-pictogrammen vanaf de eerste paint binnen hun vastgelegde afmetingen
En blijft een publieke basisroute zonder afsluitende slash geldig, eventueel via een redirect naar de slashvariant.

### AC-12 — Kritieke CSS via de lokale devproxy

Gegeven dat de zelfstandige Vite-devservers via de lokale cross-app proxy worden gebruikt
Wanneer een doelapp haar React Router-stylesheet via `/<doelapp>/@react-router/critical.css` opvraagt
Dan bereikt het verzoek de Vite-devserver van die doelapp voordat de bronapp het kan onderscheppen
En retourneert het endpoint een niet-lege CSS-response met de stijlen van de doelroute
En blijft HMR voor wijzigingen in iedere applicatie actief.
