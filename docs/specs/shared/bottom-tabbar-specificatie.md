# Specificatie — gedeelde bottom-tabbar en applicatieshell

## Status

- Onderdeel: gedeelde clientnavigatie
- Hosts: Calorie Tracker en Inventory
- Status: minimaal geraamte

## Doel

Calorie Tracker en Inventory gebruiken dezelfde bottom-tabbar, terwijl iedere host-app zelf bepaalt welke navigatielinks erin staan. Hierdoor blijven de presentatie en het actieve gedrag gedeeld zonder app-specifieke routes in de gedeelde component vast te leggen.

## Architectuur

- De bottom-tabbar staat onder `packages/shared/components/bottom-tab-bar`.
- De component ontvangt de navigatielinks als `children`.
- Calorie Tracker en Inventory plaatsen hun eigen links in hun app-specifieke `layout.tsx`.
- Een link is actief wanneer deze `aria-current="page"` heeft.
- De host-layout bevat zowel de actieve React Router-`Outlet` als de gedeelde bottom-tabbar.

## Algemene layout

- De bottom-tabbar staat vast onderaan de viewport.
- De hoogte is **56 px**.
- De tabbar staat boven de pagina-inhoud met `z-index: 40`.
- De inhouds- en admin-layouts reserveren 64 px aan de onderzijde: 56 px voor de tabbar en 8 px tussenruimte. Hierdoor valt content niet achter de tabbar.
- Vanaf een viewportbreedte van 520 px is de tabbar maximaal 430 px breed.
- Op die bredere viewports ligt het horizontale anker op 40% van de viewport en wordt de tabbar met de helft van zijn eigen breedte teruggeschoven.
- De Calorie Tracker-appshell gebruikt `#101020` als achtergrond buiten de pagina-inhoud.
- De Calorie Tracker-hoofdpagina is maximaal 430 px breed en staat horizontaal gecentreerd.

## Visuele vormgeving

- De achtergrond van de tabbar is bijna zwart en licht transparant.
- De tabbar heeft bovenaan een subtiele lichte scheidingsschaduw.
- Er is geen extra verticale binnenruimte in de tabbar.
- Alle links verdelen de beschikbare breedte gelijkmatig.
- Iedere tab heeft rechts een verticale scheidingslijn.
- Een tab toont boven het label een vierkant pictogram van 13 bij 13 px met afgeronde hoeken.
- Een inactieve tab gebruikt gedempte grijstinten.
- Een actieve tab gebruikt lichtere tekst en een lichter pictogram.
- Tablabels gebruiken een lettergrootte van 9 px.

## App-specifieke tabs

### Calorie Tracker

| Label | Route | Zichtbaarheid |
| --- | --- | --- |
| `Caloriestatistieken` | `/` | Iedere ingelogde gebruiker |
| `Consumptielogboek` | `/logs` | Iedere ingelogde gebruiker |
| `Admin` | `/admin/product-catalogus` | Alleen een ingelogde beheerder |

De volledige Calorie Tracker staat achter authenticatie. Zichtbaarheid van de admintab vereist een expliciete beheerdersrol en niet alleen een bestaande sessie.

### Inventory

| Label | Route | Zichtbaarheid |
| --- | --- | --- |
| `Inventarisatie` | `/` | Altijd |
| `Admin dashboard` | `/admin/product-catalogus` | Altijd |

## Gedrag

- De actieve vormgeving volgt `aria-current="page"` op de aangeleverde link.
- `/` markeert uitsluitend `Caloriestatistieken` als actief.
- `/logs` en onderliggende logroutes markeren `Consumptielogboek` als actief.
- Alle routes onder `/admin` markeren de admintab als actief.
- De tabbar blijft zichtbaar wanneer een adminroute actief is.
- De app-specifieke layouts blijven eigenaar van labels, routes en conditionele zichtbaarheid.
- De gedeelde component kent geen Calorie Tracker-, Inventory- of adminroutes.

## Acceptatiecriteria

### AC-01 — Gedeelde component

Gegeven dat Calorie Tracker en Inventory de hoofdnavigatie tonen  
Dan gebruiken beide apps dezelfde bottom-tabbarcomponent uit `packages/shared`  
En leveren beide apps hun eigen links als children aan.

### AC-02 — Hoogte en contentruimte

Gegeven dat de bottom-tabbar zichtbaar is  
Dan is deze 56 px hoog  
En reserveren de pagina- en adminlayout 64 px aan de onderzijde  
En blijft er 8 px tussenruimte tussen de content en de tabbar.

### AC-03 — Actieve tab

Gegeven dat een aangeleverde link overeenkomt met de actuele route  
Dan krijgt deze via `aria-current="page"` de actieve vormgeving  
En markeren alle routes onder `/admin` de admin-tab als actief.

### AC-04 — Responsieve breedte en positie

Gegeven dat de viewport minimaal 520 px breed is  
Dan is de tabbar maximaal 430 px breed  
En gebruikt deze het horizontale anker op 40% van de viewport.

### AC-05 — Calorie Tracker-autorisatie

Gegeven dat de gebruiker niet geauthenticeerd is  
Dan toont de Calorie Tracker geen persoonlijke applicatieshell.
Gegeven dat de gebruiker is ingelogd zonder beheerdersrol
Dan toont de Calorie Tracker-layout geen admintab.
Gegeven dat de gebruiker een beheerder is
Dan is de admintab zichtbaar en zijn de adminroutes toegankelijk.
