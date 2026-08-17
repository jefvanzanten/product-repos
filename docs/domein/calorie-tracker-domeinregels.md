# Domeinregels — Calorie Tracker en gerechten

## Gebruikers en gegevensscheiding

- De Calorie Tracker vereist authenticatie; iedere gebruiker beheert uitsluitend eigen logs en doelen.
- Receptbeheer vindt plaats in de recepten-app. In de Calorie Tracker heet hetzelfde backendobject een `gerecht`.
- Een beheerder kan catalogusdata beheren maar krijgt geen toegang tot persoonlijke logs of doelen.

## Consumptielogs

- Een log verwijst naar exact één concreet `product` of één gepinde `dish_version`.
- Logs bewaren oorspronkelijke hoeveelheid, invoermodus, invoereenheid, consumptiemoment en browsertijdzone.
- Product-, samenstellings- en voedingsdata wordt niet gesnapshot.
- Correcties aan namen, productinhoud of macroprofielen werken direct door in historische logs en statistieken.
- Nieuwe productlogs gebruiken alleen actieve producten; bestaande logs met een gearchiveerd product blijven leesbaar.

## Invoermodi

- `FULL_PRODUCT` gebruikt de volledige actuele productinhoud.
- `PRODUCT_PORTION` gebruikt de optionele actuele productportie.
- `CONTENT_UNIT` gebruikt een expliciete compatibele massa-, volume- of teleenheid.
- Een log bevat één hoeveelheid en één invoermodus; samengestelde invoer vereist meerdere logs.
- Berekeningen behouden precisie en ronden alleen voor presentatie af.

## Recepten en gerechten

- `dish` is de backendnaam; de recepten-app toont `recept` en de Calorie Tracker `gerecht`.
- Naam, maker, zichtbaarheid en archiefstatus staan live op `dish`.
- Ingrediënten, hoeveelheden, porties en optionele vrije bereidingsinstructies staan op immutable `dish_version`.
- Een inhoudelijke wijziging maakt een nieuwe versie. Een consumptielog pint de nieuwste versie van het logmoment.
- Naamscorrecties zijn direct zichtbaar in bestaande logs; latere receptwijzigingen veranderen de gepinde receptstructuur niet.
- Voedingswaarden van een gepinde versie worden altijd uit de actuele productdata berekend en zijn geen snapshot.
- Een recept heeft minimaal één actief productingrediënt en een positief aantal porties.
- Ingrediënten verwijzen rechtstreeks naar concrete producten en kunnen volledige producten, productporties of compatibele inhoudseenheden gebruiken.
- De recepten-app toont geen calorieën of macro's; de Calorie Tracker gebruikt ze voor gerechtlogs en statistieken.
- Receptnamen zijn case-insensitief uniek per maker onder niet-gearchiveerde recepten.
- Standaardzichtbaarheid is `PRIVATE`; de maker kan `PUBLIC` kiezen en later wijzigen.
- Publieke recepten zijn zonder login leesbaar en voor ingelogde gebruikers logbaar. Privérecepten zijn alleen voor de maker toegankelijk.
- Anderen kunnen publieke recepten niet wijzigen, archiveren of kopiëren in de MVP.
- Archiveren is omkeerbaar. Gearchiveerde recepten verdwijnen uit lijsten, directe publieke toegang en nieuwe logkeuzes, maar bestaande logs blijven leesbaar zonder receptlink.
- Herstellen gebruikt de laatst ingestelde zichtbaarheid.
- Een publiek recept dat privé wordt, verdwijnt voor anderen uit nieuwe keuzes; bestaande logs blijven bestaan.
- Gerechten als ingrediënt van andere gerechten zijn niet toegestaan.

## Productarchivering in recepten

- Bestaande receptversies met een gearchiveerd product blijven zichtbaar, logbaar en berekenbaar.
- Het gearchiveerde product blijft in bestaand receptdetail herkenbaar.
- Bij een inhoudelijke bewerking moet een gearchiveerd ingrediënt worden vervangen voordat de nieuwe versie kan worden opgeslagen.

## Tijd, berekeningen en bewaren

- Tijdstippen worden als UTC plus gebruikte IANA-browsertijdzone opgeslagen; die tijdzone bepaalt blijvend de lokale logdag.
- Toekomstige consumpties zijn niet toegestaan.
- Dishmacro's per portie zijn de som van actuele productbijdragen van de gepinde versie, gedeeld door het versieaantal porties.
- Ontbrekende productmacro's dragen voor onbekende waarden niets bij; het gerecht blijft logbaar.
- Log-create gebruikt een clientgegenereerd ID en is idempotent bij identieke retries.
- Logverwijdering is technisch herstelbaar binnen de undo-termijn; recepten gebruiken afzonderlijk archiveren/herstellen.
- Consumptielogs wijzigen voorraad niet automatisch.
