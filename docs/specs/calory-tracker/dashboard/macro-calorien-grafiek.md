# Specificatie — macro- en caloriegrafiek

## Status

- Onderdeel: calory tracker > dashboard
- Status: concept

## Doel

De gebruiker ziet direct hoeveel calorieën die op die dag heeft verbruikt en wat het targetcalorieënverbruik voor die dag is.

## Binnen scope

- Dagelijkse calorie-inname tonen.
- Dagelijks caloriedoel tonen.
- Macroverdeling tonen voor koolhydraten, vetten en eiwitten.

## Layout

- Toon een caloriecomponent waarin verbruikte calorieën en targetcalorieën voor de dag naast of in dezelfde grafiek zichtbaar zijn.
- Toon een tweede grafiek voor macro's, onderverdeeld in koolhydraten, vetten en eiwitten.
- Render het dashboard binnen de [gedeelde applicatieshell met bottom-tabbar](../../shared/bottom-tabbar-specificatie.md).
- Zolang de grafieken nog niet zijn uitgewerkt, toont het minimale geraamte de gecentreerde tekst `calory tracker`.

## Acceptatiecriteria

### AC-01 — Calorieën tonen

Gegeven dat de gebruiker het dashboard opent  
Dan ziet de gebruiker de verbruikte calorieën van die dag  
En ziet de gebruiker het target voor die dag.

### AC-02 — Macro's tonen

Gegeven dat de gebruiker het dashboard opent  
Dan ziet de gebruiker een macroverdeling voor koolhydraten, vetten en eiwitten.
