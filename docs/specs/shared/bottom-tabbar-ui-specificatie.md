# UI-specificatie — gedeelde bottom-tabbar en applicatieshell

## Status

- Onderdeel: gedeelde clientnavigatie
- Functionele specificatie: [bottom-tabbar-specificatie.md](./bottom-tabbar-specificatie.md)
- Hosts: Calorie Tracker, Inventory en Product Management Admin
- Status: geïmplementeerd en uitgerold

## Doel

Dit document is de bron van waarheid voor de maatvoering, responsieve positionering en visuele vormgeving van de gedeelde bottom-tabbar en applicatieshell.

## Algemene layout

- De bottom-tabbar staat vast onderaan de viewport.
- Op compacte viewports bestaat de totale hoogte uit **56 px bruikbare tabbarhoogte plus `env(safe-area-inset-bottom, 0px)`**.
- De veilige onderruimte wordt als onderpadding binnen de vaste tabbar opgenomen; labels en pictogrammen blijven in de 56 px bruikbare hoogte.
- De tabbar staat boven de pagina-inhoud met `z-index: 40`.
- Iedere hostlayout reserveert op compacte viewports minimaal `calc(64px + env(safe-area-inset-bottom, 0px))` aan de onderzijde: 56 px bruikbare tabbarhoogte, 8 px tussenruimte en de volledige veilige onderruimte.
- Vanaf een viewportbreedte van 520 px is de tabbar maximaal 430 px breed, staat deze horizontaal gecentreerd en houdt deze `calc(2em + env(safe-area-inset-bottom, 0px))` afstand tot de onderkant van de viewport.
- De Calorie Tracker-appshell gebruikt `#101020` als achtergrond buiten de pagina-inhoud.
- De Calorie Tracker-content gebruikt op compacte viewports een gecentreerde container van maximaal 430 px.
- Vanaf het desktopbreakpoint mag de routecontent verbreden tot maximaal 1208 px; de bottom-tabbar blijft onafhankelijk maximaal 430 px breed en gecentreerd.

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

## Visuele acceptatiecriteria

### UI-AC-01 — Hoogte en contentruimte

Gegeven dat de bottom-tabbar op een compact viewport zichtbaar is
Dan heeft deze 56 px bruikbare hoogte plus de volledige `safe-area-inset-bottom`
En reserveert de actieve applicatielayout minimaal 64 px plus diezelfde veilige onderruimte aan de onderzijde
En blijft er 8 px tussenruimte tussen de content en de bruikbare tabbar.

### UI-AC-02 — Responsieve breedte en positie

Gegeven dat de viewport minimaal 520 px breed is
Dan is de tabbar maximaal 430 px breed
En staat deze horizontaal gecentreerd
En staat deze `2em` plus de aanwezige `safe-area-inset-bottom` van de onderkant van de viewport
En zijn de buitenste hoeken met 8 px afgerond.

### UI-AC-03 — Responsieve Calorie Tracker-content

Gegeven dat de Calorie Tracker op een compact viewport wordt getoond
Dan blijft de contentcontainer maximaal 430 px breed en gecentreerd.

Gegeven dat het desktopbreakpoint actief is
Dan mag de routecontent verbreden tot maximaal 1208 px
En blijft de bottom-tabbar maximaal 430 px breed en onafhankelijk gecentreerd.
