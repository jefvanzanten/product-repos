# Spec-index — Calorie Tracker doelmodel

## Doel

De Calorie Tracker registreert consumpties en toont calorie- en macrototalen. Receptbeheer hoort exclusief bij de [Recepten-app](../recipe/recipe-app-spec.md); deze client noemt een geselecteerd recept een `gerecht`.

## Specs

| Feature | Functionele spec | UI-specificatie |
| --- | --- | --- |
| Caloriestatistieken en doelen | [dashboard/calorien-statestieken.md](./dashboard/calorien-statestieken.md) | [dashboard/calorien-statestieken-ui-specificatie.md](./dashboard/calorien-statestieken-ui-specificatie.md) |
| Consumptielogboek | [logs/log-overzicht.md](./logs/log-overzicht.md) | [logs/log-overzicht-ui-specificatie.md](./logs/log-overzicht-ui-specificatie.md) |
| Consumptielog toevoegen | [logs/log-toevoegen.md](./logs/log-toevoegen.md) | [logs/log-toevoegen-ui-specificatie.md](./logs/log-toevoegen-ui-specificatie.md) |
| Logdetail en mutaties | [logs/log-detail-bewerken.md](./logs/log-detail-bewerken.md) | [logs/log-detail-bewerken-ui-specificatie.md](./logs/log-detail-bewerken-ui-specificatie.md) |

De oude [gerecht-aanmaakflow](./gerechten/gerecht-aanmaken.md) is na de extractie geen Calorie Tracker-feature meer.

## Autorisatie

- De volledige app vereist authenticatie.
- Iedere gebruiker ziet alleen eigen logs en doelen.
- De beheerdersrol verleent alleen catalogusnavigatie en geen toegang tot persoonlijke data van anderen.
- Definitief ontbrekende of ingetrokken sessies redirecten naar `/calorie-tracker/login` met een gevalideerd intern terugkeerpad.

## Routes

De app blijft gemount onder `/calorie-tracker`.

| Bestemming | App-interne route |
| --- | --- |
| Caloriestatistieken | `/?date=YYYY-MM-DD` |
| Consumptielogboek | `/logs?date=YYYY-MM-DD&type=all` |
| Consumptielog toevoegen | `/logs/new?date=YYYY-MM-DD&type=all` |
| Consumptielog bewerken | `/logs/:logId/edit?date=YYYY-MM-DD&type=all` |

`/logs/new/dish` wordt na één compatibiliteitsrelease verwijderd of redirect naar `/recepten/nieuw`; er bestaat geen terugkeer-met-selectieflow in de MVP.

## Cross-app navigatie

- Een gewone link `Recepten` opent `/recepten`; zij is geen aparte bottom-tab in de MVP.
- Een gerechtlog of geselecteerd gerecht mag `Recept bekijken` tonen en naar `/recepten/gebruiker/:userId/:recipeId` navigeren.
- Bij een eigen recept kan de gebruiker daar vervolgens bewerken.
- Bij privé maken of archiveren verdwijnt de link voor anderen; historische logs blijven zonder link leesbaar.
- Product Management Admin blijft voor beheerders `/product-management-admin/product-catalogus?source=calorie-tracker`.

## Catalogus en zoeken

- Productresultaten zijn concrete actieve `product`-records; `product_package` is geen selectieniveau meer.
- Productweergave gebruikt de gedeelde formattering met merk, naam, verpakkingstype en inhoud.
- Zoekresultaten voor gerechten bevatten eigen actieve private/publieke recepten en actieve publieke recepten van anderen.
- De Calorie Tracker kan geen recept aanmaken, bewerken, archiveren of herstellen.
- Productlogs ondersteunen volledig product, optionele productportie en compatibele inhoudseenheid.
- Gerechtlogs gebruiken een decimaal aantal receptporties.

## Bron van waarheid

- Productlogs verwijzen naar `product.id`; gerechtlogs pinnen een `dish_version`.
- Receptstructuur van een oud log blijft gepind.
- Namen, productgegevens en macroprofielen blijven live en zijn geen snapshot; correcties werken direct door in historische logs en statistieken.
- Gearchiveerde producten of recepten blijven in bestaande logs leesbaar en berekenbaar.
- Nieuwe selecties sluiten gearchiveerde data uit.
- Consumptielogs wijzigen voorraad niet automatisch.

## Buiten scope

- Receptbeheer in deze client.
- Automatische terugkeer/selectie na receptaanmaak.
- Automatische voorraadmutaties.
- Vrije calorie-only logs.
- Receptaanbevelingen; die horen na MVP bij de recepten-app.

## Acceptatiecriteria

### AC-01 — Extractie

Gegeven de log-toevoegenflow
Dan bestaat daarin geen formulier of actie om een gerecht aan te maken
En kan de gebruiker via `Recepten` de afzonderlijke app openen.

### AC-02 — Concrete producten

Gegeven productzoeken
Dan retourneert ieder resultaat één concreet product-ID
En geen combinatie van root-product plus package-ID.

### AC-03 — Recept bekijken

Gegeven een toegankelijk gerecht
Wanneer de gebruiker `Recept bekijken` kiest
Dan opent de browser de canonieke receptenroute.

### AC-04 — Live correcties

Gegeven een macro- of naamcorrectie in de catalogus
Dan gebruiken bestaande logs en statistieken de actuele waarde
Terwijl een gerechtlog zijn gepinde receptstructuur behoudt.
