# Implementatieplan — contracts en shared productmodel v2

## Slice C1 — Additieve DTO's

- Voeg `ProductComposition`, `ConcreteProduct`, `ProductPortion` en v2 summary/detailshapes toe.
- Voeg recipe contracts en visibility/archive shapes toe.
- Voeg physical inventory item/group contracts toe.
- Houd v1 `ProductPackage`-types tijdelijk naast v2 met expliciete deprecated-markering.

## Slice C2 — Gedeelde presentatie

- Bouw één pure formatter voor `[merk] [naam] — [verpakkingstype] [inhoud]`.
- Ondersteun ontbrekende onderdelen zonder lege separators.
- Voeg package type en productportion enkelvoud/meervoudhelpers toe.
- Test Nederlandse decimalen alleen in presentatie; wiredecimalen blijven puntstrings.

## Slice C3 — Clientmigratie

- Publiceer adapters per app zodat Calorie Tracker, Inventory en Admin onafhankelijk kunnen omschakelen.
- Voeg routehelpers toe voor `/recepten/gebruiker/:userId/:recipeId`.
- Voorkom import van adminfeaturecode in consumerapps.

## Slice C4 — Cleanup

- Verwijder package DTO's en adapters nadat alle apps op v2 draaien.
- Verhoog contractversie bij breaking removal.
