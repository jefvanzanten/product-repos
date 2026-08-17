# Backendarchitectuur

## Overzicht

De backend is één modulaire Hono-monoliet met één SQLite-database. Functionele code staat onder `apps/backend/src/modules` in de modules `auth`, `catalog`, `calorie-tracker`, `health`, `inventory`, `locations` en `recipes`.

Een module gebruikt waar nodig deze indeling:

```text
domain/         pure bedrijfsregels en berekeningen
repositories/   persistencecapabilities, records, queries en transacties
services/       use-cases en orchestration
routes/         transportparsing en HTTP-mapping
```

Kleine modules krijgen geen lege lagen voor symmetrie. Better Auth blijft een externe adapter, productafbeeldingen blijven een filesystemservice en Health gebruikt een geïnjecteerde readinessprobe.

## Dependencyrichting

De normatieve richting voor functionele endpoints is:

```text
routes → services → repositories → database
             ↓
           domain
```

Routes ontvangen services of middleware en importeren geen repositories. Services ontvangen repositoryobjecten via dependency injection en importeren repositorytypen uitsluitend met `import type`. Services en domain importeren geen Hono, Drizzle of `src/db`; domain blijft volledig puur.

Een repositorybestand bezit één samenhangende persistencecapability. Het bevat de capabilitytypen, expliciete persistence-records en de huidige Drizzle-implementatie. Bestand en factory zijn technologieneutraal benoemd, bijvoorbeeld `consumption-log.repository.ts` en `createConsumptionLogRepository(database)`. Een afzonderlijk contract- en implementatiebestand ontstaat pas bij een tweede productie-implementatie of onafhankelijke packagegrens.

Repositories zijn functionele factories. Er zijn geen repositoryclasses, baserepository of DI-container. Een servicetest gebruikt een getypeerd objectliteral als fake.

## Domein en persistence

Pure validatie, canonicalisatie, decimaalberekeningen, datumregels, boomregels en invarianten horen onder `domain/`. Persistence-records, rowprojecties, queryhelpers en transaction-scoped capabilities horen in het bezittende repositorybestand. Atomische operaties over meerdere tabellen blijven één repositorymethode.

`src/db/` bezit alleen gedeelde database-infrastructuur, schema's, migraties en seeds. Featurequeries staan bij de functionele module, ook wanneer zij Drizzle gebruiken. Repositories krijgen een bestaande `BackendDatabase` geïnjecteerd; zij openen of sluiten geen verbinding en lezen geen environment.

## Modulegrenzen

Calorie Tracker gebruikt `ConsumptionLogRepository`, `NutritionGoalRepository`, de consumptiongerichte catalogusreader en de door Recipes bezeten `DishRepository`. Recipes bezit de CRUD-lifecycle en persistence van gerechten; Calorie Tracker gebruikt die expliciete cross-modulecapability voor logprojecties en unified search.

De consumptiongerichte catalogusrepository is de andere bewuste cross-moduleafhankelijkheid. Hij projecteert actuele concrete producten en eenheden voor Calorie Tracker en Recipes. Deze gerichte afhankelijkheden rechtvaardigen geen dubbele reader- of adapterlaag zolang er één productie-implementatie is.

## Composition en resources

`apps/backend/src/composition.ts` is de enige production composition root:

```text
createDatabase(config)
  → createXRepository(database)
  → createXService(repository)
  → xRoutes(service)
```

`index.ts` bezit de server- en resourcelevensduur. `loadBackendConfig(env)` leest en valideert runtimeconfiguratie. Buiten bootstrap- en technische jobentrypoints leest productiecode geen `process.env`. Tests gebruiken dezelfde factories met een tijdelijke gemigreerde database.

## Fouten en HTTP-shell

`src/result.ts` bevat het gedeelde generieke `Result<T, E>`. Verwachte fouten blijven modulelokaal; services classificeren use-casefouten en routes vertalen die naar bestaande statuscodes. Onverwachte defects bereiken de globale boundary in `app.ts`, die veilig logt en een correlation ID retourneert.

De globale shell configureert logging, CORS, Better Auth-paden, modulemounts, not-found en defectafhandeling. Autorisatie en sessieresolutie worden als capabilities in routes geïnjecteerd.

## Conventies

- Functienamen, comments en docstrings zijn Engels.
- Dependencies staan in readonly dependencyobjecten.
- Routes importeren geen repositories; services gebruiken alleen type-imports voor repositorytypen.
- Voeg geen modulebarrels, DI-container, base repository, generieke tabelrepository, eventbus of toekomstige lege module toe.
- Bewaar publiek endpointgedrag, foutcodes en database-atomiciteit bij structurele wijzigingen.
