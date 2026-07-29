# Specificatie - doorlopende Vitest specsuite

## Status

- Onderdeel: workspace-verificatie voor specs onder `docs/specs/`.
- Status: geimplementeerd.
- Plan: `docs/plans/doorlopende-vitest-specsuite-plan.md`.

## Doel

De workspace heeft een kleine Vitest-suite die continu kan meelopen tijdens spec- en planwerk. De suite bewaakt dat specs onder `docs/specs/` niet losraken van uitvoerbare plannen en dat featureplannen expliciet test- of verificatiewerk beschrijven.

## Binnen scope

- Alle markdownbestanden onder `docs/specs/` moeten in `docs/plans/specs-implementatieplan-index.md` staan.
- Elke koppeling in de coverage-tabel moet naar bestaande spec- en planbestanden verwijzen.
- Elk niet-roadmapplan in de coverage-tabel moet een sectie `Tests` of `Verificatie` bevatten.
- De root van de workspace biedt een Vitest run-commando en een watch-commando.

## Buiten scope

- De suite vervangt geen backend-, frontend- of e2e-tests voor featuregedrag.
- De suite voert bestaande package-tests niet opnieuw uit.
- De suite bepaalt niet of een feature functioneel spec-compleet is; featuretests blijven daarvoor leidend.

## Commando's

Gebruik alleen `corepack pnpm`:

```text
corepack pnpm run test:specs
corepack pnpm run test:specs:watch
```

`test:specs:watch` draait Vitest in watchmode met `--bail=1`, zodat de lopende suite bij de eerste breuk direct op rood springt.

## Acceptatiecriteria

### AC-01 - Nieuwe spec vereist planlink

Gegeven dat een markdownbestand onder `docs/specs/` wordt toegevoegd  
Wanneer de doorlopende specsuite draait  
Dan faalt de suite totdat de spec in de coverage-tabel van `docs/plans/specs-implementatieplan-index.md` staat.

### AC-02 - Coverage-tabel blijft geldig

Gegeven dat een spec- of planpad in de coverage-tabel wijzigt  
Wanneer het doelbestand niet bestaat  
Dan faalt de suite met het ontbrekende pad.

### AC-03 - Featureplannen blijven testbaar

Gegeven dat een niet-roadmapplan aan een spec is gekoppeld  
Wanneer dat plan geen `Tests`- of `Verificatie`-sectie bevat  
Dan faalt de suite.

### AC-04 - Watchcommando blijft beschikbaar

Gegeven dat iemand aan specs of plannen werkt  
Wanneer diegene `corepack pnpm run test:specs:watch` start  
Dan blijft Vitest de specsuite in watchmode draaien totdat de gebruiker het proces stopt of de suite rood wordt.
