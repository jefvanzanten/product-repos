# Plan — optioneel consumptietype en niet-destructieve voedingswaardenstatus

## Doel

De algemene productcatalogus moet ook niet-consumeerbare producten, zoals waterstofperoxide, kunnen bevatten zonder ze beschikbaar te maken in de Calorie Tracker of als nieuw receptingrediënt.

Daarvoor:

- wordt `product_composition.consumption_type` nullable;
- betekent `NULL` expliciet: geen consumptieproduct;
- blijven `FOOD`, `DRINK` en `SUPPLEMENT` de enige consumptietypen;
- krijgt een bewaard macroprofiel een afzonderlijke actief/inactief-status;
- verwijdert het uitschakelen van voedingswaarden de opgeslagen waarden niet.

## Besluiten

1. Categorie en consumptietype blijven onafhankelijke classificaties.
2. De admin-UI gebruikt een toggle `Consumptieproduct`, standaard aan bij een nieuwe samenstelling.
3. Bij een ingeschakelde toggle is bewust één type verplicht; er wordt niets vooraf geselecteerd.
4. Bij uitschakelen wordt `consumptionType=null` opgeslagen. Er komt geen `OTHER`.
5. Alleen actieve concrete producten met een niet-null type zijn nieuw selecteerbaar in Calorie Tracker en recepten.
6. Bestaande logs en immutable receptversies blijven na herclassificatie leesbaar en berekenbaar.
7. Een historische productlog met actueel `consumptionType=null` verschijnt alleen onder filter `all`.
8. Voedingswaarden hebben een eigen actief-flag. Uitschakelen bewaart de waarden, maar berekeningen lezen ze niet.
9. `Consumptieproduct` uitschakelen deactiveert voedingswaarden. Later opnieuw inschakelen activeert ze niet automatisch.
10. De algemene productcatalogus krijgt in deze wijziging geen extra consumptiestatusfilter.

## Huidige situatie

- `packages/contracts/src/products.ts` en `apps/backend/src/db/schemas/products.schema.ts` eisen overal een niet-null consumptietype.
- `product_macro_profile` gebruikt het bestaan van de rij als actief-status; `null` of uitschakelen leidt in de repository tot verwijderen.
- `UpdateProductComposition` is gelijk aan create en schrijft ook het macroprofiel opnieuw, hoewel daarvoor al een aparte endpoint bestaat.
- `ConsumptionCatalogReader` wordt gedeeld door Calorie Tracker en recepten en retourneert momenteel alle actieve concrete producten.
- Calorie Tracker gebruikt hetzelfde strikte consumptietype voor zoekresultaten en historische logprojecties. Die twee grenzen moeten worden gesplitst om herclassificatie te ondersteunen.
- De admin heeft al het gewenste togglepatroon in `MacroProfileSection`; `ConsumptionTypeSection` is nu alleen een verplichte radiogroep.

## Contractontwerp

### Productcatalogus

Houd het type van een concrete classificatie klein:

```ts
type ConsumptionType = "FOOD" | "DRINK" | "SUPPLEMENT";
```

Maak alleen de velden op composition- en product-DTO's nullable:

```ts
consumptionType: ConsumptionType | null;
```

Scheid voedingswaarden, opgeslagen status en mutatie:

```ts
type MacroProfile = {
  referenceBasis: "PER_100_G" | "PER_100_ML" | "PER_UNIT";
  caloriesKcal: string | null;
  proteinG: string | null;
  carbohydratesG: string | null;
  fatG: string | null;
  caloriesSource: "AUTOMATIC" | "MANUAL" | null;
};

type StoredMacroProfile = MacroProfile & {
  enabled: boolean;
};

type MacroProfileMutation =
  | { enabled: true; profile: MacroProfile }
  | { enabled: false };
```

Regels:

- create accepteert `macroProfile?: MacroProfile|null`; een meegestuurd profiel start actief;
- composition-detail retourneert `StoredMacroProfile|null`;
- composition-update wijzigt geen macrovelden meer;
- macro-update met `enabled:false` bewaart een bestaande rij;
- macro-update met `enabled:true` vereist en valideert het volledige profiel.

### Calorie Tracker

- `ProductSearchResult.consumptionType` blijft strikt niet-null, omdat de zoekquery vóór projectie filtert.
- `ConsumptionLogProduct.consumptionType` wordt nullable voor historische herclassificatie.
- Frontenddomeintypen moeten hetzelfde onderscheid maken; verbreed niet onnodig alle zoekresultaten.

### Recepten

- Nieuwe productzoekresultaten blijven impliciet consumptieproducten.
- Voeg een verwachte fout `PRODUCT_NOT_CONSUMABLE` toe voor directe create/update-pogingen met een composition zonder type.

## Implementatie

### 1. Gedeelde contracts

Pas `packages/contracts/src/products.ts` aan:

- maak `consumptionType` nullable in composition-, summary- en detailshapes;
- voeg `StoredMacroProfile` en `MacroProfileMutation` toe;
- verwijder `macroProfile` uit `UpdateProductComposition`;
- behoud `MacroProfile` als gevalideerde waardenpayload.

Pas `packages/contracts/src/calorie-tracker.ts` aan:

- bouw `consumptionLogProductSchema` niet langer rechtstreeks uit het volledig strikte zoekschema op;
- hergebruik de overige productvelden, maar override `consumptionType` met `.nullable()`;
- laat `productSearchResultSchema` strikt.

Pas `packages/contracts/src/recipes.ts` en exports in `packages/contracts/src/index.ts` aan voor de nieuwe mutatie- en foutshape.

### 2. Database en migratie

Maak een nieuwe Drizzle-migratie na `0014_product_model_v2_cleanup.sql`.

Schemawijzigingen:

- maak `product_composition.consumption_type` nullable, met een check die null of een van de drie waarden toestaat;
- voeg `product_macro_profile.is_active` toe als verplichte boolean/integer met default `true`;
- behoud alle bestaande indexes, foreign keys en timestamps.

Migratiegedrag:

- alle bestaande `consumption_type`-waarden blijven ongewijzigd;
- alle bestaande macroprofielen krijgen `is_active=true`;
- er wordt geen classificatie uit categorieën afgeleid;
- voer bij de SQLite table rebuild expliciete row-count- en foreign-keycontroles uit.

Werk daarna `apps/backend/src/db/schemas/products.schema.ts` bij.

### 3. Catalogusdomein, service en repository

Pas aan:

- `apps/backend/src/modules/catalog/domain/product-macro-profile.ts`
- `apps/backend/src/modules/catalog/services/product-v2.service.ts`
- `apps/backend/src/modules/catalog/repositories/product-v2.repository.ts`
- `apps/backend/src/modules/catalog/routes/product-v2.routes.ts`

Gedrag:

1. Composition create accepteert een nullable consumptietype.
2. Composition update wijzigt alleen naam, merk, categorie en consumptietype.
3. Bij update naar `consumptionType=null` zet dezelfde transactie een bestaande macrorij op inactief.
4. Terugzetten naar een type laat de macrorij inactief.
5. Macro uitschakelen update alleen `is_active=false`; de rij wordt niet verwijderd.
6. Macro inschakelen valideert waarden, receptbasisconflicten en de dimensies van alle gekoppelde concrete producten voordat `is_active=true` wordt opgeslagen.
7. Packaging-validatie houdt alleen rekening met een actief profiel.
8. Composition-projecties geven ook een inactief bewaard profiel terug aan productbeheer.

Verwijder de huidige impliciete macro-overschrijving uit `updateComposition`. Dit voorkomt dat een composition-formulier oude voedingswaarden terugschrijft.

### 4. Consumptie- en receptgrenzen

Pas `apps/backend/src/modules/catalog/repositories/consumption-catalog.repository.ts` aan:

- maak `CatalogProductRecord.consumptionType` nullable voor algemene reads op ID;
- projecteer `macroProfile=null` wanneer de bewaarde macrorij inactief is;
- filter `searchActiveCatalogProducts` op actief product én niet-null consumptietype;
- filter recente nieuwe keuzes eveneens op niet-null consumptietype;
- laat reads op ID en batch-ID niet-consumptieproducten teruggeven voor historische projecties.

Pas vervolgens aan:

- `apps/backend/src/modules/calorie-tracker/services/package-selection.service.ts`
- `apps/backend/src/modules/calorie-tracker/services/unified-search.service.ts`
- `apps/backend/src/modules/calorie-tracker/services/consumption-log.service.ts`
- `apps/backend/src/modules/calorie-tracker/services/calorie-tracker-projections.ts`
- `apps/backend/src/modules/recipes/services/recipe.service.ts`
- relevante route-error mappings.

Invarianten:

- een nieuw productlog of nieuw receptingrediënt met `consumptionType=null` wordt server-side geweigerd, ook bij directe ID-aanroep;
- historische log- en receptprojecties blijven werken;
- typed logfilters matchen alleen een niet-null actueel type; `all` behoudt historische null-items;
- statistieken blijven bestaande logs berekenen, maar lezen alleen actieve voedingswaarden;
- een receptinhoudelijke wijziging vereist vervanging van een niet meer consumeerbaar ingrediënt.

### 5. Product Management Admin

Splits de huidige brede parser in gerichte projecties in `apps/product-management-admin/app/features/product-catalog/data/product-form-command-parser.ts`:

- composition identity + consumptiestatus;
- macroprofielmutatie;
- waardebehoud na validatiefouten.

Dit voorkomt dat de afzonderlijke nutrition-action verborgen compositionvelden moet meesturen.

Pas domeintypen, mappers en API-adapter aan in:

- `apps/product-management-admin/app/features/product-catalog/domain/product-catalog.ts`
- `apps/product-management-admin/app/features/product-catalog/data/product-catalog-mappers.ts`
- `apps/product-management-admin/app/features/product-catalog/data/product-catalog-api.server.ts`
- `apps/product-management-admin/app/routes/new-product/new-product-route.server.ts`
- `apps/product-management-admin/app/routes/product-detail/product-detail-route.server.ts`

UI-wijzigingen:

- bouw `ConsumptionTypeSection` om naar hetzelfde lokale togglepatroon als `MacroProfileSection`;
- nieuwe samenstelling: toggle aan, geen radio vooraf geselecteerd;
- bestaande samenstelling: toggle afgeleid van `consumptionType !== null`;
- bij uit: radio's niet renderen en geen type submitten;
- bij opnieuw aanzetten tijdens dezelfde sessie: eerdere radiokeuze lokaal behouden;
- voedingswaardentoggle uitschakelen wanneer geen consumptietype actief is;
- inactieve bewaarde macrovelden bij opnieuw inschakelen voorinvullen;
- read-only consumptietype toont `-` bij null;
- read-only voedingswaarden toont geen inactieve waarden, maar maakt herstel via bewerken mogelijk.

Houd `ConsumptionTypeSection` en `MacroProfileSection` afzonderlijke componenten met één verantwoordelijkheid; coördineer hun enabled-state in het bovenliggende compositionformulier.

### 6. Calorie Tracker-frontend

Pas alleen historische logmodellen en presentaties aan:

- zoekresultaten houden een niet-null type;
- logdetail en logboek accepteren `null`;
- render bij null geen onjuist FOOD/DRINK/SUPPLEMENT-label;
- zorg dat typefilters null-logs alleen bij `all` tonen;
- productzoeken behoeft geen extra clientfilter omdat de backend de grens afdwingt.

Waarschijnlijke locaties:

- `apps/calorie_tracker/app/core/domain/consumption-types.ts`
- `apps/calorie_tracker/app/features/consumption-logs/domain/consumption-log.ts`
- `apps/calorie_tracker/app/features/consumption-logs/presentation/log-display.ts`
- consumption badge/image-presentatie en bijbehorende tests.

Gebruik voor een nullable historisch type een expliciet logtype in plaats van de algemene zoekresultaattypes te verzwakken.

### 7. Tests

#### Backend/catalogus

Breid unit- en integratietests uit voor:

- create met `consumptionType=null`;
- bestaande typen blijven valide;
- composition-update naar null deactiveert maar verwijdert macrodata niet;
- terugzetten naar FOOD activeert macrodata niet;
- expliciet opnieuw activeren herstelt dezelfde waarden;
- inactieve macro's blokkeren geen incompatibele verpakking; activeren valideert de dimensie;
- migratie bewaart alle bestaande types en markeert bestaande macroprofielen actief.

Gebruik primair:

- `apps/backend/src/modules/catalog/services/product-v2.service.test.ts`
- `apps/backend/tests/product-v2.test.ts`
- een gerichte migratietest naast de bestaande migratietests.

#### Calorie Tracker en recepten

Test:

- niet-consumptieproduct ontbreekt in productzoeken en recente keuzes;
- directe nieuwe logpoging wordt geweigerd;
- bestaand log blijft leesbaar, staat onder `all` en niet onder typed filters;
- bestaand log blijft meetellen met een actief profiel en stopt met macrobijdragen zodra het profiel inactief is;
- nieuwe receptselectie sluit het product uit;
- bestaand recept blijft projecteerbaar;
- inhoudelijke receptupdate met hetzelfde niet-consumeerbare ingrediënt wordt geweigerd.

Gebruik primair `apps/backend/tests/calorie-tracker*.test.ts` en `apps/backend/tests/recipes.test.ts`.

#### Admin

Voeg gerichte parser-, route- en componenttests toe voor:

- standaard ingeschakelde consumptietoggle zonder geselecteerd type;
- validatiefout wanneer toggle aan staat zonder type;
- succesvolle null-projectie wanneer toggle uit staat;
- herstel van formulierwaarden na fout;
- radios alleen zichtbaar bij aan;
- voedingswaarden automatisch uit/inactief zonder waardenverlies;
- detailweergave van null en inactieve macrodata;
- API-adapter parseert de nieuwe nullable/stored shapes.

### 8. Validatievolgorde

Voer na implementatie uit:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Voer daarnaast de bestaande migratietests uit op zowel een lege database als een fixture met bestaande productcompositions, macroprofielen, logs en receptingrediënten.

## Acceptatiecriteria

- Een beheerder kan waterstofperoxide opslaan met `Consumptieproduct` uit en zonder consumptietype.
- Het product blijft zichtbaar in de algemene productcatalogus en Inventory.
- Het product verschijnt niet in nieuwe Calorie Tracker- of receptselecties.
- Een consumptieproduct vereist exact FOOD, DRINK of SUPPLEMENT.
- Bestaande catalogusdata migreert zonder herclassificatie.
- Uitschakelen van voedingswaarden verwijdert geen waarden en sluit ze uit van berekeningen.
- Uitschakelen van Consumptieproduct deactiveert voedingswaarden.
- Opnieuw inschakelen van Consumptieproduct activeert voedingswaarden niet automatisch.
- Historische logs en receptversies blijven leesbaar; typed filters tonen geen null-type.
- Zoekresultaatcontracts blijven strikt waar de backend niet-null garandeert.
