# Backendarchitectuur

## Overzicht

De backend is één modulaire Hono-monoliet met één SQLite-database. Code staat primair per functioneel domein onder `apps/backend/src/modules`:

- `auth`: Better Auth-adapter, sessieresolutie en autorisatiemiddleware;
- `catalog`: producten, verpakkingen, merken, categorieën en referentiedata;
- `calorie-tracker`: consumptielogs, voedingsdoelen en statistieken;
- `health`: liveness en database-readiness.

`apps/backend/src/composition.ts` is de enige composition root. Deze maakt concrete resources en adapters, injecteert capabilities in services en routes en levert de samengestelde applicatie op. `index.ts` bezit de server- en resourcelevensduur.

## Dependencyrichting

De bedoelde richting is:

```text
routes → services → domain
                  → repositorycontracten
composition → concrete repositories en adapters
```

Domeincode bevat pure TypeScript-regels. Routes verzorgen uitsluitend transportparsing, requestcontext en HTTP-mapping. Services orkestreren use-cases. Persistencecode voert gerichte queries en atomische transacties uit zonder HTTP-kennis.

Routes importeren geen database, Better Auth-adapter of concrete repository. Services importeren geen Hono, Drizzle of concrete `drizzle-*`-adapter. ESLint bewaakt deze grenzen en verbiedt applicatie-eigen classdeclaraties.

## Modulegrenzen

De Calorie Tracker gebruikt drie gerichte capabilities:

- `ConsumptionLogRepository` voor logs en retentiecleanup;
- `NutritionGoalRepository` voor voedingsdoelen;
- `ConsumptionCatalogReader` uit de catalogusmodule voor actuele product-, verpakking- en eenheidsprojecties.

De catalogusreader is het expliciete contract voor de actuele moduleoverschrijdende read-afhankelijkheid. Andere cross-module-imports horen niet rechtstreeks naar interne persistencecode te wijzen.

## Configuratie en resources

`loadBackendConfig(env)` leest en valideert de actuele host-, poort-, database-, CORS- en authconfiguratie. Buiten bootstrap- en jobentrypoints leest productiecode geen `process.env`.

`createDatabase(config)` opent SQLite en retourneert Drizzle, de technische SQLiteverbinding en een idempotente `close()`. Better Auth ontstaat via een factory met de database en getypeerde configuratie. Imports openen geen resources.

Production, tests en jobs gebruiken dezelfde factories. De testharness geeft een tijdelijke gemigreerde database en expliciete testconfiguratie aan de composition root.

## Fouten en HTTP-shell

`src/result.ts` bevat het gedeelde generieke `Result<T, E>` met `ok` en `err`. Verwachte fouten blijven modulelokaal en routes vertalen deze naar de bestaande statuscodes. Onverwachte defects bereiken de globale boundary in `app.ts`, die veilig logt en een correlation ID retourneert.

De globale shell configureert logging, CORS, Better Auth-paden, modulemounts, not-found en defectafhandeling. Catalogusautorisatie is alleen op cataloguspaden gemount; Calorie Tracker-sessieresolutie behoort tot de eigen router.

## Conventies

- Functienamen en docstrings zijn Engels.
- Dependencies staan in readonly dependencyobjecten.
- Exporteer factories met een expliciete capability wanneer dit een actuele grens is.
- Voeg geen modulebarrels, DI-container, base repository, eventbus of toekomstige lege module toe.
- Bewaar publiek endpointgedrag en database-atomiciteit bij structurele wijzigingen.
