# UI-specificatie — Consumptielog toevoegen

- Functionele specificatie: [log-toevoegen.md](./log-toevoegen.md)

De routegebonden modal blijft mobiel schermvullend en desktop compact. Direct zichtbaar zijn zoekveld, datum, tijd, annuleren en een gewone link `Recepten` naar `/recepten`.

## Zoekresultaten

Concrete productresultaten tonen:

- productafbeelding of placeholder;
- gedeelde afgeleide productweergavenaam;
- consumptietype;
- beschikbare portie-informatie waar relevant.

Gerechtresultaten tonen:

- gerechtnaam;
- label `Gerecht`;
- maker bij een publiek recept van een ander;
- aantal receptporties;
- optionele actie `Recept bekijken`.

De UI toont geen `+ Nieuw gerecht aanmaken` meer.

## Hoeveelheid

Productselectie toont één waarde plus eenheid/modus. Gerechtselectie toont een waarde in `portie`/`porties`. Clientlabels gebruiken `gerecht`, niet `recept`, omdat de gebruiker registreert wat die heeft gegeten.
