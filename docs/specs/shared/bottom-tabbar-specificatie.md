# Specificatie — gedeelde bottom-tabbar en applicatieshell

## Status

- Onderdeel: gedeelde clientnavigatie
- Hosts: Calorie Tracker, Inventory en Product Management Admin
- Status: wijziging gepland

## Doel

Calorie Tracker, Inventory en Product Management Admin gebruiken dezelfde bottom-tabbarpresentatie. Iedere applicatie blijft eigenaar van haar links, actieve status en autorisatie. Calorie Tracker en Inventory openen één zelfstandig gedeployed admin-dashboard. Het admin-dashboard toont als terugkeertab de applicatie van waaruit de beheerder het dashboard heeft geopend.

## Publieke applicatieroutes

| Applicatie | Publiek basispad |
| --- | --- |
| Calorie Tracker | `/calory-tracker` |
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

## Algemene layout

- De bottom-tabbar staat vast onderaan de viewport.
- De hoogte is **56 px**.
- De tabbar staat boven de pagina-inhoud met `z-index: 40`.
- Iedere layout met een bottom-tabbar reserveert 64 px aan de onderzijde: 56 px voor de tabbar en 8 px tussenruimte. Hierdoor valt content niet achter de tabbar.
- Vanaf een viewportbreedte van 520 px is de tabbar maximaal 430 px breed, staat deze horizontaal gecentreerd en houdt deze `2em` afstand tot de onderkant van de viewport.
- De Calorie Tracker-appshell gebruikt `#101020` als achtergrond buiten de pagina-inhoud.
- De Calorie Tracker-hoofdpagina is maximaal 430 px breed en staat horizontaal gecentreerd.

## Visuele vormgeving

- De achtergrond van de tabbar is bijna zwart en licht transparant.
- De tabbar heeft bovenaan een subtiele lichte scheidingsschaduw.
- Er is geen extra verticale binnenruimte in de tabbar.
- Alle links verdelen de beschikbare breedte gelijkmatig.
- Tussen de tabs staat een verticale scheidingslijn; de laatste tab heeft geen rechter scheidingslijn.
- Op viewports vanaf 520 px hebben de tabbar en de buitenste hoeken van het eerste en laatste tabitem een afronding van 8 px.
- Een tab toont boven het label een vierkant pictogram van 13 bij 13 px met afgeronde hoeken.
- Een inactieve tab gebruikt gedempte grijstinten.
- Een actieve tab gebruikt lichtere tekst en een lichter pictogram.
- Tablabels gebruiken een lettergrootte van 9 px.

## App-specifieke tabs

### Calorie Tracker

| Label | Publieke bestemming | Zichtbaarheid |
| --- | --- | --- |
| `Calory Tracker` | `/calory-tracker` | Iedere ingelogde gebruiker |
| `Admin Dashboard` | `/product-management-admin/product-catalogus?source=calory-tracker` | Alleen een ingelogde beheerder |

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
| `calory-tracker` | `Calory Tracker` | `/calory-tracker` | `/product-management-admin/product-catalogus?source=calory-tracker` |

De terugkeertab is in de admin-app niet actief; de tab `Admin dashboard` is actief. De terugkeertab opent de bronapp op haar basisroute.

## Broncontext van het admin-dashboard

- De queryparameter heet `source`.
- Alleen `inventory` en `calory-tracker` zijn geldige waarden.
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

- Binnen Calorie Tracker markeert de basisroute uitsluitend `Calory Tracker` als actief.
- Binnen Inventory markeert de basisroute uitsluitend `Inventarisatie` als actief.
- De navbar bovenaan de Calorie Tracker-pagina's verzorgt de navigatie en actieve status voor `Caloriestatistieken` en `Consumptielogboek`.
- Binnen Product Management Admin markeren alle inhoudelijke adminroutes `Admin dashboard` als actief.
- De bottom-tabbar blijft zichtbaar op inhoudelijke adminroutes.
- Navigatie van Calorie Tracker of Inventory naar Product Management Admin is een volledige cross-app browsernavigatie.

## Acceptatiecriteria

### AC-01 — Gedeelde component

Gegeven dat een van de drie applicaties de hoofdnavigatie toont
Dan gebruikt deze de bottom-tabbarcomponent uit `packages/shared`
En levert de applicatielayout zelf de links en actieve status aan.

### AC-02 — Hoogte en contentruimte

Gegeven dat de bottom-tabbar zichtbaar is
Dan is deze 56 px hoog
En reserveert de actieve applicatielayout 64 px aan de onderzijde
En blijft er 8 px tussenruimte tussen de content en de tabbar.

### AC-03 — Responsieve breedte en positie

Gegeven dat de viewport minimaal 520 px breed is
Dan is de tabbar maximaal 430 px breed
En staat deze horizontaal gecentreerd
En staat deze `2em` van de onderkant van de viewport
En zijn de buitenste hoeken met 8 px afgerond.

### AC-04 — Calorie Tracker naar admin

Gegeven dat een ingelogde beheerder de Calorie Tracker gebruikt
Wanneer die `Admin Dashboard` opent
Dan navigeert de browser naar `/product-management-admin/product-catalogus?source=calory-tracker`
En toont de admin-bottom-tabbar `Calory Tracker` als terugkeertab naar `/calory-tracker`.

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
