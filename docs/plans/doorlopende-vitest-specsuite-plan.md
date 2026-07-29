# Plan - doorlopende Vitest specsuite

## Scope

Richt een kleine workspace-brede Vitest-suite in die de koppeling tussen `docs/specs/` en uitvoerbare plannen bewaakt. De suite is bedoeld als snelle, doorlopende guard tijdens spec- en planwerk.

## Aanpak

1. Voeg een aparte Vitest-configuratie toe voor specsuite-tests.
2. Voeg root-scripts toe voor een eenmalige run en watchmode.
3. Voeg een Vitest-test toe die de speccoverage in `docs/plans/specs-implementatieplan-index.md` controleert.
4. Documenteer de afspraak in een workspace-spec.

## Tests

De specsuite controleert minimaal:

- elke markdownspec onder `docs/specs/` staat in de coverage-tabel;
- elk pad in de coverage-tabel bestaat;
- elk niet-roadmapplan beschrijft test- of verificatiewerk;
- de rootcommando's `test:specs` en `test:specs:watch` blijven beschikbaar.

## Verificatie

Gericht commando:

```text
corepack pnpm run test:specs
```

Doorlopend commando:

```text
corepack pnpm run test:specs:watch
```

Gebruik geen globale `pnpm` en stop wanneer pnpm een node_modules purge/recreate prompt toont.
