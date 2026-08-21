# Acceptatietestspecificatie — Inventory

## Doel

Deze specificatie beschrijft de functionele acceptatietests voor de Inventory-client en de bijbehorende backendcontracten. De scenario's bewaken de domeinregels over fysieke verpakkingen, autorisatie, groepering, zoeken, sorteren, THT, mutaties, auditgeschiedenis en foutafhandeling.

## Bronnen

- [Inventory-client doelmodel](./inventory-client-specificatie.md)
- [Voorraad inzien en filteren](./voorraad-inzien-specificatie.md)
- [Fysieke voorraad toevoegen](./voorraad-toevoegen-bottom-sheet-specificatie.md)
- [Fysieke voorraad aanpassen](./voorraad-aanpassen-specificatie.md)
- [Inventory-domeinregels](../../domein/inventory-domeinregels.md)
- [Opbergplaatsen-domeinregels](../../domein/opbergplaatsen-domeinregels.md)
- [Inventory-endpointcontracten](../../backend/Endpoints/INVENTORY_ENDPOINTS.md)
- [Storage/inventory-ERD](../../backend/ERD/STORAGE_ERD.md)

## Reikwijdte en testniveaus

| Onderwerp | Primair testniveau |
| --- | --- |
| Decimale berekeningen, THT-grenzen, groepering en sortering | Domein-unittest |
| Transacties, optimistic locking en auditregels | Service-/repository-integratietest |
| Authenticatie, requestvalidatie, statussen en foutcodes | Route-integratietest |
| Zoekdebounce, dialogen, rollen en fouttoestanden | React-componentintegratietest |
| Login, inzien, toevoegen, aanpassen en leegmaken | Kleine end-to-end-smokesuite |

De Gherkin-scenario-ID's zijn stabiele traceerbare identifiers. Eén scenario mag op meerdere testniveaus worden afgedekt wanneer zowel domeingedrag als waarneembaar UI-gedrag relevant is.

## Nog te besluiten voordat alle scenario's normatief worden

1. De maximale batchgrootte voor voorraad toevoegen; momenteel is alleen `quantity > 0` vastgelegd.
2. Of het bevestigen van meerdere gewijzigde velden atomair moet zijn. De huidige losse locatie-, THT- en inhoudsendpoints kunnen een gedeeltelijk opgeslagen wijziging veroorzaken.
3. Of het opnieuw opslaan van een ongewijzigde waarde een no-op is of een mutatie en versieophoging schrijft.
4. Het exacte gedrag wanneer actuele productinhoud lager wordt dan de opgeslagen resterende inhoud van een bestaand item.
5. Of de lage-voorraaddrempel van een gearchiveerd product gewijzigd mag worden.
6. De consistentiegarantie van cursorpaginering wanneer voorraad tussen twee pagina-aanvragen verandert.
7. Of wijzigingscontrols voor niet-beheerders volledig verborgen of zichtbaar maar uitgeschakeld moeten zijn. Ze mogen in geen geval een mutatie kunnen starten.

## Authenticatie en autorisatie

```gherkin
Feature: Inventory-autorisatie

  @AUTH-01
  Scenario Outline: Ingelogde gebruikers mogen voorraad lezen
    Given I am authenticated as "<role>"
    When I request "<endpoint>"
    Then the request is allowed

    Examples:
      | role  | endpoint                                             |
      | user  | GET /inventory-items                                 |
      | user  | GET /inventory-items/item-id                         |
      | user  | GET /inventory-items/products/search?query=kaas      |
      | admin | GET /inventory-items                                 |

  @AUTH-02
  Scenario Outline: Alleen beheerders mogen voorraad muteren
    Given I am authenticated as a regular user
    When I invoke "<operation>"
    Then the response status is 403
    And the error code is "ADMIN_ROLE_REQUIRED"
    And no inventory item or mutation row is changed

    Examples:
      | operation                                                        |
      | POST /inventory-items                                            |
      | PUT /inventory-items/item-id/content                             |
      | PUT /inventory-items/item-id/location                            |
      | PUT /inventory-items/item-id/expiry                              |
      | DELETE /inventory-items/item-id                                  |
      | PUT /inventory-items/products/product-id/low-stock-threshold     |

  @AUTH-03
  Scenario: Een niet-ingelogde gebruiker wordt geweigerd
    Given I have no valid session
    When I request an inventory endpoint
    Then the response status is 401
    And the error code is "UNAUTHENTICATED"

  @AUTH-04
  Scenario: De authenticatieopslag is niet beschikbaar
    Given session resolution is unavailable
    When I request inventory
    Then the response status is 503
    And the error code is "AUTH_UNAVAILABLE"
    And the response contains a correlation ID

  @AUTH-05
  Scenario: Een gewone gebruiker ziet alleen-lezenvoorraad
    Given I am authenticated as a regular user
    When the inventory page is displayed
    Then I do not see controls for adding, moving, editing or removing inventory
    And I do not see the admin-dashboard link

  @AUTH-06
  Scenario: Een verlopen browsersessie leidt veilig naar login
    Given my browser session expires while inventory is open
    When an API request returns "UNAUTHENTICATED"
    Then I am redirected to the inventory login page
    And only a safe internal return destination is retained
```

## Voorraad inzien en fysieke verdeling

```gherkin
Feature: Fysieke voorraad inzien

  @LIST-01
  Scenario: Er is geen actieve voorraad
    Given no inventory item has a remaining amount above zero
    When I open inventory
    Then I see the empty-inventory state
    And no product cards are displayed

  @LIST-02
  Scenario: Iedere fysieke verpakking blijft afzonderlijk identificeerbaar
    Given a product has two full packages with the same location and expiry date
    When its inventory projection is created
    Then both item IDs remain present
    And the UI can expose two independent detail rows
    And no persistent inventory row is merged

  @LIST-03
  Scenario: Aangebroken verpakkingen worden nooit tot één item samengevoegd
    Given two partial packages have equal remaining content, location and expiry date
    When inventory is listed
    Then both packages appear as separate physical items

  @LIST-04
  Scenario: Locatieheaders zijn alleen presentatiegroepering
    Given several packages are stored at the same location
    When the product card is expanded
    Then the location path is shown once as a section header
    And every package has its own controls beneath that header

  @LIST-05
  Scenario: Locatiepaden worden live afgeleid
    Given an inventory item is stored in "Berging › Koelkast"
    And that location is renamed to "Berging › Reservekoelkast"
    When inventory is reloaded
    Then the item displays "Berging › Reservekoelkast"
    And no snapshotted old path is displayed

  @LIST-06
  Scenario: Verpakkingsequivalent wordt alleen voor presentatie afgerond
    Given a product maximum is 300 grams
    And its packages contain a total of 400 grams
    When inventory is listed
    Then the exact equivalent used for ordering is 1.333333...
    And the displayed equivalent is 1.3

  @LIST-07
  Scenario: Verpakkingspictogrammen tonen iedere fysieke verpakking
    Given a product has two full packages and one package at 40 percent
    When its compact card is shown
    Then three package icons are shown
    And their fills are 100 percent, 100 percent and 40 percent
    And no compact quantity or progress bar is shown

  @LIST-08
  Scenario Outline: Praktische eenheden worden beknopt weergegeven
    Given an item contains "<baseAmount>" in dimension "<dimension>"
    When its exact quantity is displayed
    Then it is shown as "<display>"

    Examples:
      | baseAmount | dimension | display |
      | 1500       | MASS      | 1,5 kg  |
      | 12.5       | MASS      | 12,5 g  |
      | 2000       | VOLUME    | 2 l     |
      | 250        | VOLUME    | 25 cl   |
      | 3          | COUNT     | 3 st    |
```

## Sorteren, zoeken en pagineren

```gherkin
Feature: Voorraad ordenen en doorzoeken

  @LIST-09
  Scenario: De standaardordening is alfabetisch
    Given inventory contains several product groups
    When I select "Alles"
    Then groups are ordered by Dutch product display name
    And equal names have a deterministic tie-breaker

  @LIST-10
  Scenario: Voorraadordening gebruikt exacte verpakkingsequivalenten
    Given product A displays 1.3 packages but has an exact equivalent of 1.34
    And product B displays 1.3 packages but has an exact equivalent of 1.31
    When I select "Voorraad"
    Then product B appears before product A

  @LIST-11
  Scenario: Gelijke voorraad gebruikt alfabetische nevensortering
    Given two groups have equal exact package equivalents
    When I select "Voorraad"
    Then they are ordered alphabetically

  @LIST-12
  Scenario: Datumordening gebruikt de exact vroegste THT
    Given product A has dates 2026-04-10 and 2026-04-20
    And product B has date 2026-04-11
    When I select "Datum"
    Then product A appears before product B

  @LIST-13
  Scenario: Datumloze groepen staan onderaan
    Given dated and undated product groups exist
    When I select "Datum"
    Then every dated group appears before every undated group
    And undated groups are ordered alphabetically

  @SEARCH-01
  Scenario Outline: Zoektekst vindt alle ondersteunde metadata
    Given matching inventory exists only in "<field>"
    When I search for its matching text
    Then the product group is returned

    Examples:
      | field             |
      | product name      |
      | brand             |
      | category path     |
      | parent location   |
      | child location    |

  @SEARCH-02
  Scenario: Zoektekst wordt getrimd en hoofdletterongevoelig vergeleken
    Given "Jong Belegen Kaas" is in stock
    When I search for "  belegen KAAS  "
    Then that product is returned

  @SEARCH-03
  Scenario: Eén zoekteken start geen backendaanvraag
    When I enter one non-whitespace search character
    Then I am prompted to type another character
    And the unfiltered list remains visible
    And no search request is sent

  @SEARCH-04
  Scenario: Een late zoekresponse overschrijft nieuwere resultaten niet
    Given a slow request is running for "kaas"
    When I replace it with "melk"
    And the "kaas" response arrives last
    Then only results for "melk" are shown

  @LIST-14
  Scenario: Paginering behoudt ordening zonder duplicaten
    Given more groups exist than the page limit
    When I load all pages
    Then every matching group appears exactly once
    And the selected ordering is preserved across page boundaries

  @LIST-15
  Scenario: Het laden van een vervolgpagina mislukt
    Given the first page loaded successfully
    When loading the next page fails
    Then the already loaded groups remain visible
    And I see a non-destructive failure message
    And I can retry
```

## THT-grenzen en tijdzones

```gherkin
Feature: THT-status van voorraad

  @EXP-01
  Scenario Outline: THT wordt op kalenderdag geclassificeerd
    Given today is 2026-03-20 in the application timezone
    And the earliest expiry is "<expiry>"
    When inventory is listed
    Then its status is "<status>"

    Examples:
      | expiry     | status  |
      | 2026-03-19 | EXPIRED |
      | 2026-03-20 | TODAY   |
      | 2026-03-21 | URGENT  |
      | 2026-03-23 | URGENT  |
      | 2026-03-24 | SOON    |
      | 2026-03-27 | SOON    |
      | 2026-03-28 | LATER   |

  @EXP-02
  Scenario: Een ontbrekende THT heeft geen status
    Given every package in a group has no expiry date
    When inventory is listed
    Then its status is "NONE"
    And no expiry badge is displayed

  @EXP-03
  Scenario: De lokale browserdag geldt rond een UTC-daggrens
    Given UTC is already on 2026-03-21
    But the browser timezone is still on 2026-03-20
    And an item expires on 2026-03-20
    When inventory is requested
    Then its status is "TODAY"

  @EXP-04
  Scenario: Een ongeldige tijdzone valt veilig terug op UTC
    Given the timezone header is invalid
    When inventory is requested
    Then the request succeeds
    And UTC is used to determine today
```

## Fysieke voorraad toevoegen

```gherkin
Feature: Fysieke voorraad toevoegen

  Background:
    Given I am authenticated as an administrator

  @ADD-01
  Scenario: Meerdere verpakkingen worden transactioneel toegevoegd
    Given a 200 gram active product
    And an active location
    When I add quantity 3
    Then three inventory items with distinct UUIDs are created
    And each item contains 200 grams
    And each item has version 0
    And all items share the selected location and expiry date
    And three "ADD" mutation rows identify the acting user

  @ADD-02
  Scenario Outline: Ongeldige toevoegrequests worden afgewezen
    When I submit an add request with "<invalid value>"
    Then the response status is 400
    And no item or mutation is created

    Examples:
      | invalid value                     |
      | missing product ID                |
      | malformed product UUID            |
      | quantity zero                     |
      | negative quantity                 |
      | fractional quantity               |
      | quantity above configured maximum |
      | missing location                  |
      | non-positive location ID          |
      | invalid calendar date             |
      | unknown request field             |
      | malformed JSON                    |

  @ADD-03
  Scenario Outline: Ongeldige referenties en statussen geven een stabiele fout
    Given "<condition>"
    When I add inventory
    Then the request fails with "<code>"
    And no item or mutation is created

    Examples:
      | condition                         | code                    |
      | the product does not exist        | PRODUCT_NOT_FOUND       |
      | the product is archived           | PRODUCT_ARCHIVED        |
      | product content is unknown        | PRODUCT_CONTENT_UNKNOWN |
      | the location does not exist       | LOCATION_NOT_FOUND      |
      | the location is directly archived | LOCATION_ARCHIVED       |
      | an ancestor location is archived  | LOCATION_ARCHIVED       |

  @ADD-04
  Scenario: Voorraad mag op een niet-bladlocatie liggen
    Given an active location has child locations
    When I select the parent location and add inventory
    Then the inventory is added to that parent location

  @ADD-05
  Scenario: Een THT in het verleden is toegestaan voor bestaande voorraad
    Given an active measurable product and location
    When I add it with an expiry date before today
    Then the item is created
    And it is immediately classified as expired

  @ADD-06
  Scenario: Een fout midden in een batch draait alles terug
    Given creation of the third item fails
    When I add quantity 5
    Then no items from the request remain
    And no associated mutation rows remain

  @ADD-07
  Scenario: Herhaald bevestigen tijdens opslaan maakt geen dubbele voorraad
    Given a valid add form
    When I activate submit repeatedly before the response completes
    Then only one add request is sent
```

## Eén fysieke verpakking aanpassen

```gherkin
Feature: Eén fysieke verpakking aanpassen

  Background:
    Given I am authenticated as an administrator

  @EDIT-01
  Scenario: Eén verpakking aanpassen laat een andere ongemoeid
    Given two partial packages of the same product
    When I change the remaining content of the first package
    Then only the first package changes
    And only its version increments

  @EDIT-02
  Scenario Outline: Geldige resterende inhoud wordt geaccepteerd
    Given a package maximum of "<maximum>" in dimension "<dimension>"
    When I set its remaining content to "<remaining>"
    Then the update succeeds

    Examples:
      | maximum | dimension | remaining |
      | 200      | MASS      | 0.01      |
      | 200      | MASS      | 200       |
      | 1000     | VOLUME    | 250.5     |
      | 12       | COUNT     | 1         |
      | 12       | COUNT     | 12        |

  @EDIT-03
  Scenario Outline: Ongeldige resterende inhoud wordt afgewezen
    Given a package maximum of 200
    When I submit "<remaining>"
    Then the update is rejected
    And inventory and audit history remain unchanged

    Examples:
      | remaining |
      | -1        |
      | 201       |
      | 01        |
      | .5        |
      | 1e2       |
      | NaN       |
      | Infinity  |
      | empty     |

  @EDIT-04
  Scenario: COUNT weigert fracties
    Given a COUNT product with maximum 12
    When I set remaining content to 1.5
    Then the update is rejected
    And no mutation is written

  @EDIT-05
  Scenario: Nul verwijdert een item uit actieve voorraad
    Given an active item contains 40 grams
    When I set its remaining content to zero
    Then it disappears from active inventory
    And its persisted result is zero
    And a "REMOVE" mutation records a delta of -40

  @EDIT-06
  Scenario: Expliciet leegmaken heeft dezelfde auditsemantiek als nul
    Given an active item contains 40 grams
    When I confirm "Verpakking leegmaken"
    Then the item disappears from active inventory
    And one "REMOVE" mutation remains audit-accessible

  @EDIT-07
  Scenario: Een verouderde versie overschrijft geen nieuwere wijziging
    Given two editors loaded item version 3
    When the first editor successfully updates the item
    And the second editor submits version 3
    Then the second update fails with "INVENTORY_ITEM_VERSION_CONFLICT"
    And the first change remains intact
    And no mutation is written for the rejected update

  @EDIT-08
  Scenario: Een item verhuist naar een actieve locatie
    Given an item is in "Berging"
    When I move it to "Keuken › Koelkast"
    Then only that physical item moves
    And its version increments
    And a "MOVE" mutation records both locations

  @EDIT-09
  Scenario Outline: THT kan onafhankelijk worden beheerd
    Given an active item has expiry "<old>"
    When I set its expiry to "<new>"
    Then only its expiry changes
    And a "DATE_CHANGE" mutation records both values

    Examples:
      | old        | new        |
      | null       | 2026-04-01 |
      | 2026-04-01 | 2026-04-02 |
      | 2026-04-01 | null       |

  @EDIT-10
  Scenario: Een mislukte meerveldensave volgt de afgesproken atomiciteit
    Given an editor changes location, expiry and content
    And another user causes a version conflict during the save
    When the editor confirms all changes
    Then the result follows the agreed all-or-nothing policy
    And the UI accurately reports which values were persisted

  @EDIT-11
  Scenario: De inline slider slaat eenmaal op na beëindigen van interactie
    Given an administrator drags a package slider through several values
    When pointer or keyboard interaction ends
    Then only the final value is persisted
    And only one content mutation is requested

  @EDIT-12
  Scenario: Een mislukte inline wijziging wordt niet als opgeslagen getoond
    Given an administrator changes an inline slider
    When persistence fails
    Then an accessible error is displayed
    And refreshed inventory shows the last persisted amount
```

## Gearchiveerde producten en locaties

```gherkin
Feature: Voorraad met gearchiveerde referenties beheren

  @ARCH-01
  Scenario: Voorraad van een gearchiveerd product blijft zichtbaar
    Given a stocked product is archived
    When inventory is listed
    Then its existing stock is visible
    And the product is marked archived

  @ARCH-02
  Scenario: Voorraad van een gearchiveerd product mag omlaag
    Given an archived product has an item containing 100 grams
    When an administrator sets it to 50 grams
    Then the update succeeds

  @ARCH-03
  Scenario: Voorraad van een gearchiveerd product mag niet omhoog
    Given an archived product has an item containing 50 grams
    When an administrator attempts to increase its stock
    Then the update is rejected
    And no new package is created

  @ARCH-04
  Scenario: Voorraad op een gearchiveerde locatie blijft zichtbaar
    Given an item belongs to an effectively archived location
    When inventory is listed
    Then its current derived path is shown
    And it is marked "Gearchiveerde locatie"

  @ARCH-05
  Scenario Outline: Toegestane wijzigingen op een gearchiveerde locatie
    Given an item belongs to an effectively archived location
    When an administrator "<action>"
    Then the change succeeds

    Examples:
      | action                         |
      | reduces its remaining content  |
      | empties the item               |
      | corrects its expiry date       |
      | clears its expiry date         |
      | moves it to an active location |

  @ARCH-06
  Scenario Outline: Verboden wijzigingen naar een gearchiveerde locatie
    Given a location is effectively archived
    When an administrator "<action>"
    Then the request fails with "LOCATION_ARCHIVED"

    Examples:
      | action                        |
      | adds new inventory there      |
      | moves another item there      |
      | increases package count there |
```

## Lage voorraad

```gherkin
Feature: Lage-voorraadstatus

  @STOCK-01
  Scenario: Zonder drempel is er geen lage-voorraadstatus
    Given a product has no configured threshold
    When inventory is listed
    Then it is not marked low stock

  @STOCK-02
  Scenario Outline: Totale resterende inhoud wordt exact vergeleken
    Given total remaining content is "<total>"
    And the threshold is "<threshold>"
    When inventory is listed
    Then low-stock status is "<lowStock>"

    Examples:
      | total  | threshold | lowStock |
      | 99.99  | 100       | true     |
      | 100    | 100       | true     |
      | 100.01 | 100       | false    |

  @STOCK-03
  Scenario: De drempel gebruikt inhoud en niet het afgeronde verpakkingsequivalent
    Given exact total content is just above the threshold
    And its displayed package equivalent rounds down to the threshold equivalent
    When inventory is listed
    Then it is not marked low stock

  @STOCK-04
  Scenario Outline: Drempelwaarden gebruiken canonieke decimalen
    When I submit "<value>" as a threshold
    Then it is "<result>"

    Examples:
      | value | result   |
      | 0     | accepted |
      | 0.01  | accepted |
      | -1    | rejected |
      | 01    | rejected |
      | 1e2   | rejected |

  @STOCK-05
  Scenario Outline: Bewegingsklasse wordt gevalideerd
    When I submit movement class "<movementClass>"
    Then it is "<result>"

    Examples:
      | movementClass | result   |
      | SLOW          | accepted |
      | MEDIUM        | accepted |
      | FAST          | accepted |
      | null          | accepted |
      | UNKNOWN       | rejected |
```

## API-robuustheid en frontendtoestanden

```gherkin
Feature: Robuuste Inventory-client

  @API-01
  Scenario: Een misvormde succesresponse wordt niet gerenderd
    Given the backend returns HTTP 200 with an invalid inventory shape
    When the client parses the response
    Then it classifies the response as invalid
    And shows safe generic feedback

  @API-02
  Scenario: Een transportfout behoudt reeds getoonde voorraad
    Given inventory is already displayed
    When a refresh encounters a network failure
    Then the existing inventory remains visible
    And a retry action is available

  @API-03
  Scenario: Een bedoelde lege 204-response is geldig
    When emptying or deleting an item returns HTTP 204 without a body
    Then the client treats the operation as successful

  @API-04
  Scenario Outline: Onbekende of ongeldige requestwaarden worden strikt geweigerd
    When an inventory request contains "<invalid input>"
    Then the response status is 400
    And the error code is "VALIDATION_ERROR"
    And no domain operation is invoked

    Examples:
      | invalid input                 |
      | an unknown query parameter    |
      | an unknown JSON property      |
      | a limit below 1               |
      | a limit above 100             |
      | a negative cursor             |
      | an unsupported sort value     |
      | a query longer than 200       |
      | malformed JSON                |

  @UI-01
  Scenario: Een mislukte toevoeging behoudt de formulierstate
    Given I completed the add form
    When saving fails
    Then the dialog remains open
    And product, quantity, location and expiry remain selected
    And an actionable error is announced

  @UI-02
  Scenario: Een versieconflict claimt geen succesvolle wijziging
    Given my item version is stale
    When I confirm an edit
    Then the dialog remains open
    And I am told the package changed elsewhere
    And the UI does not claim that my draft was saved

  @UI-03
  Scenario Outline: Een dialoog sluit zonder opslaan
    Given I changed values in an inventory dialog
    When I close it using "<method>"
    Then no mutation request is sent

    Examples:
      | method                      |
      | Escape                      |
      | Annuleren                   |
      | close button                |
      | click outside where allowed |

  @UI-04
  Scenario: Een dialoog is met toetsenbord en screenreader bruikbaar
    When an inventory dialog opens
    Then it has an accessible name
    And focus moves into it
    And focus remains trapped while open
    And focus returns to the invoking control when closed

  @UI-05
  Scenario: Actieve locaties kunnen niet worden geladen
    Given the active location tree cannot be loaded
    When the add dialog is open
    Then saving remains disabled
    And a recoverable location error is displayed

  @UI-06
  Scenario: Productzoeken heeft geen resultaten
    Given no selectable product matches the query
    When product search completes
    Then a clear no-results state is displayed
    And no product is implicitly selected

  @UI-07
  Scenario: Een geslaagde mutatie ververst alle geraakte projecties
    Given an inventory list and item detail are cached
    When a mutation succeeds
    Then grouped lists are invalidated
    And the changed item detail is invalidated
    And refreshed totals, ordering and statuses are displayed

  @UI-08
  Scenario: Beginladen mislukt en kan opnieuw worden geprobeerd
    Given no inventory has been displayed yet
    When the initial inventory request fails
    Then a loading failure is displayed
    And I can retry the request

  @UI-09
  Scenario: Sorteringscontrols communiceren hun actieve staat
    Given inventory is open
    When I select "Voorraad"
    Then "Voorraad" has pressed state true
    And "Alles" and "Datum" have pressed state false
```

## Persistentie, transacties en audit

```gherkin
Feature: Integriteit van voorraadpersistentie

  @AUDIT-01
  Scenario: Iedere geslaagde mutatie heeft precies één passende auditregel
    When an item is added, changed, moved, dated or removed
    Then the corresponding mutation kind is recorded
    And it identifies the item, user and timestamp
    And its before, after and delta fields are internally consistent

  @AUDIT-02
  Scenario: Een afgewezen mutatie schrijft geen auditregel
    Given an update fails validation or optimistic locking
    When the transaction completes
    Then neither item state nor audit history has changed

  @AUDIT-03
  Scenario: Een item en zijn auditregel worden atomair geschreven
    Given persistence of the audit row fails
    When an inventory mutation is attempted
    Then the inventory item change is rolled back

  @AUDIT-04
  Scenario: Versies nemen per geslaagde wijziging toe
    Given an active item has version 4
    When one valid mutation succeeds
    Then the returned item has version 5
    And a later request with version 4 conflicts

  @AUDIT-05
  Scenario: Voorraadreferenties kunnen niet onder bestaande voorraad worden verwijderd
    Given an inventory item references a product and location
    When either referenced row is physically deleted
    Then the database rejects the deletion
```

## Migratie

```gherkin
Feature: Migratie naar fysieke inventory-items

  @MIG-01
  Scenario: Een oude quantity wordt uitgebreid naar fysieke rijen
    Given a legacy stock row has quantity 3
    When it is migrated
    Then three physical items with distinct IDs exist
    And each has the mapped concrete product, location and expiry
    And each starts with the product's full content

  @MIG-02
  Scenario: Migratie van quantity één maakt precies één item
    Given a legacy stock row has quantity 1
    When it is migrated
    Then exactly one physical inventory item exists for that row

  @MIG-03
  Scenario: Een migratiefout laat geen gedeeltelijke uitbreiding achter
    Given one legacy row cannot be mapped to a valid product
    When migration runs
    Then the agreed migration failure policy is applied
    And no partially expanded source row is committed
```

## Aanbevolen implementatievolgorde

1. **P0 — Domein en services:** decimalen, groepering, sortering, THT, batchtransactie, optimistic locking en auditintegriteit.
2. **P0 — Routes:** autorisatiematrix, strikte requestvalidatie en alle gedocumenteerde HTTP-/foutcontracten.
3. **P0 — Frontend:** rolgebonden controls, toevoegen en aanpassen bij succes/fout, nulinhoud en versieconflicten.
4. **P1 — Frontendranden:** zoekraces, vervolgpaginafouten, dialogtoegankelijkheid en archiefgedrag.
5. **P1 — Database:** constraints, transaction rollback en migratiefixtures.
6. **P2 — E2E-smoke:** inloggen, zoeken/sorteren, drie verpakkingen toevoegen, één aanpassen/verplaatsen, THT wissen en leegmaken.
7. Houd per scenario-ID een traceerbare koppeling bij naar het geautomatiseerde testbestand. Scenario's die een besluit uit `Nog te besluiten` vereisen, worden pas daarna bindend gemaakt.
