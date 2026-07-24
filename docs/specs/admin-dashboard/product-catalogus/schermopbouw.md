# Schermopbouw — Productcatalogus MVP

## Documentinformatie

- **Onderdeel:** Admin dashboard
- **Module:** Productcatalogus
- **Status:** Concept
- **Hoofdspecificatie:** [Functionele specificatie](./productcatalogus-specificatie.md)
- **Procesbeschrijving:** [Gebruikersflows](./gebruikersflows.md)
- **Ontwerpfocus:** Mobiel eerst, toepasbaar op desktop/web

## 1. Doel van dit document

Dit document beschrijft de schermen die nodig zijn voor de MVP van de productcatalogus. Het is bedoeld als inhoudelijke basis voor het visuele ontwerp van **Admin Dashboard — Productcatalogus (Mobiel)**.

De exacte kleuren, iconen, typografie, spacing en componentvarianten volgen de bestaande visuele stijl van het admin dashboard. De informatierangorde, labels en schermflows hieronder zijn leidend.

## 2. MVP-principes voor het ontwerp

1. Het startscherm is altijd het **productoverzicht**.
2. Zoeken is nuttig, maar nooit verplicht voordat een beheerder een product kan aanmaken.
3. Op mobiel worden producten als **kaarten** getoond.
4. De primaire actie **Product aanmaken** staat op mobiel sticky onderaan, boven eventuele navigatie.
5. Een nieuw product wordt altijd aangemaakt met minimaal één eerste verpakking.
6. Categorie is verplicht, merk is optioneel.
7. Merk en productnaam blijven gescheiden; de UI toont wel een samengestelde weergavenaam.
8. Merken en categorieën kunnen inline worden aangemaakt zonder het productformulier te verlaten.
9. Categorieën worden één niveau tegelijk aangemaakt.
10. De MVP gebruikt alleen de UI-termen: **categorie**, **merk**, **product** en **verpakking**.

## 3. Buiten scope voor het mobiele MVP-design

Deze onderdelen worden niet getoond in de MVP-schermen:

- barcode/EAN;
- productfoto's;
- productstatussen zoals actief, concept, controle nodig of gepubliceerd;
- archief, verwijderen, herstellen of archiveren;
- voorraad, locaties, minimumaantallen en tellingen;
- apart catalogusdashboard met metrics;
- apart merkenbeheer;
- apart categoriebeheer;
- rollen en rechten binnen deze module;
- bulkimport en bulkexport;
- termen zoals producttype, merkproduct, variant, uitvoering, SKU of publicatiestatus.

## 4. Schermoverzicht MVP

| # | Scherm | Richtinggevende route | Primaire taak |
| --- | --- | --- | --- |
| S01 | Productoverzicht | `/admin/product-catalogus/producten` | Producten vinden, filteren en toevoegen |
| S02 | Lege productcatalogus | dezelfde route | Eerste product aanmaken |
| S03 | Geen zoekresultaat | dezelfde route met zoekterm | Nieuwe productflow bereikbaar houden |
| S04 | Nieuw product | `/admin/product-catalogus/producten/nieuw` | Product plus eerste verpakking aanmaken |
| S05 | Productdetail | `/admin/product-catalogus/producten/:id` | Product en verpakkingen bekijken |
| S06 | Product bewerken | `/admin/product-catalogus/producten/:id/bewerken` | Productgegevens wijzigen |
| S07 | Verpakking toevoegen/bewerken | productdetail of bottom sheet | Verpakking beheren |
| S08 | Nieuwe categorie | bottom sheet vanuit formulier | Eén categorie onder gekozen parent aanmaken |
| S09 | Nieuw merk | bottom sheet vanuit formulier | Merk aanmaken en selecteren |

## 5. S01 — Productoverzicht mobiel

### Doel

De beheerder ziet direct bestaande producten en kan zoeken, filteren of een nieuw product aanmaken.

### Mobiele opbouw

```text
┌──────────────────────────────┐
│ Productcatalogus             │
│ Producten                    │
│                              │
│ [ Zoek product, merk,        │
│   categorie of verpakking ]  │
│                              │
│ [Categorie: Alle ▾] [Merk ▾] │
│                              │
│ Voeding & drinken > Dranken  │
│ > Frisdrank > Cola           │
│ Coca-Cola Zero Sugar       ›  │
│ Merk: Coca-Cola              │
│ fles 1,5 l                   │
│                              │
│ Voeding & drinken > Dranken  │
│ > Frisdrank > Cola           │
│ Coca-Cola Cherry Zero      ›  │
│ Merk: Coca-Cola              │
│ blik 330 ml                  │
│                              │
│ Voeding & drinken > Sauzen   │
│ & smaakmakers > Tafelsauzen  │
│ > Satésaus                   │
│ Remia Satésaus kant-en-    › │
│ klaar                        │
│ Merk: Remia                  │
│ pot 500 g                    │
│                              │
│ Voeding & drinken > Dranken  │
│ > Koffie & thee >            │
│ Koffiecapsules               │
│ Nescafé Dolce Gusto Lungo  › │
│ Merk: Nescafé Dolce Gusto    │
│ doos met 16 capsules         │
│                              │
│      [ Product aanmaken ]    │ sticky
└──────────────────────────────┘
```

### Onderdelen

1. **Paginakop**
   - titel `Productcatalogus` of `Producten` volgens bestaande admin-stijl;
   - korte context mag, maar geen dashboard-metrics.
2. **Zoekveld**
   - placeholder: `Zoek product, merk, categorie of verpakking`;
   - zoekt op productnaam, weergavenaam, merk, categoriepad en verpakkingsomschrijving.
3. **Filters**
   - `Categorie`;
   - `Merk`;
   - geen statusfilter.
4. **Productkaarten**
   - categoriepad of eindcategorie;
   - samengestelde productnaam;
   - merkregel alleen wanneer merk bestaat;
   - verpakkingssamenvatting;
   - tap-indicator naar productdetail.
5. **Sticky primaire actie**
   - label: `Product aanmaken`;
   - blijft onderaan bereikbaar;
   - mag content niet onbereikbaar maken.

## 6. S02 — Lege productcatalogus mobiel

### Doel

De eerste invoer starten zonder verplichte zoek- of beheerflow.

### Opbouw

```text
┌──────────────────────────────┐
│ Productcatalogus             │
│ Producten                    │
│                              │
│ Nog geen producten           │
│ Voeg je eerste product toe   │
│ om de catalogus op te bouwen.│
│                              │
│ Je kiest of maakt categorieën│
│ en merken tijdens het        │
│ toevoegen.                   │
│                              │
│ [ Eerste product aanmaken ]  │
└──────────────────────────────┘
```

### Gedrag

- `Eerste product aanmaken` opent direct S04.
- Er is geen verplichte zoekstap.
- Verpakkingstypen, inhoudseenheden en eenheidsoorten mogen als vaste keuzelijsten bestaan.

## 7. S03 — Geen zoekresultaat mobiel

### Doel

Duidelijk maken dat niets is gevonden, maar productaanmaak beschikbaar houden.

### Opbouw

```text
┌──────────────────────────────┐
│ Producten                    │
│ [ Remia mayonaise          ] │
│ [Categorie: Alle ▾] [Merk ▾] │
│                              │
│ Geen producten gevonden voor │
│ “Remia mayonaise”.           │
│                              │
│ Pas je zoekterm of filters   │
│ aan, of maak een nieuw       │
│ product aan.                 │
│                              │
│ [ Zoekopdracht wissen ]      │
│                              │
│      [ Product aanmaken ]    │ sticky
└──────────────────────────────┘
```

### Gedrag

- De zoekterm mag als suggestie meegaan naar het productformulier.
- De zoekterm wordt nooit automatisch opgeslagen als productnaam, merk of categorie.

## 8. S04 — Nieuw product mobiel

### Doel

In één formulier een product met eerste verpakking aanmaken. Geen wizard, reviewstap of publicatiestap.

### Opbouw

```text
┌──────────────────────────────┐
│ ‹ Producten                  │
│ Nieuw product                │
│                              │
│ Productgegevens              │
│ Categorie *                  │
│ [ Zoek of kies categorie ▾ ] │
│ [ + Nieuwe categorie ]       │
│ Geselecteerd:                │
│ Voeding & drinken > Dranken  │
│ > Frisdrank > Cola           │
│                              │
│ Merk                         │
│ [ Typ of kies merk ▾       ] │
│ [ + Nieuw merk ]             │
│                              │
│ Productnaam *                │
│ [ Zero Sugar               ] │
│                              │
│ Weergavenaam                 │
│ Coca-Cola Zero Sugar         │
│                              │
│ Eerste verpakking            │
│ Verpakkingstype *            │
│ [ fles ▾                   ] │
│                              │
│ Inhoud                       │
│ [ 1,5       ] [ liter ▾    ] │
│                              │
│ Aantal per verpakking *      │
│ [ 1                       ] │
│                              │
│ Eenheidsoort                 │
│ [ fles ▾                   ] │
│                              │
│ Voorbeeld                    │
│ fles 1,5 l                   │
│                              │
│ [ Annuleren ]                │
│ [ Product opslaan ]          │
└──────────────────────────────┘
```

### Velden en regels

#### Productgegevens

- `Categorie *` is verplicht.
- `Merk` is optioneel.
- `Productnaam *` is verplicht.
- `Weergavenaam` wordt live opgebouwd uit merk + productnaam, of alleen productnaam bij merkloos product.
- Als de productnaam de merknaam lijkt te bevatten, toont het formulier een waarschuwing:

```text
De productnaam lijkt de merknaam al te bevatten. Gebruik bijvoorbeeld “Zero Sugar” als productnaam.
```

#### Eerste verpakking

- `Verpakkingstype *` is verplicht.
- `Inhoudshoeveelheid` is optioneel.
- `Inhoudseenheid` is verplicht als inhoudshoeveelheid is ingevuld.
- `Aantal per verpakking *` is verplicht en standaard `1`.
- `Eenheidsoort` is verplicht wanneer aantal per verpakking groter is dan `1` of wanneer de verpakking telbaar is.
- `Voorbeeld` wordt live bijgewerkt.
- Geen barcodeveld.

### Voorbeelden verpakkingsweergave

```text
fles 1,5 l
blik 330 ml
pot 500 g
doos met 16 capsules
multipack 6 × 330 ml blik
```

## 9. S04a — Formulier met validatie- of duplicaatfout

### Opbouwvoorbeeld

```text
Productnaam *
[ Coca-Cola Zero Sugar ]
Dit product bestaat al binnen deze categorie en dit merk.

Eerste verpakking
Deze verpakking bestaat al bij dit product.
```

### Regels

- Fouten staan direct onder het relevante veld.
- Bij meerdere fouten mag bovenaan een korte samenvatting verschijnen.
- Ingevoerde gegevens blijven behouden.
- Opslaan is niet mogelijk zolang blokkerende fouten bestaan.

## 10. S05 — Productdetail mobiel

### Doel

De beheerder bekijkt productidentiteit en beheert verpakkingen.

### Opbouw

```text
┌──────────────────────────────┐
│ ‹ Producten                  │
│ Coca-Cola Zero Sugar         │
│ Voeding & drinken > Dranken  │
│ > Frisdrank > Cola           │
│                              │
│ Merk                         │
│ Coca-Cola                    │
│                              │
│ Productnaam                  │
│ Zero Sugar                   │
│                              │
│ [ Product bewerken ]         │
│                              │
│ Verpakkingen                 │
│ fles 1,5 l                 › │
│ blik 330 ml                › │
│ multipack 6 × 330 ml blik  › │
│                              │
│ [ Verpakking toevoegen ]     │
└──────────────────────────────┘
```

### Onderdelen

- weergavenaam als titel;
- categoriepad;
- merk, alleen als het product een merk heeft;
- productnaam;
- alle verpakkingen;
- actie `Product bewerken`;
- actie `Verpakking toevoegen`.

Geen status, barcode of archiefacties in MVP.

## 11. S06 — Product bewerken mobiel

### Doel

Categorie, merk en productnaam wijzigen zonder verpakkingsgegevens aan te passen.

### Opbouw

```text
┌──────────────────────────────┐
│ ‹ Coca-Cola Zero Sugar       │
│ Product bewerken             │
│                              │
│ Categorie *                  │
│ [ ...                      ] │
│                              │
│ Merk                         │
│ [ Coca-Cola ▾              ] │
│                              │
│ Productnaam *                │
│ [ Zero Sugar               ] │
│                              │
│ Weergavenaam                 │
│ Coca-Cola Zero Sugar         │
│                              │
│ Gekoppelde verpakkingen      │
│ 3 verpakkingen               │
│                              │
│ [ Annuleren ]                │
│ [ Wijzigingen opslaan ]      │
└──────────────────────────────┘
```

### Gedrag

- Duplicaatcontrole wordt opnieuw toegepast.
- Verpakkingen worden alleen als samenvatting getoond.
- Verpakkingsvelden worden niet op dit scherm aangepast.

## 12. S07 — Verpakking toevoegen of bewerken mobiel

### Doel

Een verpakking beheren zonder categorie, merk of productnaam opnieuw te vragen.

### Opbouw

```text
┌──────────────────────────────┐
│ Verpakking toevoegen         │
│ Voor: Coca-Cola Zero Sugar   │
│                              │
│ Verpakkingstype *            │
│ [ blik ▾                   ] │
│                              │
│ Inhoud                       │
│ [ 330       ] [ ml ▾       ] │
│                              │
│ Aantal per verpakking *      │
│ [ 1                       ] │
│                              │
│ Eenheidsoort                 │
│ [ blik ▾                   ] │
│                              │
│ Voorbeeld                    │
│ blik 330 ml                  │
│                              │
│ [ Annuleren ] [ Toevoegen ]  │
└──────────────────────────────┘
```

### Gedrag

- Kan als bottom sheet, drawer of aparte pagina.
- Productcontext staat vast.
- Duplicaatverpakking wordt geblokkeerd met veldfout:

```text
Deze verpakking bestaat al bij dit product.
```

## 13. S08 — Nieuwe categorie inline mobiel

### Doel

Vanuit het productformulier één ontbrekend categorieniveau aanmaken en direct selecteren.

### Bottom sheet-opbouw

```text
┌──────────────────────────────┐
│ Nieuwe categorie             │
│                              │
│ Naam *                       │
│ [ Cola                     ] │
│                              │
│ Plaats                       │
│ ( ) Hoofdcategorie           │
│ (•) Onder bestaande categorie│
│                              │
│ Bovenliggende categorie      │
│ [ Voeding & drinken >        │
│   Dranken > Frisdrank ▾    ] │
│                              │
│ Nieuw pad                    │
│ Voeding & drinken > Dranken  │
│ > Frisdrank > Cola           │
│                              │
│ Categorieën maak je één      │
│ niveau tegelijk aan.         │
│                              │
│ [ Annuleren ] [ Aanmaken ]   │
└──────────────────────────────┘
```

### Gedrag

- Reeds ingevulde productgegevens blijven behouden.
- Na aanmaken sluit de sheet en wordt de nieuwe categorie geselecteerd.
- Dubbele categorienaam onder dezelfde parent wordt geblokkeerd:

```text
Deze categorie bestaat al onder deze parent.
```

## 14. S09 — Nieuw merk inline mobiel

### Doel

Vanuit het productformulier een merk aanmaken zonder het formulier te verlaten.

### Bottom sheet-opbouw

```text
┌──────────────────────────────┐
│ Nieuw merk                   │
│                              │
│ Naam *                       │
│ [ Remia                   ] │
│                              │
│ Vergelijkbare merken         │
│ Remia Foodservice          › │
│                              │
│ [ Annuleren ]                │
│ [ Merk aanmaken ]            │
└──────────────────────────────┘
```

### Gedrag

- Na aanmaken sluit de sheet en wordt het nieuwe merk geselecteerd.
- Productgegevens en verpakkingsvelden blijven behouden.
- Dubbele merknaam wordt geblokkeerd:

```text
Dit merk bestaat al.
```

## 15. Component- en contentrichtlijnen voor Figma

### Labels

Gebruik consequent:

- `Product aanmaken`;
- `Eerste product aanmaken`;
- `Product opslaan`;
- `Product bewerken`;
- `Verpakking toevoegen`;
- `Nieuwe categorie`;
- `Nieuw merk`;
- `Weergavenaam`;
- `Voorbeeld`.

### Niet gebruiken

Gebruik in de MVP niet:

- `Product toevoegen` als primaire term wanneer de specificatie `Product aanmaken` zegt;
- `Barcode`, `EAN`, `SKU`, `variant`, `uitvoering`, `producttype`, `merkproduct`;
- `Actief`, `Concept`, `Publiceren`, `Archiveren`;
- voorraad- of locatiegegevens.

### Voorbeelddata

Gebruik in de mobiele kaarten en detail/formulier-state bij voorkeur:

```text
Voeding & drinken > Dranken > Frisdrank > Cola
Coca-Cola Zero Sugar
Merk: Coca-Cola
fles 1,5 l

Voeding & drinken > Dranken > Frisdrank > Cola
Coca-Cola Cherry Zero
Merk: Coca-Cola
blik 330 ml

Voeding & drinken > Sauzen & smaakmakers > Tafelsauzen > Satésaus
Remia Satésaus kant-en-klaar
Merk: Remia
pot 500 g

Voeding & drinken > Dranken > Koffie & thee > Koffiecapsules
Nescafé Dolce Gusto Lungo
Merk: Nescafé Dolce Gusto
doos met 16 capsules
```

## 16. Belangrijkste Figma-frames voor mobiel

Voor het Figma-design zijn minimaal deze frames nodig:

1. **Productoverzicht — gevuld**
   - zoekveld;
   - categorie- en merkfilter;
   - productkaarten;
   - sticky `Product aanmaken`.
2. **Productoverzicht — leeg**
   - lege uitleg;
   - `Eerste product aanmaken`.
3. **Productoverzicht — geen zoekresultaat**
   - zoekterm zichtbaar;
   - uitleg;
   - sticky `Product aanmaken`.
4. **Nieuw product**
   - productgegevens;
   - eerste verpakking;
   - live weergavenaam en verpakkingsvoorbeeld;
   - `Product opslaan`.
5. **Productdetail**
   - weergavenaam;
   - categoriepad;
   - merk/productnaam;
   - verpakkingen;
   - acties.
6. **Nieuw merk bottom sheet**
   - naamveld;
   - vergelijkbare merken;
   - foutstate voor duplicaat.
7. **Nieuwe categorie bottom sheet**
   - naamveld;
   - parentcategorie;
   - nieuw pad;
   - uitleg: één niveau tegelijk.
