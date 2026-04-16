# Acceptance Criteria – Consumption Log Lijst Weergave

## Context
De consumption log lijst op het hoofdscherm toont alleen de logs van vandaag, gesorteerd op tijd. Elk item toont de tijd vooraan, gevolgd door de consumptienaam en hoeveelheid + eenheid. Datum en merknaam worden niet getoond.

---

## Acceptance Criteria

**Sortering**
- Given er meerdere logs van vandaag zijn
- Then worden deze gesorteerd op tijd **ascending** (vroegste bovenaan)

**Filteren op vandaag**
- Given er consumption logs aanwezig zijn
- Then worden alleen logs getoond waarvan de timestamp op de huidige datum valt
- And worden logs van eerdere dagen niet getoond

**Weergave van een log item**
- Given er logs van vandaag aanwezig zijn
- Then toont elk item de **tijd** vooraan als label (bijv. "09:30")
- And toont elk item de **consumptienaam** (bijv. "Koffie")
- And toont elk item de **hoeveelheid** gevolgd door de **eenheidsnaam** (bijv. "250 ml")
- And wordt de **datum niet** getoond
- And wordt de **merknaam niet** getoond
- And worden **geen ruwe ID-nummers** getoond aan de gebruiker

**Lege staat**
- Given er vandaag nog geen consumption logs zijn
- Then wordt een lege-staat melding getoond (bijv. "Nog geen logs geregistreerd.")

---

## Vereiste wijzigingen

### Backend
De `GET /consumption-logs` response bevat de volgende relaties (reeds geïmplementeerd):
- `consumption.name` — consumptienaam
- `unit.type` — eenheidsnaam
- `brand` — beschikbaar maar niet weergegeven in de UI

### Frontend (`Dashboard.tsx`)
Layout per log item:

```
[tijd]   [consumptienaam]   [hoeveelheid] [eenheid]
```

Voorbeeld:
```
09:30   Koffie   250 ml
```

- `logs` gefilterd op `new Date(log.timestamp).toDateString() === new Date().toDateString()`
- Gesorteerd op timestamp **ascending** (vroegste tijd bovenaan)
- Tijd geformatteerd met `toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })`

---

## Test Plan

### Backend (Bun test runner)

| # | Scenario | Verwacht |
|---|----------|----------|
| 1 | `GET /consumption-logs` response structuur | Elk item bevat `consumption`, `unit` en `brand` |
| 2 | `GET /consumption-logs` met gemockte data | `consumption.name` en `unit.type` aanwezig in response |

### Frontend (Vitest + Testing Library)

| # | Scenario | Verwacht |
|---|----------|----------|
| 1 | Alleen logs van vandaag worden getoond | Log met timestamp van gisteren is niet zichtbaar |
| 2 | Log item rendert tijd vooraan | Tijdlabel (bijv. "09:30") zichtbaar als eerste element |
| 3 | Log item rendert consumptienaam | Tekst "Koffie" zichtbaar in het item |
| 4 | Log item rendert hoeveelheid + eenheid | Tekst "250 ml" zichtbaar |
| 5 | Datum en merknaam niet zichtbaar | Geen datumstring en geen merknaam in de DOM |
