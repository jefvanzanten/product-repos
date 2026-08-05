# Specificatieconventie

Featuredocumentatie bestaat waar nodig uit twee gekoppelde documenten:

- `*-specificatie.md` is de bron van waarheid voor doel, scope, rollen, domein- en gedragsregels, validatie, gegevens, routes, API-contracten en functionele acceptatiecriteria.
- `*-ui-specificatie.md` is de bron van waarheid voor schermopbouw, informatievolgorde, responsive presentatie, maatvoering, visuele componentvormen en visuele toestanden.

Een functionele specificatie bevat onder `UI-specificatie` een link naar de bijbehorende UI-specificatie. De UI-specificatie linkt terug naar de functionele specificatie.

## Grens tussen beide documenten

Een requirement blijft in de functionele specificatie wanneer het antwoord geeft op wat de gebruiker kan doen, welke gegevens zichtbaar of wijzigbaar moeten zijn, welke state behouden blijft of welke validatie geldt. Een requirement hoort in de UI-specificatie wanneer het antwoord geeft op waar en hoe die functionaliteit wordt gepresenteerd.

Voorbeelden:

- `De geselecteerde datum blijft behouden bij navigatie` is functioneel.
- `De datumselector staat boven de navbar` is UI.
- `Escape sluit zonder op te slaan` is functioneel en toegankelijk gedrag.
- `De flow is op mobiel schermvullend en op desktop een compacte modal` is UI.
- `De opslagactie blijft bereikbaar en bedekt geen content` is een functionele gebruikseis.
- Exacte breedtes, spacing, radii en responsive plaatsing zijn UI.

## Geen dubbele bron van waarheid

De twee documenten mogen voor context naar dezelfde component of actie verwijzen, maar leggen dezelfde concrete requirement niet allebei normatief vast. Functionele acceptatiecriteria mogen een waarneembaar resultaat toetsen; de UI-specificatie bepaalt de concrete visuele uitwerking daarvan.

Kleine features zonder afzonderlijke visuele uitwerking hoeven geen lege UI-specificatie te krijgen. Gedeelde UI, zoals de applicatieshell of bottom-tabbar, krijgt één gedeelde UI-specificatie waar featuredocumenten naar verwijzen.
