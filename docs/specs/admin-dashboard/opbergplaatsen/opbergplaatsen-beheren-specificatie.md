# Specificatie — opbergplaatsen beheren

## Status

- Onderdeel: Product Management Admin > opbergplaatsen
- App-interne route: `/locations`
- Publieke route: `/product-management-admin/locations`
- Status: gepland; de huidige pagina is een niet-functionele placeholder
- Domeinregels: [opbergplaatsen-domeinregels.md](../../../domein/opbergplaatsen-domeinregels.md)
- Backendcontract: [LOCATION_ENDPOINTS.md](../../../backend/Endpoints/LOCATION_ENDPOINTS.md)
- Datamodel: [STORAGE_ERD.md](../../../backend/ERD/STORAGE_ERD.md)

## Doel

Een beheerder kan de gedeelde opbergplaatsenboom volledig beheren, zodat Inventory altijd een geldige actieve opbergplaats kan kiezen voor voorraad.

## Rollen

- De route en alle beheeracties vereisen een ingelogde gebruiker met de beheerdersrol.
- Alleen verbergen van beheeracties in de UI is niet voldoende; ieder mutatie-endpoint controleert de rol zelfstandig.
- Een niet-ingelogde bezoeker volgt de algemene admin-loginflow.
- Een ingelogde gebruiker zonder beheerdersrol krijgt geen toegang tot de inhoudelijke adminroute.

## Binnen scope

- Actieve opbergplaatsen als inklapbare boom bekijken.
- Gearchiveerde opbergplaatsen via een expliciet archieffilter bekijken.
- Hoofdlocaties en sublocaties aanmaken.
- Locaties hernoemen.
- Een actieve locatie met haar volledige subboom verplaatsen.
- Een locatie en daarmee effectief haar volledige subboom archiveren.
- Een rechtstreeks gearchiveerde locatie herstellen.
- Lege, laad- en fouttoestanden.

## Buiten scope

- Opbergplaatsen permanent verwijderen.
- Afzonderlijke tabellen of beheerschermen voor hoofdlocaties, sublocaties, locatietypen of herbruikbare labels.
- Handmatige sortering.
- Een zoekveld voor de locatieboom.
- Locatiebeheer vanuit Inventory.
- Een locatieauditlog.
- Afhankelijkheidsaantallen of een archive-impactendpoint.
- Voorraad op deze adminpagina tonen of muteren.

## Paginaopzet

```text
Opbergplaatsen
Beheer de plaatsen waar voorraad kan worden opgeslagen.

[ Actief ] [ Gearchiveerd ]

[ Hoofdlocatie toevoegen ]

Keuken
├─ Voorraadkast
└─ Koelkast
   ├─ Lade 1
   └─ Lade 2

<per regel: acties>
```

- `Actief` is de standaardweergave en gebruikt `GET /locations`.
- `Gearchiveerd` gebruikt `GET /locations?status=archived`.
- De actieve weergave toont uitsluitend effectief actieve locaties.
- De archiefweergave begint per tak bij de locatie die de tak rechtstreeks inactiveerde en toont haar afstammelingen eronder.
- Een gearchiveerde rootregel toont het volledige pad, zodat eventueel niet weergegeven actieve voorouders herkenbaar blijven.
- De UI onderscheidt `zelf gearchiveerd` van `inactief via bovenliggende locatie`.
- Kinderen zijn per niveau inklapbaar. Meerdere takken mogen tegelijk openstaan.
- Locaties worden per niveau natuurlijk alfabetisch gesorteerd.
- Op mobiel blijft de boom horizontaal bruikbaar zonder dat actiekoppen buiten de viewport vallen.
- Een geldige `source`-queryparameter blijft tijdens laden, filteren, formulieracties en redirects behouden volgens de algemene adminregels.

## Acties in de actieve boom

Boven de boom staat `Hoofdlocatie toevoegen`. Iedere actieve locatieregel biedt via een duidelijk actiemenu:

- `Sublocatie toevoegen`;
- `Hernoemen`;
- `Verplaatsen`;
- `Archiveren`.

De gekozen locatie en haar volledige pad zijn steeds zichtbaar in de bijbehorende dialog. Er is geen platte parentdropdown voor aanmaken.

## Hoofdlocatie en sublocatie aanmaken

- `Hoofdlocatie toevoegen` opent een dialog met alleen een naamveld en gebruikt `parentId: null`.
- `Sublocatie toevoegen` opent dezelfde dialog met de gekozen ouder vastgezet en zichtbaar als context.
- Een sublocatie kan alleen onder een effectief actieve ouder worden aangemaakt.
- Na succes sluit de dialog en wordt de actieve boom ververst.
- Bij een fout blijft de dialog open en blijft de invoer behouden.
- Een duplicaat onder dezelfde ouder toont een gerichte melding; dezelfde naam onder een andere ouder is toegestaan.

## Hernoemen

- Hernoemen opent een dialog met de huidige naam vooringevuld.
- Hernoemen verandert de stabiele locatie-ID en parentrelatie niet.
- De wijziging werkt direct door in afgeleide locatiepaden in Admin en Inventory.
- Een effectief gearchiveerde locatie mag worden hernoemd, onder dezelfde naamregels als een actieve locatie.
- Hernoemen kan worden gebruikt om een door een gearchiveerde locatie gereserveerde naam vrij te maken.

## Verplaatsen

- Verplaatsen opent een dialog met een inklapbare boomkiezer en de expliciete keuze `Hoofdniveau`.
- Alleen effectief actieve locaties zijn mogelijke ouders.
- De locatie zelf, haar afstammelingen en haar huidige ouder zijn niet als geldige bestemming selecteerbaar.
- Verplaatsen wijzigt de parentrelatie van de gekozen locatie; de volledige subboom beweegt mee.
- Gekoppelde voorraad behoudt dezelfde `location_id`; alleen het afgeleide pad verandert.
- Effectief gearchiveerde locaties kunnen niet worden verplaatst. Zij moeten eerst geldig worden hersteld.
- De backend controleert zelfstandig op ongeldige ouders, naamconflicten en cycli.

## Archiveren

Een actieve locatieregel biedt `Archiveren`. Voor uitvoering toont de UI uitsluitend deze eenvoudige bevestiging, zonder afhankelijkheidsaantallen of extra API-call:

> Weet je zeker dat je deze opbergplaats wilt archiveren? Onderliggende opbergplaatsen zijn daarna niet meer selecteerbaar. Bestaande voorraad blijft bewaard.

Na bevestiging:

- krijgt alleen de gekozen locatie een directe `archived_at`;
- wordt de volledige subboom effectief gearchiveerd;
- verdwijnt de tak uit de actieve boom en uit alle actieve locatiekiezers;
- blijven locaties, parentrelaties, voorraad en voorraadmutaties bewaard;
- blijft bestaande voorraad zichtbaar en kan deze volgens de inventorydomeinregels worden afgebouwd of eruit worden verplaatst.

Er is geen permanente verwijderactie.

## Gearchiveerde locaties bekijken en herstellen

De archiefweergave toont per tak:

```text
Keuken › Koelkast                 [zelf gearchiveerd]
├─ Lade 1                         [via Koelkast inactief]
└─ Lade 2                         [via Koelkast inactief]
```

- Een rechtstreeks gearchiveerde locatie kan worden hernoemd of hersteld.
- Een uitsluitend via een voorouder inactieve locatie kan worden bekeken en hernoemd, maar niet afzonderlijk worden hersteld.
- Een effectief gearchiveerde locatie kan niet worden verplaatst en krijgt geen actie om een sublocatie toe te voegen.
- Herstellen vereist geen extra bevestigingsdialog.
- Herstellen maakt de locatie en haar niet-zelf-gearchiveerde afstammelingen weer actief.
- Afstammelingen met een eigen `archived_at` blijven gearchiveerd.
- Als een voorouder nog gearchiveerd is, wordt herstellen geweigerd en moet eerst die voorouder worden hersteld.

## Naamvalidatie

- Naam is verplicht en bevat na normalisatie maximaal 100 tekens.
- Begin- en eindwitruimte worden verwijderd; opeenvolgende witruimte wordt één spatie.
- Vergelijking voor duplicaten is hoofdletterongevoelig.
- Control characters en `›` zijn niet toegestaan.
- Dezelfde genormaliseerde naam onder één ouder wordt geweigerd, ook wanneer de bestaande locatie gearchiveerd is.
- Dezelfde naam onder verschillende ouders blijft toegestaan.

## Lege, laad- en fouttoestanden

- Zonder actieve locaties toont de actieve weergave uitleg en de primaire actie `Hoofdlocatie toevoegen`.
- Zonder gearchiveerde locaties toont de archiefweergave een neutrale melding zonder actie.
- Tijdens de eerste laadactie toont de pagina een laadstatus.
- Wanneer laden mislukt, toont de pagina een foutmelding met `Opnieuw proberen`.
- Een mutatiefout blijft in de geopende dialog zichtbaar en wist de invoer niet.
- Wanneer een locatie of ouder gelijktijdig is verdwenen of gewijzigd, ververst de client de boom en toont zij een gerichte melding.

## Toegankelijkheid

- De boom, uitklapacties en actiemenu's zijn volledig met het toetsenbord bedienbaar.
- Dialogs hebben een zichtbare titel, correcte dialogsemantiek, initiële focus en focusherstel na sluiten.
- Escape sluit een niet-bezig formulier zonder wijzigingen op te slaan.
- De archiefstatus wordt niet uitsluitend met kleur gecommuniceerd.
- Tijdens opslaan zijn dubbele submits geblokkeerd en blijft de voortgang herkenbaar.

## Acceptatiecriteria

### AC-01 — Actieve boom laden

Gegeven dat actieve opbergplaatsen bestaan  
Wanneer de beheerder `/locations` opent  
Dan toont de pagina uitsluitend effectief actieve locaties als natuurlijk gesorteerde boom.

### AC-02 — Hoofdlocatie aanmaken

Gegeven dat de actieve boom geopend is  
Wanneer de beheerder een geldige unieke hoofdlocatie opslaat  
Dan verstuurt de client `parentId: null`  
En verschijnt de nieuwe locatie op het hoofdniveau.

### AC-03 — Sublocatie contextueel aanmaken

Gegeven dat `Keuken › Koelkast` actief is  
Wanneer de beheerder vanaf `Koelkast` de sublocatie `Lade 1` toevoegt  
Dan wordt `Lade 1` met `Koelkast` als ouder aangemaakt  
En is geen platte locatiedropdown nodig.

### AC-04 — Gelijknamige fysieke plaatsen

Gegeven dat `Koelkast › Lade 1` bestaat  
Wanneer de beheerder `Diepvries › Lade 1` aanmaakt  
Dan wordt dit toegestaan als afzonderlijke locatie  
Maar een tweede `Koelkast › Lade 1` wordt geweigerd.

### AC-05 — Genormaliseerd duplicaat blokkeren

Gegeven dat `Koelkast` op een niveau bestaat  
Wanneer de beheerder daar `  KOELKAST  ` probeert aan te maken  
Dan retourneert de backend `409 LOCATION_ALREADY_EXISTS`  
En blijft de dialog met een begrijpelijke melding open.

### AC-06 — Hernoemen

Gegeven dat een locatie bestaat  
Wanneer de beheerder een geldige nieuwe naam opslaat  
Dan blijft de locatie-ID gelijk  
En gebruiken Admin en Inventory daarna het nieuwe afgeleide pad.

### AC-07 — Subboom verplaatsen

Gegeven dat `Koelkast › Lade 1` met afstammelingen bestaat  
Wanneer de beheerder `Lade 1` naar `Diepvries` verplaatst  
Dan beweegt de volledige subboom mee  
En blijft gekoppelde voorraad naar dezelfde locatie-ID verwijzen.

### AC-08 — Cyclus blokkeren

Gegeven dat A een voorouder van B is  
Wanneer de beheerder A onder B probeert te verplaatsen  
Dan biedt de UI B niet als bestemming aan  
En weigert de backend de mutatie zelfstandig met `LOCATION_CYCLE`.

### AC-09 — Archiveren zonder dataverlies

Gegeven dat een actieve locatie sublocaties en voorraad heeft  
Wanneer de beheerder de eenvoudige bevestiging accepteert  
Dan wordt de volledige tak effectief gearchiveerd  
En blijven locaties, voorraad en mutatiegeschiedenis bewaard.

### AC-10 — Niet meer selecteerbaar

Gegeven dat een locatie effectief gearchiveerd is  
Dan verschijnt zij niet in de actieve locatieboom of voorraadlocatiekiezers  
En kan geen voorraad aan of naar die locatie worden toegevoegd.

### AC-11 — Bestaande voorraad beheersbaar

Gegeven dat voorraad op een effectief gearchiveerde locatie ligt  
Dan blijft die voorraad zichtbaar met een archieflabel  
En kan de beheerder haar verminderen, corrigeren of naar een actieve locatie verplaatsen.

### AC-12 — Archieftak tonen

Gegeven dat een gearchiveerde locatie afstammelingen heeft  
Wanneer de beheerder `Gearchiveerd` kiest  
Dan ziet de beheerder de rechtstreeks gearchiveerde locatie met volledig pad  
En haar effectief inactieve afstammelingen als onderliggende boom.

### AC-13 — Herstellen met eigen kindstatus

Gegeven dat een gearchiveerde ouder wordt hersteld  
Wanneer een afstammeling zelf niet gearchiveerd is  
Dan wordt die afstammeling weer actief  
Maar een afstammeling met een eigen `archived_at` blijft gearchiveerd.

### AC-14 — Herstellen onder gearchiveerde voorouder weigeren

Gegeven dat een locatie door een gearchiveerde voorouder inactief is  
Wanneer een afzonderlijk herstelverzoek wordt gedaan  
Dan weigert de backend dit met `LOCATION_ARCHIVED_BY_ANCESTOR`.

### AC-15 — Geen hard delete

Gegeven dat een locatie bestaat  
Dan biedt Product Management Admin geen actie of endpoint om haar permanent te verwijderen.

### AC-16 — Autorisatie

Gegeven dat een ingelogde gebruiker geen beheerder is  
Dan krijgt die gebruiker geen toegang tot de locatiebeheerpagina  
En weigeren alle locatiemutatie-endpoints de gebruiker zelfstandig.
