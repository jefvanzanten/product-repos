# Calorie Tracker

Een zelfstandige, server-side gerenderde React Router-app voor het registreren van consumpties en het vergelijken van calorie- en macrototalen met persoonlijke doelen.

## Functionaliteit

- caloriestatistieken voor een geselecteerde kalenderdag;
- persoonlijke calorie- en macrodoelen;
- consumptielogboek met filters voor voeding, drinken en supplementen;
- consumpties toevoegen, bekijken, bewerken, verwijderen en herstellen;
- zoeken in actieve productverpakkingen uit de gedeelde catalogus;
- beheerderslink naar de zelfstandige Product Management Admin-app.

Iedere gebruiker ziet uitsluitend de eigen logs en doelen. De productcatalogus blijft de actuele bron voor product-, verpakkings- en voedingsgegevens.

## Routes

Productie: <https://apps.jefvanzanten.dev/calorie-tracker>

De React Router-`basename` is `/calorie-tracker`.

| Publieke route | Doel |
| --- | --- |
| `/calorie-tracker` | Dagstatistieken |
| `/calorie-tracker/logs` | Consumptielogboek |
| `/calorie-tracker/logs/new` | Consumptie toevoegen |
| `/calorie-tracker/logs/:logId` | Logdetail |
| `/calorie-tracker/logs/:logId/edit` | Consumptie bewerken |
| `/calorie-tracker/login` | Inloggen |

Beheerders openen Product Management Admin via `/product-management-admin/product-catalogus?source=calorie-tracker`.

## Lokale ontwikkeling

De lokale app gebruikt standaard de lokale backend op `http://localhost:3000`. Lokale ontwikkeling en productiegegevens blijven gescheiden.

```bash
corepack pnpm --filter @product-repos/backend dev
corepack pnpm --filter calorie_tracker dev
```

Open daarna <http://localhost:5173/calorie-tracker>.

Relevante lokale configuratie staat in `apps/calorie_tracker/.env`. Gebruik `apps/calorie_tracker/.env.example` als uitgangspunt en commit geen nieuwe geheimen.

## Verificatie

```bash
corepack pnpm --filter calorie_tracker typecheck
corepack pnpm --filter calorie_tracker test -- --run
corepack pnpm --filter calorie_tracker build
corepack pnpm --filter calorie_tracker exec playwright test
```

De app gebruikt gedeelde authenticatie uit `packages/auth-client`, API-contracten uit `packages/contracts` en de applicatieshell uit `packages/shared`.

## Specificaties

- [Algemene Calorie Tracker-specificatie](../../docs/specs/calorie-tracker/calorie-tracker-specificatie.md)
- [Dashboard en caloriestatistieken](../../docs/specs/calorie-tracker/dashboard/calorien-statestieken.md)
- [Consumptielogboek](../../docs/specs/calorie-tracker/logs/log-overzicht.md)
- [Consumptielog toevoegen](../../docs/specs/calorie-tracker/logs/log-toevoegen.md)
- [Logdetail en bewerken](../../docs/specs/calorie-tracker/logs/log-detail-bewerken.md)

## Deployment

Coolify bouwt vanuit de repository-root met:

```text
apps/calorie_tracker/Dockerfile
```

De resource kijkt uitsluitend naar wijzigingen in:

- `apps/calorie_tracker/**`;
- `packages/auth-client/**`;
- `packages/contracts/**`;
- `packages/shared/**`;
- gedeelde workspace- en buildbestanden.
