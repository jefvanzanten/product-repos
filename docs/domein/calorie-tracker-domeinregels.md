# Domeinregels - Calorie Tracker

## Status

- Type: gedeeld domeindocument
- Algemene spec: [Calorie Tracker specificatie](../specs/calorie-tracker/calorie-tracker-specificatie.md)
- Datamodel: [Calorie Tracker ERD](../backend/ERD/CALORIE_TRACKER_ERD.md)
- Backendcontract: [Calorie Tracker endpoints](../backend/Endpoints/CALORIE_TRACKER_ENDPOINTS.md)
- Gedeelde catalogusregels: [Productcatalogus domeinregels](./productcatalogus-domeinregels.md)

## Doel

Dit document bewaart gedeelde Calorie Tracker-domeinkennis die door dashboard, logboek, mutaties, endpoints en ERD's wordt gebruikt. ERD's blijven beperkt tot opslagstructuur. Endpointdocumenten blijven beperkt tot HTTP-contracten.

## Gebruikers en gegevensscheiding

- De Calorie Tracker vereist authenticatie.
- Iedere gebruiker ziet en beheert uitsluitend de eigen consumptielogs en doelen.
- Een onbekend log-ID en een log van een andere gebruiker worden functioneel hetzelfde behandeld.
- Een beheerder kan de gedeelde productcatalogus beheren, maar krijgt daardoor geen toegang tot persoonlijke logs of doelen van andere gebruikers.

## Consumptielogs

- Een consumptielog hoort bij exact één gebruiker en één catalogusverpakking.
- Een log bewaart de oorspronkelijke hoeveelheid, invoermodus, invoereenheid, het consumptiemoment en de gebruikte browsertijdzone.
- Logs bewaren geen product-, verpakking- of voedingssnapshot.
- Actuele catalogusdata bepaalt de zichtbare productinformatie, afgeleide hoeveelheden en voedingswaarden.
- Correcties aan product-, verpakking- of voedingsdata werken daardoor door in historische logs en statistieken.
- Nieuwe logs gebruiken alleen actief selecteerbare producten en verpakkingen.
- Een bestaand log met een gearchiveerd product of gearchiveerde verpakking blijft leesbaar en berekenbaar.

## Invoermodi en hoeveelheden

- `PACKAGE` gebruikt de expliciete volledige actuele verpakkingsinhoud.
- `INDIVIDUAL_UNIT` is alleen geldig wanneer de verpakking een portiedefinitie heeft en gebruikt de expliciete actuele portiegrootte, onafhankelijk van de volledige verpakkingsinhoud.
- `CONTENT_UNIT` gebruikt een expliciete massa-, volume- of teleenheid.
- `CONTENT_UNIT` moet dezelfde dimensie hebben als de verpakking en het macroprofiel.
- Een log bevat exact één hoeveelheid en één invoermodus.
- Samengestelde invoer, zoals `2 stuks en 100 g`, bestaat niet; de gebruiker maakt daarvoor meerdere logs.
- Interne berekeningen bewaren hogere precisie. Afronding gebeurt pas voor presentatie.

## Lokale dagen en tijdzones

- De client stuurt een geldige IANA-browsertijdzone mee, bijvoorbeeld `Europe/Amsterdam`.
- Het log bewaart het consumptiemoment technisch als UTC-tijdstip en bewaart daarnaast de gebruikte browsertijdzone.
- De lokale kalenderdatum wordt afgeleid door het consumptiemoment in de opgeslagen browsertijdzone te interpreteren.
- Een latere wijziging van de browsertijdzone verplaatst bestaande logs niet naar een andere lokale kalenderdatum.
- Toekomstige consumpties zijn niet toegestaan in de meegestuurde browsertijdzone.

## Calorieën, macro's en doelen

- Producten zonder macroprofiel kunnen worden gelogd, maar dragen niet bij aan calorie- of macrototalen.
- Een gedeeltelijk macroprofiel draagt alleen bij met de beschikbare waarden.
- Alleen aanwezige calorie- en macrowaarden tellen mee voor hun eigen totaal.
- Expliciet opgeslagen calorieën zijn leidend.
- Wanneer calorieën ontbreken, mogen ze alleen automatisch worden berekend wanneer eiwit, koolhydraten en vet alle drie aanwezig zijn.
- Dagtotalen worden pas na optellen afgerond.
- Persoonlijke doelen zijn actuele instellingen zonder historische versies.
- Caloriestatistieken kunnen vandaag of één eerdere lokale kalenderdag tonen.
- Een nieuw of gewijzigd doel geldt direct voor iedere daarna getoonde dagvergelijking, ook voor een eerdere geselecteerde datum.

## Mutaties, retries en bewaren

- De client genereert een consumptielog-ID vóór het aanmaken.
- Een retry met dezelfde create-inhoud en hetzelfde ID maakt maximaal één log aan.
- Een retry met hetzelfde ID maar afwijkende create-inhoud is een conflict.
- Updates gebruiken de laatst gelezen `updated_at`-waarde om stil overschrijven te voorkomen.
- Verwijderen zet een technisch verwijdermoment; normale UI- en API-states behandelen het log daarna als niet-bestaand.
- Herstellen is kort na verwijdering mogelijk via de undo-flow.
- Technisch verwijderde logs worden na de bewaartermijn definitief gewist.
