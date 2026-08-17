# Implementatieplan — Calorie Tracker naar concrete producten en extern receptbeheer

## Slice CT1 — Concrete producten

- Migreer API-adapter en types van `productPackageId` naar `productId`.
- Gebruik gedeelde concrete productweergavenaam.
- Behoud drie invoermodi als full product, product portion en content unit.
- Regressiontest bestaande productlogs, detail, updates en statistieken.

## Slice CT2 — Toegankelijke gerechten zoeken

- Zoek eigen private/publieke en publieke gerechten van anderen.
- Toon maker bij publieke resultaten van anderen.
- Pin nieuwste dishversie bij create.
- Blijf actuele productmacro's gebruiken voor oude en nieuwe dishlogs.

## Slice CT3 — Beheerextractie

- Verwijder route, componenten en mutations voor `/logs/new/dish`.
- Verwijder `+ Nieuw gerecht aanmaken` uit de logmodal.
- Voeg gewone link `Recepten` naar `/recepten` toe.
- Houd maximaal één release een compatibiliteitsredirect naar `/recepten/nieuw`; geen return/select handshake.

## Slice CT4 — Recept bekijken

- Voeg routehelper naar `/recepten/gebruiker/:userId/:recipeId` toe.
- Toon `Recept bekijken` voor momenteel toegankelijke recepten.
- Verberg link bij private/archived voor niet-eigenaar, maar behoud historische logweergave.

## Tests

- publiek gerecht van ander loggen;
- private filtering en neutral not-found;
- oude versie blijft gepind na recipe edit;
- productmacrocorrectie verandert historische stats;
- geen dish create UI of API-call onder Calorie Tracker-prefix.
