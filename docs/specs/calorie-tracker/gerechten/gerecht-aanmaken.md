# Specificatie — Gerecht aanmaken in Calorie Tracker (vervallen)

## Status

- Status: wordt verwijderd door extractie naar de Recepten-app
- Vervangende specificatie: [recipe-app-spec.md](../../recipe/recipe-app-spec.md)
- Historisch implementatieplan: [calorie-tracker-gerechten-implementatieplan.md](../../../plans/calorie-tracker-gerechten-implementatieplan.md)

## Besluit

De route `/logs/new/dish` en het Calorie Tracker-formulier voor gerechtbeheer zijn geen onderdeel van het doelmodel. Recepten worden aangemaakt en beheerd onder `/recepten`; de Calorie Tracker zoekt en logt alleen bestaande gerechten.

Na één compatibiliteitsrelease mag de oude route redirecten naar `/recepten/nieuw`. Er is in de recepten-MVP geen automatische terugkeer naar een nieuw consumptielog en geen vooraf geselecteerd gerecht.
