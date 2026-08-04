# Locatie-endpointcontracten — opbergplaatsen

<!--
Documentatieregel: houd endpointdocs als compacte contract-DSL: routes, auth, params, body, responses, errorcodes en API-specifieke shapes.
Domeinregels, UI-gedrag, datamodeluitleg, voorbeelden en rationale horen in specs, ERD's of domeindocs; verwijs hier alleen kort wanneer dat nodig is.
-->

Dit document beschrijft het gedeelde HTTP-contract voor de actieve locatieboom in Inventory en locatiebeheer in Product Management Admin. Domeinregels staan in [opbergplaatsen-domeinregels.md](../../domein/opbergplaatsen-domeinregels.md), beheer-UI in [opbergplaatsen-beheren-specificatie.md](../../specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-specificatie.md) en opslagvelden in [STORAGE_ERD.md](../ERD/STORAGE_ERD.md).

## Contractconventies

```yaml
auth read active: user
auth read archived: admin
auth mutate: admin; mutatie-endpoints weigeren niet-beheerders zelfstandig
paths: Engelse plural resource names
body: strict; onbekende velden of verkeerde shapes => 400 VALIDATION_ERROR
text: trim + opeenvolgende whitespace reduceren tot één spatie voor validatie/opslag
name: 1..100 tekens na normalisatie; hoofdletterongevoelige duplicaatvergelijking
id: positieve integer
datetime: ISO 8601 string; null betekent niet rechtstreeks gearchiveerd
errorshape: { code, message, fields? }
```

## Errors

```yaml
400:
  - VALIDATION_ERROR
403:
  - ADMIN_ROLE_REQUIRED
404:
  - LOCATION_NOT_FOUND
  - PARENT_LOCATION_NOT_FOUND
409:
  - LOCATION_ALREADY_EXISTS
  - LOCATION_ARCHIVED
  - PARENT_LOCATION_ARCHIVED
  - LOCATION_CYCLE
  - LOCATION_ARCHIVED_BY_ANCESTOR
```

## Endpoints

### Actieve of gearchiveerde locatieboom

```yaml
GET /locations:
  auth:
    zonder status: user
    status=archived: admin
  query:
    status?: archived # weglaten betekent actieve boom; andere waarden, inclusief active en all, zijn ongeldig
  behavior:
    zonder status: uitsluitend effectief actieve locaties als boom
    status=archived: archieftakken vanaf de rechtstreeks gearchiveerde root met alle effectief gearchiveerde afstammelingen
    sortering: per niveau hoofdletterongevoelig natuurlijk alfabetisch
  returns:
    200: LocationTreeNode[]
  errors:
    400: [VALIDATION_ERROR]
    403: [ADMIN_ROLE_REQUIRED]
```

### Locatie aanmaken

```yaml
POST /locations:
  auth: admin
  body: CreateLocation
  behavior:
    parentId=null maakt een hoofdlocatie
    een parent moet bestaan en effectief actief zijn
    naam wordt genormaliseerd en moet uniek zijn onder de parent; een gearchiveerde sibling reserveert haar naam
  returns:
    201: LocationTreeNode
  errors:
    400: [VALIDATION_ERROR]
    403: [ADMIN_ROLE_REQUIRED]
    404: [PARENT_LOCATION_NOT_FOUND]
    409: [LOCATION_ALREADY_EXISTS, PARENT_LOCATION_ARCHIVED]
```

### Locatie hernoemen of verplaatsen

```yaml
PATCH /locations/:locationId:
  auth: admin
  params:
    locationId: location.id
  body: UpdateLocation # minimaal één veld aanwezig
  behavior:
    name hernoemt met behoud van ID en parent
    parentId verplaatst de volledige subboom; null betekent hoofdniveau
    hernoemen van een effectief gearchiveerde locatie is toegestaan
    verplaatsen van een effectief gearchiveerde locatie is niet toegestaan
    verplaatsen naar huidige parent, zichzelf, een afstammeling of een effectief gearchiveerde parent wordt geweigerd
    name + parentId worden atomair gevalideerd en toegepast
  returns:
    200: LocationTreeNode
  errors:
    400: [VALIDATION_ERROR]
    403: [ADMIN_ROLE_REQUIRED]
    404: [LOCATION_NOT_FOUND, PARENT_LOCATION_NOT_FOUND]
    409: [LOCATION_ALREADY_EXISTS, LOCATION_ARCHIVED, PARENT_LOCATION_ARCHIVED, LOCATION_CYCLE]
```

### Locatie archiveren

```yaml
POST /locations/:locationId/archive:
  auth: admin
  params:
    locationId: location.id
  body: none
  behavior:
    zet archivedAt op de gekozen locatie; afstammelingen behouden hun directe status
    maakt de volledige subboom effectief gearchiveerd
    verwijdert of verplaatst geen voorraad
    opnieuw archiveren van een rechtstreeks gearchiveerde locatie is idempotent
    rechtstreeks archiveren van een alleen via een voorouder inactieve locatie wordt geweigerd
  returns:
    200: LocationTreeNode
  errors:
    403: [ADMIN_ROLE_REQUIRED]
    404: [LOCATION_NOT_FOUND]
    409: [LOCATION_ARCHIVED_BY_ANCESTOR]
```

### Locatie herstellen

```yaml
POST /locations/:locationId/restore:
  auth: admin
  params:
    locationId: location.id
  body: none
  behavior:
    wist archivedAt van de gekozen locatie
    afstammelingen met een eigen archivedAt blijven rechtstreeks gearchiveerd
    opnieuw herstellen van een effectief actieve locatie is idempotent
    herstellen wordt geweigerd zolang een voorouder gearchiveerd is
  returns:
    200: LocationTreeNode
  errors:
    403: [ADMIN_ROLE_REQUIRED]
    404: [LOCATION_NOT_FOUND]
    409: [LOCATION_ARCHIVED_BY_ANCESTOR]
```

## API-shapes

Alle persistente velden verwijzen naar de gelijknamige ERD-kolom in camelCase. `path` en `isEffectivelyArchived` zijn afgeleid.

```yaml
LocationTreeNode:
  source: location
  fields:
    - id
    - name
    - parentId
    - path: derived # volledig actueel pad, bijvoorbeeld Keuken › Koelkast › Lade 1
    - archivedAt
    - isEffectivelyArchived: derived
    - children: LocationTreeNode[]

CreateLocation:
  name: location.name
  parentId: location.parent_id|null # verplicht aanwezig; null betekent hoofdniveau

UpdateLocation:
  name?: location.name
  parentId?: location.parent_id|null # null betekent naar hoofdniveau; minimaal één veld verplicht
```
