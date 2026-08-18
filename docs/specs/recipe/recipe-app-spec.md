# Specificatie — Recepten-app

## Status

- Publiek basispad: `/recepten`
- Backendbegrip: `dish`
- Clientbegrip in deze app: `recept`
- Status: doelmodel / MVP gespecificeerd
- UI-specificatie: [recipe-app-ui-specificatie.md](./recipe-app-ui-specificatie.md)
- Domeinregels: [calorie-tracker-domeinregels.md](../../domein/calorie-tracker-domeinregels.md)
- Endpointcontract: [RECIPE_ENDPOINTS.md](../../backend/Endpoints/RECIPE_ENDPOINTS.md)

## Doel

De app wordt de enige client voor het aanmaken en beheren van recepten. Daardoor verdwijnt gerechtbeheer uit de Calorie Tracker; die app zoekt en logt alleen bestaande gerechten.

## Terminologie en eigenaarschap

- In deze app heet het object `recept`; in de Calorie Tracker heet hetzelfde object `gerecht`.
- Backend, tabellen en interne contracts mogen `dish` blijven gebruiken.
- De maker blijft eigenaar. Bezoekers kunnen publieke recepten lezen; ingelogde gebruikers kunnen ze als gerecht loggen vanuit de Calorie Tracker.
- De recepten-app registreert zelf geen consumpties en toont geen calorieën of macro's.

## Routes

| Route | Doel | Toegang |
| --- | --- | --- |
| `/recepten` | Alle publieke recepten, zoeken en filters | Iedereen |
| `/recepten/gebruiker/:userId` | Recepten van één gebruiker | Publiek: alleen publiek; eigenaar: publiek en privé |
| `/recepten/gebruiker/:userId/:recipeId` | Receptdetail | Publiek recept of eigenaar |
| `/recepten/nieuw` | Recept aanmaken | Ingelogd |
| `/recepten/gebruiker/:userId/:recipeId/bewerken` | Eigen recept bewerken | Maker |

De link `Mijn recepten` is alleen zichtbaar na login en wijst naar `/recepten/gebruiker/<eigen-userId>`. Een latere versie mag user-ID's naar stabiele slugs migreren.

## MVP-scope

### Binnen scope

- Publieke receptenlijst op `/recepten`, standaard nieuwste eerst.
- Zoeken op receptnaam, case-insensitief na trimmen.
- Filters en sortering; navigatie tussen `Alle recepten` en `Mijn recepten` voor ingelogde gebruikers.
- Publiek receptdetail zonder login.
- Eigen privé-receptdetail na login; onbevoegden krijgen een neutrale 404.
- Recept aanmaken, bewerken, archiveren en herstellen.
- Naam, positief aantal porties, minimaal één concreet productingrediënt en optionele vrije bereidingsinstructies.
- Zichtbaarheid `Privé` of `Publiek`, standaard privé.
- Makernaam tonen op publieke details zonder klikbaar profiel.
- Vanuit de Calorie Tracker naar `Recept bekijken`; eigenaar kan vervolgens bewerken.

### Buiten MVP

- Receptafbeeldingen.
- Calorie- of macroweergave.
- Stappeneditor, timers, video of rijke tekstopmaak.
- Recepten kopiëren, liken, beoordelen of becommentariëren.
- Andere recepten als ingrediënt.
- Versiegeschiedenis of herstel naar een oude versie in de UI.
- Consumpties loggen vanuit deze app.
- Aanbevelingen en consumptiehistorie; zie Should have.

## Overzicht en zoeken

- `/recepten` toont voor iedereen dezelfde publieke dataset.
- Standaardsortering is `created_at` aflopend; bewerken maakt een recept niet opnieuw recent.
- Bezoekers zien uitsluitend publieke, niet-gearchiveerde recepten.
- De gebruikersroute toont aan anderen alleen publieke recepten en aan de eigenaar ook privé-recepten.
- De eigenaar kan een afzonderlijk filter `Gearchiveerd` openen en recepten herstellen.
- Zoeken matcht in de MVP alleen op receptnaam.

## Receptgegevens

### Live stamgegevens

- naam;
- maker;
- zichtbaarheid;
- archiefstatus.

Een naamscorrectie is direct zichtbaar in de recepten-app en bestaande Calorie Tracker-logs.

### Geversioneerde inhoud

- aantal porties;
- ingrediënten;
- hoeveelheden en invoereenheden;
- optionele bereidingsinstructies.

Iedere inhoudelijke wijziging maakt een immutable versie. Het receptdetail toont de nieuwste versie; oude versies blijven intern bestaan voor gepinde logs.

## Ingrediënten

- Een recept heeft minimaal één ingrediënt.
- Ingrediënten verwijzen rechtstreeks naar actieve concrete `product`-records met een niet-null consumptietype uit de vernieuwde catalogus.
- De maker ziet concrete productnaam en merk; verpakkingsinformatie blijft herkenbaar in de afgeleide productnaam.
- Invoer kan via compatibele massa-, volume- of teleenheid, of via de optionele productportie.
- Wanneer voedingsbasis bekend is, toont de eenheidskeuze alleen compatibele eenheden.
- Zonder bekende voedingsbasis toont zij alle actieve eenheden gegroepeerd per dimensie.
- Consumptieproducten zonder actief macroprofiel zijn toegestaan.
- Recepthoeveelheid is onafhankelijk van verpakkingsinhoud. Vanaf één volledige verpakking mag de UI informatief `1 blik`, `1,5 blik` of `2 blikken` tonen; de opgeslagen bron blijft hoeveelheid + eenheid.
- Gearchiveerde of later niet-consumeerbaar gemaakte producten blijven in bestaande versies zichtbaar en logbaar, maar moeten bij een inhoudelijke bewerking worden vervangen.

## Zichtbaarheid en autorisatie

- Privé is de standaard.
- De maker kan privé naar publiek en publiek naar privé wijzigen.
- Publieke recepten zijn zonder login leesbaar.
- De display name van de maker wordt getoond; e-mail wordt nooit gepubliceerd. Zonder display name toont de UI `Anonieme maker`.
- Alleen de maker kan wijzigen, archiveren of herstellen.
- Een privé of gearchiveerd recept levert voor onbevoegden dezelfde neutrale 404 op als een onbekend recept.
- Publieke recepten van anderen mogen in de Calorie Tracker worden gezocht en gelogd.

## Archiveren en herstellen

- `Verwijderen` wordt in de UX `Archiveren`.
- Archiveren verwijdert geen stam, versie of relatie.
- Een gearchiveerd recept verdwijnt uit openbare lijsten, eigen standaardlijsten en nieuwe gerechtkeuzes.
- Een directe publieke URL toont een verzorgde 404-pagina.
- Bestaande logs blijven naam, porties en voedingsberekening tonen, maar linken niet meer naar het recept.
- Herstellen gebruikt de zichtbaarheid van vóór archiveren.

## Cross-app gedrag

- Calorie Tracker bevat geen receptaanmaak- of beheerformulier meer.
- Calorie Tracker zoekt bestaande private eigen en publieke recepten als gerechten.
- Bij een gerecht kan `Recept bekijken` naar de canonieke receptenroute navigeren.
- De recepten-app bevat geen actie `Dit gerecht loggen` in de MVP.
- Beide clients gebruiken dezelfde backend, sessie en gebruikersidentiteit.

## Should have — na MVP

- Persoonlijke aanbevelingen op basis van uitsluitend de eigen consumptielogs.
- Kandidaten zijn eigen privé/publieke recepten en publieke recepten van anderen; nooit privédata van anderen.
- Optioneel tonen hoe vaak en op welke dagen gerechten zijn gegeten.
- Geen algemene populariteitsranking of gebruik van consumptielogs van andere gebruikers.

## Acceptatiecriteria

### AC-01 — Publieke ingang

Gegeven een bezoeker zonder sessie
Wanneer die `/recepten` opent
Dan ziet die publieke recepten, nieuwste eerst, met zoeken en filters
En ziet die geen link `Mijn recepten`.

### AC-02 — Mijn recepten

Gegeven een ingelogde gebruiker
Dan is `Mijn recepten` zichtbaar en linkt naar `/recepten/gebruiker/<eigenUserId>`
En ziet de eigenaar daar publieke en privé-recepten.

### AC-03 — Recept maken

Gegeven een ingelogde gebruiker met naam, positief aantal porties en minimaal één actief consumptieproduct
Wanneer die opslaat
Dan ontstaan één dishstam en één immutable versie
En is de standaardzichtbaarheid privé.

### AC-04 — Versiegrens

Gegeven een bestaand recept
Wanneer ingrediënten, hoeveelheden, porties of instructies wijzigen
Dan ontstaat een nieuwe versie
Maar een naamswijziging corrigeert de live stam zonder nieuwe inhoudsversie.

### AC-05 — Autorisatie zonder datalek

Gegeven een privé of gearchiveerd recept
Wanneer een andere gebruiker of anonieme bezoeker de URL opent
Dan toont de app een neutrale 404 zonder bestaan of maker te bevestigen.

### AC-06 — Archiefhistorie

Gegeven een gearchiveerd recept met bestaande consumptielogs
Dan verdwijnt het uit nieuwe keuzes
Maar blijven bestaande logs leesbaar en berekenbaar zonder receptlink.

### AC-07 — Geen voeding in recepten-app

Gegeven een recept met producten en macroprofielen
Dan toont de recepten-app geen calorieën of macro's
En kan de Calorie Tracker dezelfde gegevens wel live voor gerechtlogs berekenen.
