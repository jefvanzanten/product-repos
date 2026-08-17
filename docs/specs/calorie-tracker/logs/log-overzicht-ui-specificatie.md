# UI-specificatie — Consumptielogboek

## Status

- Onderdeel: Calorie Tracker > logs
- Functionele specificatie: [log-overzicht.md](./log-overzicht.md)
- Gedeelde shell: [bottom-tabbar-ui-specificatie.md](../../shared/bottom-tabbar-ui-specificatie.md)
- Status: concept

## Doel

Dit document is de bron van waarheid voor de responsive schermopbouw en de visuele anatomie van het consumptielogboek.

## Schermopbouw

Het logboek rendert binnen de gedeelde applicatieshell. Op desktop gebruikt het dezelfde headeropbouw als Caloriestatistieken: de datumselector en de gecentreerde Calorie Tracker-navbar staan in de normale documentflow onder elkaar.

De pagina toont in deze volgorde:

1. de gedeelde aanklikbare datumselector boven het logboekpaneel;
2. direct zichtbare filterchips;
3. verticaal scrollbare loglijst;
4. primaire actie `Log toevoegen`.

Het logboekpaneel toont geen tweede datumselector en geen losse acties voor `Vandaag`, vorige dag of volgende dag.

Beschikbare chips:

- Alles;
- Voeding;
- Drinken;
- Supplementen.

Op smalle schermen mogen chips horizontaal scrollen.

## Actie Log toevoegen

- Op mobiel staat een vaste brede knop direct boven de bottom-tabbar.
- De actiebalk gebruikt `1em` bovenruimte en `16px` horizontale en onderruimte.
- De knop bedekt geen logs en de lijst reserveert voldoende onderruimte.
- Op desktop staat de primaire actie rechts bovenaan het logboekpaneel, onder de gedeelde datumheader en navbar.
- De actie is geen tab en geen extra floating action button.

## Compact logitem

Het logitem ordent de functioneel vereiste gegevens compact rond de productafbeelding of vaste gerechtplaceholder en de chevron.

Voorbeelden:

```text
08:42
Grillworst · Merknaam
1x stuk
Voeding
```

```text
20:15
Frisdrank · Merknaam
3x blikje
Drinken
```

Een dish-log toont de gerechtnaam zonder merk en de hoeveelheid in porties:

```text
12:30
Spaghetti bolognese
1,5 portie
Voeding
```

Op desktop gebruikt elk item vaste kolommen voor afbeelding/placeholder, tijd, product of gerecht, hoeveelheid en eenheid, consumptietype en chevron. Op mobiel gebruikt hetzelfde item twee compacte tekstregels naast de afbeelding/placeholder, met de chevron in een vaste eindkolom. Lange namen mogen de overige slots niet verschuiven.

Het consumptietype krijgt een herkenbare kleur naast het verplichte tekstlabel.
