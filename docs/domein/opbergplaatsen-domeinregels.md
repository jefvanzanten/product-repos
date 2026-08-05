# Domeinregels — opbergplaatsen

Dit document is de gedeelde bron voor opbergplaatsen in Product Management Admin en Inventory. Functioneel beheergedrag staat in de [adminfeaturespecificatie](../specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-specificatie.md), de visuele uitwerking in de [UI-specificatie](../specs/admin-dashboard/opbergplaatsen/opbergplaatsen-beheren-ui-specificatie.md), HTTP-contracten in [LOCATION_ENDPOINTS.md](../backend/Endpoints/LOCATION_ENDPOINTS.md) en persistente velden in [STORAGE_ERD.md](../backend/ERD/STORAGE_ERD.md).

## Eigendom en gebruik

- Opbergplaatsen zijn gedeelde stamdata. Ze horen niet bij één gebruiker of huishouden.
- Iedere ingelogde gebruiker mag de actieve locatieboom gebruiken om voorraad te bekijken en een locatiepad te herkennen.
- Alleen beheerders mogen opbergplaatsen aanmaken, hernoemen, verplaatsen, archiveren en herstellen.
- Opbergplaatsen worden uitsluitend beheerd in Product Management Admin op `/locations`. Inventory maakt of beheert ze niet en toont geen cross-app-link naar locatiebeheer.
- Iedere voorraadpartij heeft verplicht precies één opbergplaats.
- Voorraad mag op ieder knooppunt van de locatieboom liggen, niet alleen op een blad.

## Identiteit en hiërarchie

- Iedere `location` stelt één concrete fysieke opbergplaats voor en heeft een eigen stabiele ID.
- Hoofd- en sublocaties gebruiken dezelfde entiteit. Een nullable `parent_id` vormt een boom met praktische onbeperkte diepte.
- Er komen geen afzonderlijke hoofdlocatie- of sublocatietabellen, herbruikbare labeltabel, enum of parent-child-koppeltabel.
- Gelijknamige fysieke plaatsen onder verschillende ouders zijn afzonderlijke locaties. `Koelkast › Lade 1` en `Diepvries › Lade 1` hebben dus verschillende IDs.
- Een locatie mag nooit zichzelf of een eigen afstammeling als ouder krijgen.
- Verplaatsen wijzigt alleen de parentrelatie van de gekozen locatie. De volledige subboom beweegt mee.
- Het volledige locatiepad wordt uit de actuele boom afgeleid en niet persistent als snapshot opgeslagen.
- Hernoemen of verplaatsen werkt daardoor direct door in ieder getoond voorraadpad.

## Namen

- Een naam bevat na normalisatie minimaal 1 en maximaal 100 tekens.
- Normalisatie verwijdert witruimte aan begin en einde, maakt opeenvolgende witruimte één spatie en vergelijkt hoofdletterongevoelig.
- Control characters en het padteken `›` zijn niet toegestaan.
- De nette gebruikersinvoer blijft als `name` bewaard; de canonieke vergelijkingswaarde staat in `normalized_name`.
- `normalized_name` is uniek onder dezelfde ouder. Voor hoofdlocaties geldt dezelfde uniciteit binnen het hoofdniveau.
- Dezelfde genormaliseerde naam onder verschillende ouders is toegestaan.
- Een gearchiveerde locatie blijft haar naam onder dezelfde ouder reserveren. Een beheerder herstelt of hernoemt die locatie voordat dezelfde naam opnieuw kan worden gebruikt.

## Sortering

- Hoofdlocaties en kinderen worden per niveau hoofdletterongevoelig en natuurlijk alfabetisch gesorteerd.
- Nummerreeksen sorteren daardoor als `Lade 1`, `Lade 2`, `Lade 10`.
- De eerste versie heeft geen handmatige volgorde en geen persistente `sort_order`.

## Directe en effectieve archiefstatus

- `archived_at = null` betekent dat de locatie zelf actief is.
- Een gevuld `archived_at` betekent dat de locatie zelf is gearchiveerd.
- Een locatie is **effectief gearchiveerd** wanneer zijzelf of een voorouder een gevuld `archived_at` heeft.
- Archiveren zet alleen `archived_at` van de gekozen locatie. Afstammelingen blijven met hun eigen parentrelaties en directe archiefstatus bewaard.
- De volledige effectief gearchiveerde tak verdwijnt uit actieve locatiebomen en locatiekiezers.
- Herstellen wist alleen `archived_at` van de gekozen locatie. Afstammelingen die zelf zijn gearchiveerd blijven effectief gearchiveerd.
- Een locatie kan niet afzonderlijk worden hersteld zolang een voorouder nog gearchiveerd is.
- Archiveren en herstellen zijn idempotent voor een locatie die al rechtstreeks in de gevraagde status staat.
- Opbergplaatsen worden niet permanent verwijderd. Er is geen bewaartermijn of automatische opschoning.
- Er komt in deze versie geen afzonderlijke auditlog voor locatiebeheer.

## Toegestane beheeracties

- Een hoofdlocatie wordt aangemaakt met `parent_id = null`.
- Een sublocatie kan alleen onder een effectief actieve ouder worden aangemaakt.
- Iedere locatie mag worden hernoemd, ook wanneer zij effectief gearchiveerd is, zolang de nieuwe naam uniek blijft onder haar ouder.
- Alleen effectief actieve locaties mogen worden verplaatst.
- Een actieve locatie mag naar het hoofdniveau of onder een andere effectief actieve locatie worden verplaatst.
- Verplaatsen naar de huidige ouder, zichzelf, een afstammeling of een effectief gearchiveerde ouder is geen geldige wijziging.
- Op een effectief gearchiveerde locatie kunnen geen nieuwe sublocaties worden aangemaakt en zij kan niet worden verplaatst.

## Gevolgen voor voorraad

Archiveren verwijdert of verplaatst geen voorraad. `inventory_item.location_id` blijft naar hetzelfde bewaarde locatie-record verwijzen; er wordt geen locatienaam of locatiepad in de voorraad gesnapshot.

Voor een effectief gearchiveerde locatie geldt:

- bestaande voorraad blijft zichtbaar met een aanduiding `Gearchiveerde locatie`;
- nieuwe voorraad toevoegen is niet toegestaan;
- bestaande voorraad verhogen is niet toegestaan;
- voorraad naar de locatie verplaatsen is niet toegestaan;
- bestaande voorraad verminderen of exact lager instellen blijft toegestaan;
- voorraad naar een effectief actieve locatie verplaatsen blijft toegestaan;
- een houdbaarheidsdatum corrigeren of verwijderen blijft toegestaan.

De locatie is dus geen geldige nieuwe bestemming, maar bestaande voorraad blijft beheersbaar en alle relaties blijven intact.
