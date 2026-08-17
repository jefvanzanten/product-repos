# Implementatieplan — Inventory fysieke verpakkingen

## Slice I1 — Product-ID-cutover

- Migreer search/adapters van package-ID naar concrete product-ID.
- Gebruik gedeelde productweergavenaam.
- Voeg N producten toe als N fysieke backenditems, maar behoud één snelle aantalinvoer.

## Slice I2 — Migratie en readprojectie

- Expandeer iedere oude quantity naar fysieke rows.
- Bouw productgerichte groep met totaal verpakkingsequivalent, maximaal één decimaal.
- Groepeer volledige items alleen bij gelijk product, locatie en THT.
- Toon aangebroken items afzonderlijk.
- Sorteer THT oplopend; datumloos onderaan.

## Slice I3 — Fysiek itemdetail

- Open een expliciet fysiek item vanuit groepsregels.
- Toon locatie, THT, maximum uit product en remaining amount.
- Voeg optimistic-locking mutations toe voor content, locatie, THT en leegmaken.
- COUNT beweegt per heel stuk; massa/volume blijven dimensioneel converteerbaar.

## Slice I4 — Progressbar UX

- Maak gevulde balk gelijk aan resterende inhoud.
- Laat gebruiker het uiteinde slepen en pas pas na bevestiging op.
- Test echte voorbeelden voor `250/500 g`, `750/1500 ml` en `4/6 stuks`.
- Beslis in deze slice na usabilitytest over primair percentage versus amount/maximum en mass/volume-stappen.

## Slice I5 — Filters

- Voeg verloopgradaties toe: expired, today, 1–3 urgent, 4–7 soon, later, none.
- Voeg filter `Bijna verlopen` toe met correcte urgentiesortering.
- Voeg handmatige low-stockdrempel op totale resterende inhoud toe.
- Houd automatische slow/medium/fast suggesties buiten MVP en instrumenteer mutatiehistorie eerst.

## Tests

- N oude packages => N fysieke rows;
- gelijke volledige items visueel gegroepeerd, gedeeltelijke niet;
- twee geopende verpakkingen met verschillende locaties onafhankelijk;
- THT vandaag niet verlopen;
- ratio en verpakkingsequivalent correct zonder opslagafronding.
