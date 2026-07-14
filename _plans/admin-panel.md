# Plan: Admin Panel (Next.js)

## Context
De gebruiker wil een admin panel in een nieuwe app `apps/admin_panel` (naast `calory_tracker` en `backend`) waarmee brands, units, consumpties en producten beheerd kunnen worden via een webinterface op `{url}:3001/admin`.

De backend heeft al services + repositories voor alle vier entiteiten, maar mist nog POST/PUT/DELETE routes voor consumptions, units en products.

---

## Deel 1 — Backend: ontbrekende mutatie-routes toevoegen

De services en repositories bestaan al volledig — alleen de routes moeten worden uitgebreid.

### 1a. CORS uitbreiden
**`apps/backend/src/app.ts`**
- Verander `origin: process.env.CORS_ORIGIN || '...'` naar een array die kommagescheiden waarden ondersteunt:
  ```ts
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3001').split(','),
  ```

### 1b. `apps/backend/src/routes/consumptions.ts`
Voeg toe (modeled naar `brands.ts`):
- `POST /consumptions` → `createNewConsumption(body)`
- `PUT /consumptions/:id` → `updateExistingConsumption(id, body)`
- `DELETE /consumptions/:id` → `removeConsumption(id)`

### 1c. `apps/backend/src/routes/units.ts`
Voeg toe:
- `POST /units` → `createNewUnit(body)`
- `PUT /units/:id` → `updateExistingUnit(id, body)`
- `DELETE /units/:id` → `removeUnit(id)`

### 1d. `apps/backend/src/routes/products.ts`
Voeg toe:
- `POST /products` → `createNewProduct(body)`
- `PUT /products/:id` → `updateExistingProduct(id, body)`
- `DELETE /products/:id` → `removeProduct(id)`

---

## Deel 2 — Nieuwe app: `apps/admin_panel`

**Tech stack:** Next.js 15 (App Router), React 19, TypeScript, plain CSS (geen extra UI library)

### Bestandsstructuur
```
apps/admin_panel/
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env.local                        # NEXT_PUBLIC_API_URL=http://localhost:3000
└── src/
    ├── app/
    │   ├── globals.css               # Admin styling (sidebar, table, modal, forms)
    │   ├── layout.tsx                # Root layout
    │   ├── page.tsx                  # Redirect → /admin
    │   └── admin/
    │       ├── layout.tsx            # Sidebar navigatie
    │       ├── page.tsx              # Dashboard (links naar secties)
    │       ├── brands/page.tsx
    │       ├── units/page.tsx
    │       ├── consumptions/page.tsx
    │       └── products/page.tsx
    ├── components/
    │   └── SimpleEntityPage.tsx      # Herbruikbaar CRUD-component voor enkelvoudige entiteiten
    └── lib/
        └── api.ts                    # Fetch-client voor alle endpoints
```

### Pagina's & componenten

#### `src/lib/api.ts`
Typed fetch-wrapper voor: `brands`, `units`, `consumptions`, `products` (getAll, getById, create, update, delete).

#### `src/components/SimpleEntityPage.tsx` (client component)
Herbruikbaar component voor entiteiten met één tekstveld (brands → `name`, units → `type`, consumptions → `name`):
- Tabel met lijst + Bewerken / Verwijderen knoppen
- Modal met een enkel inputveld voor toevoegen/bewerken
- Props: `title`, `apiPath`, `fieldKey`, `fieldLabel`

Gebruikt door: `brands/page.tsx`, `units/page.tsx`, `consumptions/page.tsx`

#### `admin/products/page.tsx` (client component, custom)
Complexer formulier met dropdown-velden die data ophalen van `/brands`, `/consumptions`, `/units`:
- `brandId` → dropdown
- `consumptionsId` → dropdown
- `servingContent` → number input
- `servingUnitId` → dropdown
- `content` → number input
- `contentunitId` → dropdown

#### `admin/layout.tsx`
Sidebar met navigatielinks:
- Merken (`/admin/brands`)
- Eenheden (`/admin/units`)
- Consumpties (`/admin/consumptions`)
- Producten (`/admin/products`)

### Port & scripts
- Dev: `next dev -p 3001`
- Start: `next start -p 3001`

---

## Kritieke bestanden

| Bestand | Actie |
|---|---|
| `apps/backend/src/app.ts` | CORS aanpassen |
| `apps/backend/src/routes/consumptions.ts` | POST/PUT/DELETE toevoegen |
| `apps/backend/src/routes/units.ts` | POST/PUT/DELETE toevoegen |
| `apps/backend/src/routes/products.ts` | POST/PUT/DELETE toevoegen |
| `apps/admin_panel/` (nieuw) | Volledige Next.js app aanmaken |

---

## Verificatie
1. `pnpm install` in root om admin_panel dependencies te installeren
2. Backend starten: `pnpm backend:dev`
3. Admin panel starten: `pnpm --filter admin_panel dev`
4. Navigeer naar `http://localhost:3001/admin`
5. Test CRUD voor alle 4 entiteiten via de UI
