# Plan: Implementatie Create Consumption Log

## Context
De spec `_specs/create-a-consumption-log.spec.md` beschrijft een feature waarmee eindgebruikers een consumptie-log kunnen toevoegen vanuit de `consumption_logger` app (Vite + React SPA). De gebruiker klikt op een FAB-knop rechtsonder, waarna een modal verschijnt met product-autocomplete, hoeveelheid + eenheid, datum/tijd, validatie en een toast bij succes.

De database-tabel (`consumption_logs`) en Zod-schemas (`consumptionLogs.ts`) bestaan al, maar de API-laag ontbreekt volledig en de frontend heeft nog geen UI voor logs.

Na het toevoegen moet het overzicht van consumption logs op het hoofdscherm automatisch bijgewerkt worden en de nieuwe log zichtbaar zijn. Dit wordt gerealiseerd met **TanStack Query** (`@tanstack/react-query`) voor data-fetching en cache-invalidatie.

---

## Implementatiestappen

### 1. Contracts package – types exporteren
**Bestand:** `packages/contracts/src/index.ts`
- Voeg exports toe voor `consumptionLogSelectSchema`, `consumptionLogInsertSchema`, `consumptionLogUpdateSchema`, `consumptionLogsWithRelationsSchema`
- Voeg type-exports toe: `ConsumptionLog`, `CreateConsumptionLogInput`, `UpdateConsumptionLogInput`, `ConsumptionLogWithRelations`

### 2. Backend – Repository
**Nieuw bestand:** `apps/backend/src/repositories/consumptionLogs.repository.ts`
- `createConsumptionLog(input: CreateConsumptionLogInput)` – insert + returning
- `findAllConsumptionLogs()` – select met join op products en unitType
- Patroon volgt `products.repository.ts` (Drizzle ORM, `db.insert/select`)

### 3. Backend – Service
**Nieuw bestand:** `apps/backend/src/services/consumptionLogs.service.ts`
- `createNewConsumptionLog(input)` – delegeert naar repository
- `getAllConsumptionLogs()` – delegeert naar repository
- Patroon volgt `products.service.ts`

### 4. Backend – Routes
**Nieuw bestand:** `apps/backend/src/routes/consumptionLogs.ts`
- `POST /consumption-logs` → 201 met het aangemaakte log
- `GET /consumption-logs` → 200 met alle logs
- Foutafhandeling: 404 bij niet-gevonden, Hono's onError voor overige fouten
- Patroon volgt `products.ts` route-bestand

### 5. Backend – Route registratie
**Bestand:** `apps/backend/src/app.ts`
- Importeer en registreer `consumptionLogRoutes()` via `app.route('/', consumptionLogRoutes())`

### 6. Consumption Logger – TanStack Query instellen
- Installeer `@tanstack/react-query` in `apps/consumption_logger`
- **Bestand:** `apps/consumption_logger/src/main.tsx` – wrap `<App>` in `<QueryClientProvider client={queryClient}>`

### 7. Consumption Logger – API Client
**Bestand:** `apps/consumption_logger/src/api/client.ts`
- Voeg een `post<T>()` helper toe (analoog aan bestaande `get<T>()`)
- Voeg `consumptionLogs.getAll()` toe → `GET /consumption-logs`
- Voeg `consumptionLogs.create(input)` toe → `POST /consumption-logs`
- Importeer `CreateConsumptionLogInput`, `ConsumptionLog`, `ConsumptionLogWithRelations` uit `@product-repos/contracts`

### 8. Consumption Logger – TanStack Query hooks
**Nieuw bestand:** `apps/consumption_logger/src/hooks/useConsumptionLogs.ts`
- `useQuery({ queryKey: ['consumption-logs'], queryFn: api.consumptionLogs.getAll })`
- Exporteert `{ logs, isLoading, error }`

**Nieuw bestand:** `apps/consumption_logger/src/hooks/useUnits.ts`
- Zelfde patroon: `useQuery({ queryKey: ['units'], queryFn: api.units.getAll })`
- Exporteert `{ units, isLoading }`

### 9. Consumption Logger – AddConsumptionLogModal component
**Nieuw bestand:** `apps/consumption_logger/src/components/AddConsumptionLogModal.tsx`

Bevat:
- **ProductAutocomplete** (inline): tekstveld met realtime filtering op `products`, dropdown met suggesties, toetsenbordnavigatie (pijlen/Enter/Escape)
- **Hoeveelheidsveld:** `<input type="number">` voor `amount`
- **Eenheden-dropdown:** `<select>` gevuld via `useUnits` hook
- **Datumveld:** `<input type="datetime-local">` met standaard de huidige datum/tijd
- **Validatie:** per-veld foutmeldingen bij ontbrekende/ongeldige waarden
- **Submit:** `useMutation` van TanStack Query → `api.consumptionLogs.create()`
  - `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['consumption-logs'] })` + `onSuccess()` callback + modal sluiten
- **Props:** `{ isOpen, onClose, products, onSuccess }`

### 10. Consumption Logger – Consumption Log lijst op Dashboard
**Bestand:** `apps/consumption_logger/src/pages/Dashboard.tsx`
- Gebruik `useConsumptionLogs()` hook om de lijst op te halen
- Toon een `ConsumptionLogList` sectie onder de productlijst (of als aparte sectie op het hoofdscherm)
- FAB-knop: `position: fixed; bottom: 24px; right: 24px` met `+` label
- State: `showModal` (boolean) + `toastMessage` (string | null)
- `onSuccess` callback: toast tonen ("Consumptie toegevoegd!") — de lijst ververst automatisch via query-invalidatie
- Eenvoudige inline toast (auto-verdwijnt na 3s via `setTimeout`)

---

## Tests

### Backend tests (Bun test runner)
**Nieuw bestand:** `apps/backend/tests/consumptionLogs.test.ts`

| Test | Verwacht resultaat |
|------|--------------------|
| `POST /consumption-logs` met geldige data | 201 + log-object teruggegeven |
| `POST /consumption-logs` zonder `productId` | 400/422 validatiefout |
| `POST /consumption-logs` zonder `unitsId` | 400/422 validatiefout |
| `GET /consumption-logs` | 200 + array |

Strategie: `mock.module('../src/db/index', ...)` om de echte DB te mocken, exact zoals `example.test.ts`. App via `createApp()` aanroepen en `app.request()` gebruiken.

### Frontend tests (Vitest + Testing Library)
**Setup vereist in `consumption_logger`:**
- Installeer `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- Voeg `vitest.config.ts` toe met `environment: 'jsdom'`
- Voeg `test` script toe in `package.json`: `"test": "vitest"`
- Wrap test renders in `QueryClientProvider` (fresh `QueryClient` per test)

**Nieuw bestand:** `apps/consumption_logger/src/components/AddConsumptionLogModal.test.tsx`

| Test | Beschrijving |
|------|--------------|
| Rendert correct | Modal toont product-veld, hoeveelheid-veld, eenheid-dropdown, datum-veld en submit-knop |
| Validatie – lege submit | Toont per-veld foutmeldingen bij ontbrekende waarden |
| Product selecteren | Typen in autocomplete-veld filtert producten; klikken op suggestie vult het veld |
| Succesvol opslaan | `onSuccess` callback aangeroepen + `invalidateQueries` getriggerd na gemockte API-call |
| Lijst bijgewerkt | Na succesvolle submit verschijnt de nieuwe log in de `useConsumptionLogs` query (gemockte response) |

---

## Linting
- Backend: `pnpm --filter @product-repos/backend lint`
- Consumption Logger: `pnpm --filter consumption_logger lint`

---

## Verificatie (end-to-end)
1. Start de backend: `pnpm --filter @product-repos/backend dev`
2. Start de consumption_logger: `pnpm --filter consumption_logger dev`
3. Ga naar `http://localhost:5173`
4. Klik op de FAB-knop rechtsonder → modal opent
5. Typ een productnaam → autocomplete toont suggesties → selecteer een product
6. Vul hoeveelheid en eenheid in, controleer datum
7. Klik "Voeg toe" → modal sluit, toast verschijnt
8. Controleer of de nieuwe log direct zichtbaar is in de lijst op het hoofdscherm (automatische refresh via TanStack Query)
9. Validatie: submit met leeg formulier → foutmeldingen per veld

---

## Kritieke bestanden

| Bestand | Actie |
|---------|-------|
| `packages/contracts/src/index.ts` | Wijzigen – exports toevoegen |
| `apps/backend/src/repositories/consumptionLogs.repository.ts` | Nieuw |
| `apps/backend/src/services/consumptionLogs.service.ts` | Nieuw |
| `apps/backend/src/routes/consumptionLogs.ts` | Nieuw |
| `apps/backend/src/app.ts` | Wijzigen – route registreren |
| `apps/consumption_logger/src/main.tsx` | Wijzigen – QueryClientProvider toevoegen |
| `apps/consumption_logger/src/api/client.ts` | Wijzigen – post helper + consumptionLogs API |
| `apps/consumption_logger/src/hooks/useConsumptionLogs.ts` | Nieuw – TanStack Query useQuery |
| `apps/consumption_logger/src/hooks/useUnits.ts` | Nieuw – TanStack Query useQuery |
| `apps/consumption_logger/src/components/AddConsumptionLogModal.tsx` | Nieuw – useMutation + invalidateQueries |
| `apps/consumption_logger/src/pages/Dashboard.tsx` | Wijzigen – FAB + modal + toast + log lijst |
| `apps/backend/tests/consumptionLogs.test.ts` | Nieuw |
| `apps/consumption_logger/vitest.config.ts` | Nieuw |
| `apps/consumption_logger/src/components/AddConsumptionLogModal.test.tsx` | Nieuw |
| `_specs/create-a-consumption-log.spec.md` | Wijzigen – test plan toevoegen |
