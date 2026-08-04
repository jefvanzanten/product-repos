# Plan — opbergplaatsen beheren

Bronnen:

- `docs/specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-specificatie.md`
- `docs/domein/opbergplaatsen-domeinregels.md`
- `docs/backend/Endpoints/LOCATION_ENDPOINTS.md`
- `docs/backend/ERD/STORAGE_ERD.md`
- `docs/specs/inventory-client/voorraad-inzien-specificatie.md`
- `docs/specs/inventory-client/voorraad-aanpassen-specificatie.md`

Status: gepland.

## Doel

Vervang de statische placeholder op `/product-management-admin/locations` door volledig beheer van één gedeelde hiërarchische locatieboom. Lever tegelijk het gedeelde locatiecontract en de backendcapability waarmee Inventory uitsluitend actieve locaties kan kiezen en bestaande voorraad op een gearchiveerde locatie herkenbaar blijft.

## Vaststaande keuzes

- Iedere fysieke opbergplaats is een eigen `location`-record met een stabiele ID.
- Hoofd- en sublocaties gebruiken dezelfde recursieve tabel met `parent_id`; er komt geen enum, labeltabel of koppeltabel.
- Dezelfde genormaliseerde naam mag onder verschillende ouders bestaan, maar niet tweemaal onder dezelfde ouder of op het hoofdniveau.
- Een gearchiveerde locatie reserveert haar siblingnaam.
- Voorraad mag op ieder knooppunt liggen en `inventory_item.location_id` blijft verplicht.
- `archived_at` beschrijft alleen de directe status; een gearchiveerde voorouder maakt de volledige subboom effectief gearchiveerd.
- Archiveren verwijdert of verplaatst geen voorraad en maakt de tak alleen onselecteerbaar als nieuwe bestemming.
- Locatiepaden blijven afgeleid uit de actuele boom; er komen geen snapshots in voorraadrecords.
- Er is geen hard delete, handmatige sortering, locatieauditlog, zoekveld of archive-impactendpoint.
- `GET /locations` retourneert standaard de actieve boom. Alleen `?status=archived` is als expliciete filterwaarde toegestaan.

## Huidige situatie

- `apps/product-management-admin/app/routes/locations.tsx` rendert alleen `StorageManagementPage` en heeft geen loader of action.
- `StorageManagementPage` toont altijd `Nog geen opbergplaatsen gevonden`; de toevoegknop doet niets.
- De actuele `location`-tabel heeft `parent_id`, `name`, `archived_at` en timestamps, maar nog geen `normalized_name` en geen correcte genormaliseerde root-/siblingconstraints.
- Migratie `0009_inventory_backend` is de basis voor het voorraadmodel en wordt niet achteraf aangepast.
- Er bestaan nog geen gedeelde location-contracten, location-routes of location-write-service.
- De Inventory-readmodule leest alle locaties intern om paden af te leiden, maar projecteert nog niet of een voorraadlocatie effectief gearchiveerd is.
- `packages/contracts/src/inventory.ts` bevat nog geen locatieboom-DTO en geen archiefindicator per voorraadpartij.

## Scope

Wel:

- contracten voor location requests, responses en errors;
- een volgende, additive migratie voor `normalized_name` en harde locatieconstraints;
- een zelfstandige backendmodule voor location reads en writes;
- actieve en gearchiveerde boomprojecties;
- create, rename, move, archive en restore;
- adminloader, actions, API-adapter, boom-UI en dialogs;
- minimale Inventory-integratie voor de actieve locatieboom en het label `Gearchiveerde locatie` op bestaande voorraad;
- unit-, integratie-, migratie-, route- en componenttests;
- documentatiestatus en spec-plankoppeling bijwerken na uitvoering.

Niet:

- voorraad toevoegen of voorraadmutaties implementeren;
- een opbergplaats vanuit Inventory aanmaken;
- een cross-app-link vanuit de Inventory-toevoegflow;
- locatiegebruik of voorraadaantallen ophalen voordat wordt gearchiveerd;
- locaties permanent verwijderen;
- handmatig ordenen of doorzoeken;
- een changelog van locatiebewerkingen;
- een los hoofdlocatie-/sublocatiemodel.

## Beoogde architectuur

### Gedeelde contracts

Maak `packages/contracts/src/locations.ts` eigenaar van de protocolschemas en types voor locaties. Exporteer deze via zowel de package-root als een nieuw subpath `@product-repos/contracts/locations`.

Minimaal:

- `locationTreeNodeSchema` en `LocationTreeNode`;
- `createLocationRequestSchema` en `CreateLocationRequest`;
- `updateLocationRequestSchema` en `UpdateLocationRequest`;
- `locationErrorCodeSchema` en `LocationErrorResponse`;
- een recursieve, strict geparste `children`-shape;
- `path`, `archivedAt` en `isEffectivelyArchived` in iedere boomnode.

Houd `normalizedName` intern: dit veld hoort bij persistence en verschijnt niet in requests of responses.

### Backendmodule

Plaats gedeelde locatiefunctionaliteit onder `apps/backend/src/modules/locations` in plaats van onder catalog of inventory:

```text
modules/locations/
  domain/location-domain.ts
  repositories/location-store.ts
  repositories/drizzle-location.repository.ts
  services/location.service.ts
  routes/location.routes.ts
```

- `location-domain.ts` bevat pure naamnormalisatie, naamvalidatie, natuurlijke siblingvergelijking en cycle-safe boom-/padprojectie.
- `location-store.ts` is de persistenceport.
- De Drizzle-adapter voert reads en transactionele writes uit.
- `location.service.ts` bezit use-caseregels en retourneert expliciete `Result`-uitkomsten.
- `location.routes.ts` bezit HTTP-validatie, authenticatie/rolgrenzen en statusmapping.
- Inventory mag de pure locatieboomprojectie hergebruiken voor actuele paden en effectieve archiefstatus, maar importeert geen location-route- of admincode.

### Product Management Admin

Behoud `/locations` als één route en splits alleen verantwoordelijkheden die daadwerkelijk onafhankelijk zijn:

```text
app/routes/locations.tsx
app/routes/locations-route.server.ts
app/routes/locations-route.server.test.ts
app/features/admin/storage-management/
  location-management-api.server.ts
  location-management.types.ts
  components/StorageManagementPage/...
  components/LocationTree/...
  components/LocationDialog/...
  components/MoveLocationDialog/...
  components/ArchiveLocationDialog/...
```

De route bewaakt adminautorisatie en de `source`-context. De serveradapter parseert alle backendresponses met de gedeelde schemas. De pagina beheert alleen presentatiestate en fetcher-dialogs.

## Engineeringafspraken

- Volg YAGNI, DRY en Single Responsibility; bouw geen generieke tree- of CRUD-frameworks voor alleen deze feature.
- Geef iedere nieuwe functie een Engelse naam en een Engelse docstring met passende `@param`- en `@returns`-documentatie.
- Laat `unknown` alleen via Zod of een expliciete boundaryparser het domein binnenkomen.
- Houd expected domainconflicten in getypeerde `Result`-uitkomsten; gebruik exceptions alleen voor onverwachte defects.
- Behoud de bestaande, enige productie-/testcompositie en voeg geen module-global databaseverbindingen toe.

## Uitvoerplan

### Stap 1 — Location-contracts toevoegen

Werk in `packages/contracts`:

1. Voeg de strict request- en responseschemas uit `LOCATION_ENDPOINTS.md` toe.
2. Modelleer `UpdateLocationRequest` als strict object met optionele `name` en `parentId`, plus een refinement dat minstens één van beide velden aanwezig is.
3. Laat `parentId` expliciet `null` accepteren voor het hoofdniveau; ontbrekend en `null` blijven verschillende betekenissen bij `PATCH`.
4. Parse `archivedAt` als ISO-datetime of `null` en alle IDs als positieve integers.
5. Voeg alle locatiecodes toe, inclusief transportcodes `UNAUTHENTICATED`, `AUTH_UNAVAILABLE` en `INTERNAL_ERROR` die de daadwerkelijke HTTP-boundary nodig heeft.
6. Voeg het `./locations`-exportsubpath en rootexports toe zonder bestaande consumers te breken.
7. Breid `InventoryItemRow` uit met `isLocationArchived: boolean`, zodat Inventory geen tweede boomrequest hoeft te doen om het vereiste archieflabel te tonen.
8. Werk `INVENTORY_ENDPOINTS.md` tijdens uitvoering bij met dit afgeleide veld.

### Stap 2 — Naamnormalisatie één keer definiëren

Voeg één pure normalizer toe en gebruik die in contract-/servicevalidatie en migratiebackfill:

1. Trim begin- en eindwitruimte.
2. Vervang iedere reeks Unicode-witruimte door één gewone spatie.
3. Weiger lege namen, meer dan 100 tekens, control characters en `›`.
4. Normaliseer de nette, whitespace-gecanonicaliseerde weergavenaam naar Unicode NFC en bewaar die als `name`.
5. Bereken `normalized_name` als dezelfde NFC-naam met `toLocaleLowerCase("nl-NL")`; strip geen accenten, zodat `e` en `é` verschillende namen blijven.
6. Gebruik exact dezelfde pure functie bij create, rename, move en migratiebackfill.
7. Test minimaal gewone casing, Nederlandse accenten, interne whitespace, Unicode-equivalenten, `›`, controls en grenslengtes.

Gebruik geen algemene textutility als er buiten locaties geen identiek normalisatiecontract bestaat.

### Stap 3 — Additive locatie-migratie schrijven

Maak na `0009_inventory_backend` een nieuwe migratie, bijvoorbeeld `0010_location_management`; wijzig `0009` niet.

De migratie:

1. voegt/backfillt `normalized_name` voor bestaande locaties;
2. behoudt bestaande IDs, parentrelaties, `archived_at` en timestamps;
3. vervangt `location_parent_id_name_unique` door:
   - een unieke rootindex op `normalized_name` waar `parent_id IS NULL`;
   - een unieke siblingindex op `(parent_id, normalized_name)` waar `parent_id IS NOT NULL`;
4. maakt `normalized_name` uiteindelijk `NOT NULL`;
5. voegt checks toe voor naam/keylengte en `parent_id <> id`;
6. behoudt `ON DELETE RESTRICT` voor parent-, voorraad- en mutatiereferenties;
7. stopt zonder locaties automatisch te hernoemen wanneer bestaande data na normalisatie conflicteert;
8. eindigt met een geldige `PRAGMA foreign_key_check`.

Omdat SQLite tijdens een tabelrebuild niet betrouwbaar dezelfde Unicode-normalisatie uitvoert als TypeScript, registreert de migratierunner zo nodig één deterministische `normalize_location_name`-functie bij de Bun-SQLite-verbinding. Centraliseer het migreren in een helper die zowel `src/db/migrate.ts` als `tests/test-app.ts` gebruikt, zodat productie en tests exact dezelfde migratieomgeving hebben.

Werk daarna `apps/backend/src/db/schemas/storage.schema.ts` bij met `normalizedName`, de twee partial unique indexes en de checks. Pas directe testfixtures die `location` invoegen aan zodat zij via de normalizer een geldige key meesturen.

### Stap 4 — Migratiegedrag testen

Voeg een gerichte migratietest toe onder `apps/backend/tests`:

- migreer een database vanaf de toestand vóór `0010`;
- seed roots en kinderen, inclusief gelijknamige kinderen onder verschillende ouders;
- controleer behoud van IDs, parents, timestamps en archive flags;
- controleer whitespace-/casebackfill;
- controleer dat dubbele roots en dubbele siblings na migratie worden geweigerd;
- controleer dat dezelfde naam onder verschillende ouders toegestaan blijft;
- controleer self-parent en foreign-keygedrag;
- leg vast dat een bestaande normalisatiecollision de migratie laat falen in plaats van data stil te wijzigen.

### Stap 5 — Pure boom- en statusprojectie bouwen

Bouw in het location-domein één cycle-safe projector:

- indexeer alle rijen op ID;
- bereken actuele root-to-node-paden;
- bereken `isEffectivelyArchived` uit de node en alle voorouders;
- projecteer voor de defaultread alleen effectief actieve nodes;
- projecteer voor `status=archived` een forest waarvan iedere root de rechtstreeks gearchiveerde node onder actieve voorouders is;
- neem onder zo'n archiefroot alle afstammelingen op en behoud hun directe `archivedAt`;
- sorteer ieder siblingniveau met `localeCompare` in Nederlandse context, `numeric: true`, `sensitivity: "base"`, gevolgd door ID als stabiele tie-breaker;
- begrens of classificeer corrupte cyclische legacydata zodat reads niet recursief blijven hangen.

Test voorbeelden als:

```text
Keuken
└─ Koelkast [archived]
   ├─ Lade 1 [inherited]
   └─ Lade 2 [own archived]
```

Na herstel van `Koelkast` wordt `Lade 1` actief en blijft `Lade 2` gearchiveerd.

### Stap 6 — Location-store en use-cases implementeren

Implementeer serviceoperaties die steeds actuele data in een transactie lezen:

#### List

- `listActiveLocations()` retourneert uitsluitend actieve boomroots.
- `listArchivedLocations()` retourneert de afgesproken archiefforests met volledige paden.

#### Create

- valideer en normaliseer naam;
- `parentId: null` maakt een root;
- een parent moet bestaan en effectief actief zijn;
- controleer siblinguniciteit inclusief gearchiveerde siblings;
- vertrouw voor raceconditions daarnaast op de unieke database-index;
- zet beide timestamps en retourneer de nieuwe node met `children: []`.

#### Update

- hernoemen is ook toegestaan wanneer de node effectief gearchiveerd is;
- verplaatsen is alleen toegestaan voor een effectief actieve node;
- `parentId: null` verplaatst naar root;
- weiger current parent als betekenisloze move;
- weiger zichzelf, iedere afstammeling en effectief gearchiveerde parents;
- valideer naamuniciteit tegen de doelsiblings;
- pas `name`, `normalized_name`, `parent_id` en `updated_at` atomair toe wanneer naam en parent samen worden ingestuurd.

#### Archive

- archiveer alleen een effectief actieve node;
- herhalen op dezelfde rechtstreeks gearchiveerde node is idempotent;
- archiveer een alleen via een voorouder inactieve node niet alsnog rechtstreeks;
- zet alleen de eigen `archived_at` en `updated_at`;
- wijzig geen afstammelingen of voorraad.

#### Restore

- herstel een rechtstreeks gearchiveerde node alleen wanneer alle voorouders actief zijn;
- herhalen op een effectief actieve node is idempotent;
- wis alleen de eigen `archived_at` en werk `updated_at` bij;
- laat eigen archive flags van afstammelingen intact.

Vertaal database-uniciteitsconflicten deterministisch naar `LOCATION_ALREADY_EXISTS`; laat onverwachte persistencefouten naar de globale defectboundary gaan.

### Stap 7 — Authenticatie en location-routes aansluiten

Voorkom duplicatie van adminrolparsing door de bestaande `hasAdminRole`-logica uit de catalogmiddleware naar een kleine authhelper te verplaatsen en door beide routers te laten gebruiken.

Implementeer:

```text
GET   /locations
GET   /locations?status=archived
POST  /locations
PATCH /locations/:locationId
POST  /locations/:locationId/archive
POST  /locations/:locationId/restore
```

Route-eisen:

- zonder `status` vereist GET een gewone sessie;
- `status=archived` en iedere mutatie vereisen admin;
- waarden als `active`, `all`, lege status en onbekende queryvelden leveren `400 VALIDATION_ERROR`;
- params zijn positieve integers;
- bodies zijn strict en archive/restore accepteren geen payload;
- serviceerrors krijgen exact de gedocumenteerde status en error shape;
- authentication-storefouten gebruiken boundary `locations` en lekken geen oorzaken;
- archive en restore retourneren `200 LocationTreeNode`, create `201`, update `200`.

Compose de repository, service en router in `composition.ts`, voeg de routeafhankelijkheid toe aan `AppDependencies` en mount de router op `/` zonder catalog- of inventoryroutes te verbreden.

### Stap 8 — Backendtests toevoegen

Voeg unit- en route-integratietests toe voor minimaal:

- unauthenticated actieve GET;
- actieve GET voor gewone gebruiker;
- archived GET en alle writes geweigerd voor gewone gebruiker;
- strict query/body/paramvalidatie;
- create root en child;
- duplicate root, duplicate sibling en gelijknamige locaties onder verschillende ouders;
- parent not found en parent effectively archived;
- rename van actieve, rechtstreeks gearchiveerde en inherited archived nodes;
- move naar root en naar andere parent;
- atomair rename + move;
- move naar current parent, self, descendant en archived parent;
- archive met voorraad zonder dat voorraad verdwijnt;
- inherited archiveprojectie;
- idempotent direct archive en active restore;
- restore onder archived ancestor geweigerd;
- herstel waarbij een zelf-gearchiveerd kind gearchiveerd blijft;
- natuurlijke sortering `Lade 1`, `Lade 2`, `Lade 10`;
- contractparse van iedere succesresponse.

Gebruik de echte gemigreerde SQLite-testapp en voeg geen tweede, afwijkende backendcompositie toe.

### Stap 9 — Inventory-read aan effectieve locatiearchivering koppelen

Werk de bestaande inventory read-slice beperkt bij:

1. Laat `InventoryLocationRow` ook `archivedAt` lezen.
2. Gebruik dezelfde cycle-safe locatieprojector voor paths en effectieve archiefstatus.
3. Vul `InventoryItemRow.isLocationArchived` per partij.
4. Houd alle locaties in deze interne read, zodat paden van gearchiveerde voorraad resolveerbaar blijven.
5. Toon in `InventoryBatchRow` tekstueel `Gearchiveerde locatie` wanneer de flag waar is.
6. Verander de bestaande voorraadselectie, pagination of toevoegknop niet.
7. Voeg service-/routecontracttests toe voor voorraad op een direct en via een voorouder gearchiveerde locatie.

De actieve `GET /locations`-boom is daarna gereed voor de afzonderlijke voorraad-toevoegflow, maar die flow valt buiten dit plan.

### Stap 10 — Admin serveradapter en routecontract bouwen

Vervang de routeplaceholder door een beschermde React Router-route:

- `loader` roept altijd `requireAdministrator` aan;
- zonder filter laadt hij `GET /locations`;
- alleen `status=archived` wordt doorgestuurd;
- de loader parseert de volledige response met `locationTreeNodeSchema`;
- `action` dispatcht een gesloten `_action`-union voor create, rename, move, archive en restore;
- FormData wordt aan de routeboundary naar typed requests vertaald;
- de backendadapter stuurt de inkomende sessiecookie door en gebruikt `request.signal`;
- backenderrors worden naar veld- of formerrors vertaald zonder invoer te wissen;
- een succesvolle fetcheraction laat React Router de loader herladen;
- een geldige `source` blijft in filterlinks, fetcheractions en eventuele redirects staan.

Houd location API-code in de storage-managementfeature in plaats van de productgerichte `admin-dashboard-api.server.ts` verder te verbreden.

### Stap 11 — Actieve beheerboom implementeren

Bouw de actieve state volgens de spec:

- heading en introductie;
- statuskeuze `Actief` / `Gearchiveerd`;
- `Hoofdlocatie toevoegen` boven de boom;
- recursieve, onafhankelijk inklapbare rijen;
- per actieve rij: `Sublocatie toevoegen`, `Hernoemen`, `Verplaatsen`, `Archiveren`;
- empty state met primaire rootactie;
- load/errorstate met `Opnieuw proberen` waar React Router dit niet al afvangt.

Aanmaken en hernoemen gebruiken één herbruikbare naamdialog met verschillende context. Bij sublocatie-aanmaak staat de parent vast en toont de dialog het volledige parentpad; er komt geen parentdropdown.

### Stap 12 — Verplaatsdialog implementeren

De move-dialog:

- toont `Hoofdniveau` en een inklapbare actieve boom;
- maakt current parent, de node zelf en alle afstammelingen niet selecteerbaar;
- toont geen gearchiveerde locaties, omdat de loader alleen de actieve boom levert;
- verstuurt alleen `locationId` en gekozen `parentId`;
- houdt de dialog open bij serverconflict;
- sluit na succes en laat de actuele boom herladen.

De backend blijft leidend voor cycle-, status- en duplicatechecks; clientfiltering is alleen UX.

### Stap 13 — Archive- en restoreflow implementeren

Archive:

- toon exact de eenvoudige waarschuwing uit de spec;
- haal geen impactaantallen op;
- verstuur pas na expliciete bevestiging;
- blokkeer dubbel submitten;
- verwijder de tak pas uit de actieve UI nadat de server succes bevestigt of de loader opnieuw laadt.

Archived state:

- laad via `?status=archived`;
- toon iedere rechtstreeks gearchiveerde root met volledig pad en haar inherited afstammelingen;
- onderscheid `zelf gearchiveerd` en `via bovenliggende locatie inactief` tekstueel;
- bied hernoemen aan op iedere effectief gearchiveerde node;
- bied herstellen alleen aan op nodes die rechtstreeks gearchiveerd zijn en niet door een gearchiveerde voorouder worden geblokkeerd;
- bied geen move- of child-createactie aan;
- herstel zonder extra bevestiging.

### Stap 14 — Toegankelijkheid en responsive styling afronden

- Gebruik semantische buttons voor uitklappen en acties; borg `aria-expanded` en gekoppelde IDs.
- Geef actiemenu's een toegankelijke naam per locatie.
- Geef iedere dialog een titel, beschrijving waar nodig, initiële focus en focusherstel.
- Laat Escape alleen een niet-submitende dialog sluiten.
- Communiceer archiefstatus niet alleen met kleur.
- Zorg dat diepe bomen inspringen zonder viewportbrede horizontale overflow; begrens visuele inspringing op smalle schermen zonder de semantische diepte te verliezen.
- Hergebruik bestaande adminfarben, spacing en buttonpatterns; voeg geen UI-library toe voor alleen deze feature.

### Stap 15 — Admintests toevoegen

Gebruik Vitest zonder onnodig een nieuwe testlibrary toe te voegen:

- route-servertests met gestubde fetch voor active/archived loader en iedere action;
- tests dat cookies, methodes, JSON-bodies en backendpaden correct zijn;
- tests dat `source=inventory` en `source=calorie-tracker` in filter- en actiontargets behouden blijven;
- tests voor mapping van alle location errorcodes naar naam- of formerrors;
- pure tests voor disabled move-bestemmingen en boomviewmodels;
- SSR-markuptests voor active empty state, archive labels en beschikbare rijacties;
- browserverificatie voor focus, Escape, fetcher pending state, dialogs en diepe mobiele boom.

### Stap 16 — Documentatie na implementatie synchroniseren

Pas pas na groene implementatie de statusdocumentatie aan:

- zet de adminfeaturespec van `gepland` naar `geïmplementeerd`;
- verwijder in requirements en README de melding dat `/locations` een placeholder/geplande feature is;
- leg `isLocationArchived` vast in `INVENTORY_ENDPOINTS.md`;
- controleer dat `STORAGE_ERD.md` exact overeenkomt met de uiteindelijke schema- en migratienamen;
- zet dit plan op `uitgevoerd`;
- behoud de afgesproken scheiding tussen domeindoc, featurespec, endpointdoc en ERD.

## Tests en verificatie

Voer na iedere verticale slice de kleinste relevante checks uit en aan het einde:

```text
corepack pnpm --filter @product-repos/contracts typecheck
corepack pnpm --filter @product-repos/backend test
corepack pnpm --filter @product-repos/backend typecheck
corepack pnpm --filter @product-repos/backend build
corepack pnpm --filter product-management-admin test
corepack pnpm --filter product-management-admin typecheck
corepack pnpm --filter product-management-admin build
corepack pnpm --filter inventory typecheck
corepack pnpm --filter inventory build
```

Draai geen devservers vanuit de implementatiesessie. Verifieer met reeds door de gebruiker beheerde lokale servers in de browser:

1. lege actieve boom en root aanmaken;
2. `Keuken › Koelkast › Lade 1` opbouwen;
3. nog een `Lade 1` onder `Diepvries` aanmaken;
4. duplicate casing/whitespace onder dezelfde parent weigeren;
5. subboom verplaatsen en actuele paden controleren;
6. tak met voorraad archiveren zonder voorraadverlies;
7. actieve versus gearchiveerde filter en inherited labels controleren;
8. parent herstellen terwijl een apart gearchiveerd kind gearchiveerd blijft;
9. toetsenbord-, focus- en mobiele viewportgedrag controleren;
10. `source=inventory` tijdens alle filters en acties behouden.

## Implementatievolgorde

Voer dit in drie reviewbare slices uit:

1. **Persistence + contracts + backendread/write** — stappen 1 t/m 8.
2. **Admin beheer-UI** — stappen 10 t/m 15.
3. **Inventory-integratie + documentatiesync** — stappen 9 en 16, gevolgd door de volledige verificatiematrix.

Begin niet aan de admin-UI voordat migratie, contracten en backendintegratietests groen zijn. Archiveer geen locatie vanuit de UI voordat Inventory gearchiveerde voorraad kan blijven projecteren; zo ontstaat geen tijdelijke toestand waarin voorraad onherkenbaar op een verborgen locatie ligt.

## Acceptatiechecklist

- De placeholderknop is vervangen door werkend locatiebeheer.
- De database voorkomt genormaliseerde duplicate roots en siblings.
- Gelijknamige fysieke plaatsen onder verschillende ouders blijven toegestaan.
- Iedere write is admin-only en iedere read volgt de afgesproken rolgrens.
- De actieve endpointresponse bevat nooit een effectief gearchiveerde node.
- De archived response toont volledige archieftakken met directe en inherited status.
- Move kan geen cyclus of archived destination creëren.
- Archive en restore zijn idempotent volgens het contract.
- Archiveren verwijdert geen locatie, voorraad of mutatiehistorie.
- Bestaande voorraad op een gearchiveerde locatie blijft zichtbaar met een tekstueel label.
- Adminfilters en actions behouden een geldige `source`.
- Er bestaat geen delete- of archive-impactendpoint.
- Contracts, backend, admin, Inventory en builds zijn geverifieerd.
