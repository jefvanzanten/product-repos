# Implementatieplan — Recepten-app

## Afhankelijkheden

- Productmodel v2 read- en productzoekcontracts.
- Backend dish visibility/archive/instructions en publieke reads.
- Gedeelde auth-client met optionele sessie voor publieke routes.
- Route deployment onder `/recepten` op `apps.jefvanzanten.dev`.

## Slice R1 — Appshell en publieke lijst

- Maak zelfstandige frontendapp, voorstel `apps/recipes`.
- Configureer basename `/recepten` en publieke SSR/loaderreads.
- Bouw `/recepten` met zoekbalk, newest-first sortering en filters.
- Toon alleen publieke niet-gearchiveerde recepten.
- Voeg verzorgde lege en 404-states toe.

## Slice R2 — Gebruiker en detail

- Bouw `/recepten/gebruiker/:userId`.
- Owner ziet public/private; anderen alleen public.
- `Mijn recepten` verschijnt alleen ingelogd en gebruikt eigen user-ID.
- Bouw `/recepten/gebruiker/:userId/:recipeId` met maker, servings, ingrediënten en instructies.
- Makernaam is niet klikbaar; profielpagina valt buiten MVP.

## Slice R3 — Create

- Bescherm `/recepten/nieuw`.
- Formulier: naam, visibility default private, servings, minimaal één product, hoeveelheid/unit en vrije instructies.
- Productautocomplete gebruikt concrete actieve products.
- Ondersteun productportion en compatibele unittypes.
- Toon packaging equivalent alleen vanaf één volledige verpakking en zonder `×`.

## Slice R4 — Edit en versioning

- Naam/visibility muteren stam; recipe content maakt immutable versie.
- Gearchiveerde ingredienten blijven leesbaar maar blokkeren nieuwe inhoudsversie totdat vervangen.
- Geen version history UI.
- Inline conflicts voor duplicate name en stale update.

## Slice R5 — Archive/restore en cross-app

- Voeg owner archive/restore met archived filter toe.
- Restore gebruikt vorige visibility.
- Private/archived/unknown voor onbevoegden delen neutral 404.
- Borg canonical recipe URLs voor Calorie Tracker-links.
- Geen log-action vanuit recepten-app.

## Slice R6 — Hardening

- Public-cacheheaders zonder private leakage.
- Auth transitions: anonymous public → login for write → safe return.
- Accessibility, responsive tests en end-to-end public/private/archive scenarios.
- Bevestig dat UI nergens calorieën, macro's of images toont in MVP.

## Na MVP

- Persoonlijke aanbevelingen uitsluitend uit eigen consumption logs.
- Kandidaten: eigen recipes en public recipes; nooit private recipes van anderen.
- Toon optioneel frequentie en gegeten dagen.
