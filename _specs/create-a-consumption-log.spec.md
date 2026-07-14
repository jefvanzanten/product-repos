# Acceptance Criteria – Add Consumption Log

**Openen van modal**
- Given de gebruiker zich in het hoofdscherm bevindt
- When de gebruiker op de “+” (FAB) knop rechtsonder klikt
- Then wordt de Add Consumption Log modal geopend

**Product zoeken (autocomplete)**
- Given de modal geopend is
- When de gebruiker tekst invoert in het productnaam veld
- Then wordt de invoer realtime gebruikt om producten op te zoeken
- And worden relevante suggesties weergegeven onder het invoerveld
- When de gebruiker een suggestie selecteert
- Then wordt deze ingevuld als gekozen product

**Hoeveelheid invoeren**
- Given de modal geopend is
- Then is er een invoerveld zichtbaar voor de hoeveelheid
- And is er rechts van het hoeveelheid veld een dropdown zichtbaar
- Where de gebruiker een unit type kan selecteren (bijv. ml, gram, stuk)

**Datum en tijd invoeren**
- Given de modal geopend is
- Then is er een datumveld zichtbaar
- And is de huidige datum standaard ingevuld
- And is er een optie beschikbaar om een tijd te selecteren

**Validatie en opslaan**
- When de gebruiker op de “Voeg toe” knop klikt
- Then wordt geprobeerd een nieuw record toe te voegen aan de consumption_log tabel
- If verplichte velden ontbreken of ongeldige waarden bevatten
- Then wordt een duidelijke validatiefout getoond per veld
- If alle invoer geldig is
- Then wordt het record succesvol opgeslagen
- And wordt de modal gesloten
- And wordt de gebruiker visueel bevestigd (bijv. toast of melding)
- Given een consumptie succesvol is toegevoegd
- Then wordt het overzicht van consumptielogs op het hoofdscherm bijgewerkt
- And is de nieuw toegevoegde consumptie zichtbaar in de lijst

---

## Test Plan

### Backend (Bun test runner) — `apps/backend/tests/consumptionLogs.test.ts`

| # | Scenario | Verwacht |
|---|----------|----------|
| 1 | `GET /consumption-logs` | 200 + lege array |
| 2 | `POST /consumption-logs` met geldige data (productId, amount, unitsId, timestamp) | 201 + log-object |
| 3 | `POST /consumption-logs` zonder `productId` | 422 met `error.message = 'Validatiefout'` |
| 4 | `POST /consumption-logs` zonder `unitsId` | 422 |

Strategie: DB gemockt via `mock.module`, app getest via `app.request()`.

### Frontend (Vitest + Testing Library) — `apps/calory_tracker/src/components/AddConsumptionLogModal.test.tsx`

| # | Scenario | Verwacht |
|---|----------|----------|
| 1 | Modal rendert | Product-veld, hoeveelheid-veld, eenheid-dropdown, datetime-veld en "Voeg toe"-knop aanwezig |
| 2 | Lege submit | Per-veld foutmeldingen: "Kies een product", "Voer een geldige hoeveelheid in", "Kies een eenheid" |
| 3 | Product zoeken & selecteren | Typen filtert de lijst; klikken op suggestie vult het veld met productnaam |
| 4 | Succesvol opslaan | `onSuccess` callback aangeroepen na gemockte API-call |
| 5 | Modal overlay aanwezig | Titel "Consumptie toevoegen" zichtbaar bij mounten |

Strategie: API gemockt via `vi.mock('../api/client')`, elke test in een verse `QueryClient`.