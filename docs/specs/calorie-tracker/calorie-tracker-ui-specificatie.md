# UI-specificatie — Calorie Tracker-appshell

## Status

- Onderdeel: Calorie Tracker
- Functionele spec-index: [calorie-tracker-specificatie.md](./calorie-tracker-specificatie.md)
- Gedeelde shell: [bottom-tabbar-ui-specificatie.md](../shared/bottom-tabbar-ui-specificatie.md)
- Status: concept

## Doel

Dit document is de bron van waarheid voor de Calorie Tracker-specifieke opbouw binnen de gedeelde applicatieshell. Featurelayouts staan in hun eigen UI-specificaties.

## Datumheader en navbar

- Caloriestatistieken en Consumptielogboek delen dezelfde datumheader en Calorie Tracker-navbar.
- De navbar bevat een gewone cross-app link `Recepten` naar `/recepten`; recepten zijn geen bottom-tab en worden niet in de Calorie Tracker beheerd.
- Op desktop staan de datumselector en navbar in de normale documentflow onder elkaar.
- De navbarlinks staan horizontaal gecentreerd.
- De navbar gebruikt `2em` bovenpadding en `1em` onderpadding.

De achtergrond-, contentbreedte- en bottom-tabbarregels staan in de [gedeelde bottom-tabbar-UI-specificatie](../shared/bottom-tabbar-ui-specificatie.md).
