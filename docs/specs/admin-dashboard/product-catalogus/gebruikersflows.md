# Gebruikersflows — Productcatalogus MVP

## Documentinformatie

- **Onderdeel:** Admin dashboard
- **Module:** Productcatalogus
- **Status:** Concept
- **Hoofdspecificatie:** [Functionele specificatie](./productcatalogus-specificatie.md)
- **Schermbeschrijving:** [Schermopbouw](./schermopbouw.md)

## 1. Doel van dit document

Dit document beschrijft de MVP-flows waarmee een beheerder producten vindt, aanmaakt en onderhoudt. De productcatalogus wordt product voor product opgebouwd. Zoeken helpt om bestaande gegevens te vinden en duplicaten te voorkomen, maar is nooit verplicht.

## 2. Hoofdregel

Er zijn drie ingangen, maar één productformulier:

```text
Productcatalogus
│
├── Direct aanmaken
│   └── Product aanmaken
│       └── Nieuw product
│
├── Zoeken
│   ├── Bestaand product openen
│   └── Geen passend product
│       └── Product aanmaken
│           └── Nieuw product
│
└── Filteren/bladeren binnen overzicht
    ├── Bestaand product openen
    └── Product aanmaken
        └── Nieuw product
```

De beheerder hoeft niet eerst merk- of categoriebeheer te doen. Ontbrekende merken en categorieën kunnen inline vanuit het productformulier worden aangemaakt.

## 3. Hoofdflow A — Direct een product aanmaken

### Wanneer gebruiken?

- De beheerder weet dat het product nog niet bestaat.
- De catalogus is leeg.
- De beheerder wil meteen invoeren en niet eerst zoeken.

### Schermverloop

```text
S01 Productoverzicht of S02 Lege catalogus
        ↓ Product aanmaken / Eerste product aanmaken
S04 Nieuw product
        ↓ categorie kiezen of inline één niveau aanmaken
S08 Nieuwe categorie
        ↓ terug naar formulier met categorie geselecteerd
S09 Nieuw merk, optioneel
        ↓ terug naar formulier met merk geselecteerd
S04 productnaam + eerste verpakking invullen
        ↓ Product opslaan
S05 Productdetail
```

### Stappen

1. Open `Productcatalogus > Producten`.
2. Kies `Product aanmaken` of, bij een lege catalogus, `Eerste product aanmaken`.
3. Kies een bestaande categorie of maak één ontbrekende categorie inline aan.
4. Herhaal categorie-aanmaak alleen als er nog een extra niveau ontbreekt.
5. Kies optioneel een bestaand merk of maak inline een nieuw merk aan.
6. Vul de productnaam in.
7. Controleer de live weergavenaam.
8. Vul de eerste verpakking in.
9. Controleer het live verpakkingsvoorbeeld.
10. Kies `Product opslaan`.
11. Het productdetail opent met de aangemaakte verpakking.

## 4. Hoofdflow B — Eerst zoeken

### Wanneer gebruiken?

- De beheerder weet niet zeker of het product bestaat.
- De beheerder wil duplicaten voorkomen.
- De beheerder kent slechts een deel van de productnaam, merknaam, categorie of verpakking.

### Schermverloop

```text
S01 Productoverzicht
        ↓ zoekterm invoeren
S01 gefilterd productoverzicht of S03 Geen zoekresultaat
        ├── product bestaat → S05 Productdetail
        └── geen passend product → S04 Nieuw product
```

### Uitkomst 1 — Product bestaat

Voorbeeld: zoeken op `zero`.

1. De beheerder voert `zero` in.
2. `Coca-Cola Zero Sugar` verschijnt als productkaart.
3. De beheerder opent het product rechtstreeks.
4. Productdetail toont productgegevens en verpakkingen.
5. De beheerder kan productgegevens bewerken of een verpakking toevoegen.

### Uitkomst 2 — Geen passend product

Voorbeeld: zoeken op `Remia mayonaise` zonder productmatch.

1. Het overzicht toont dat er geen producten zijn gevonden.
2. `Product aanmaken` blijft beschikbaar.
3. De zoekterm mag als suggestie zichtbaar zijn in het formulier.
4. De beheerder bevestigt zelf categorie, optioneel merk, productnaam en verpakking.
5. Het systeem splitst de zoekterm niet automatisch op in merk en productnaam.

## 5. Hoofdflow C — Filteren op categorie of merk

### Wanneer gebruiken?

- De beheerder wil producten binnen een categorie zien.
- De beheerder wil producten van een merk zien.
- De beheerder kent de precieze productnaam niet.

### Schermverloop

```text
S01 Productoverzicht
        ↓ categorie- en/of merkfilter kiezen
S01 gefilterde productkaarten
        ├── bestaand product openen → S05 Productdetail
        └── Product aanmaken → S04 Nieuw product
```

### Gedrag

- Filters in MVP: `Categorie` en `Merk`.
- Geen statusfilter.
- De primaire actie `Product aanmaken` blijft bereikbaar.
- Als filters geen resultaten opleveren, kan de beheerder filters wissen of een product aanmaken.

## 6. Vanaf scratch — Vier producten invoeren

Deze flow laat zien hoe de catalogus tijdens normale productinvoer groeit.

Voorbeelden:

1. Coca-Cola Zero Sugar — fles 1,5 liter;
2. Coca-Cola Cherry Zero — blik 330 milliliter;
3. Remia Satésaus kant-en-klaar — pot 500 gram;
4. Nescafé Dolce Gusto Lungo — doos met 16 capsules.

Uitgangssituatie:

- er zijn nog geen producten;
- er zijn nog geen merken;
- specifieke subcategorieën bestaan nog niet;
- vaste verpakkingstypen, inhoudseenheden en eenheidsoorten bestaan wel;
- mogelijk bestaat een brede hoofdcategorie zoals `Voeding & drinken`.

## 7. Product 1 — Coca-Cola Zero Sugar

### 7.1 Starten

```text
S02 Lege productcatalogus
        ↓ Eerste product aanmaken
S04 Nieuw product
```

De beheerder zoekt niet eerst. De knop opent direct het formulier.

### 7.2 Categorie kiezen of aanmaken

Doelcategorie:

```text
Voeding & drinken > Dranken > Frisdrank > Cola
```

De beheerder maakt ontbrekende niveaus één voor één aan:

1. Als `Voeding & drinken` bestaat, selecteer die als parent.
2. Maak `Dranken` aan onder `Voeding & drinken`.
3. Maak `Frisdrank` aan onder `Dranken`.
4. Maak `Cola` aan onder `Frisdrank`.
5. Na elke aanmaak sluit de bottom sheet en wordt de nieuwe categorie geselecteerd.
6. Het formulier behoudt reeds ingevulde productgegevens.

Als een niveau al bestaat, wordt dat niveau gekozen in plaats van opnieuw aangemaakt.

### 7.3 Merk aanmaken

1. Kies `+ Nieuw merk`.
2. Vul `Coca-Cola` in.
3. Controleer eventuele vergelijkbare merken.
4. Kies `Merk aanmaken`.
5. De bottom sheet sluit en `Coca-Cola` is geselecteerd.

### 7.4 Product en verpakking invullen

```text
Productnaam:             Zero Sugar
Verpakkingstype:         fles
Inhoudshoeveelheid:      1,5
Inhoudseenheid:          liter
Aantal per verpakking:   1
Eenheidsoort:            fles
```

Het formulier toont:

```text
Weergavenaam: Coca-Cola Zero Sugar
Voorbeeld:    fles 1,5 l
```

### 7.5 Opslaan

1. Kies `Product opslaan`.
2. Product, merkrelatie, categorie en eerste verpakking worden betrouwbaar opgeslagen.
3. Productdetail opent.
4. Daar staat één verpakking: `fles 1,5 l`.

## 8. Product 2 — Coca-Cola Cherry Zero

Nu bestaan categorie `Cola` en merk `Coca-Cola` al.

### Schermverloop

```text
S01 Productoverzicht
        ↓ Product aanmaken
S04 Nieuw product
        ↓ bestaande categorie en bestaand merk kiezen
S05 Productdetail
```

### Stappen

1. Kies `Product aanmaken`.
2. Kies het bestaande categoriepad `Voeding & drinken > Dranken > Frisdrank > Cola`.
3. Kies bestaand merk `Coca-Cola`.
4. Vul in:

```text
Productnaam:             Cherry Zero
Verpakkingstype:         blik
Inhoudshoeveelheid:      330
Inhoudseenheid:          milliliter
Aantal per verpakking:   1
Eenheidsoort:            blik
```

5. Controleer:

```text
Weergavenaam: Coca-Cola Cherry Zero
Voorbeeld:    blik 330 ml
```

6. Kies `Product opslaan`.

Er worden geen nieuwe categorie- of merkrecords aangemaakt.

## 9. Product 3 — Remia Satésaus kant-en-klaar

Categorie en merk bestaan nog niet volledig, maar `Voeding & drinken` kan worden hergebruikt.

### Doelcategorie

```text
Voeding & drinken > Sauzen & smaakmakers > Tafelsauzen > Satésaus
```

### Stappen

1. Kies `Product aanmaken`.
2. Maak ontbrekende categorieën één niveau tegelijk aan:
   - `Sauzen & smaakmakers` onder `Voeding & drinken`;
   - `Tafelsauzen` onder `Sauzen & smaakmakers`;
   - `Satésaus` onder `Tafelsauzen`.
3. Maak merk `Remia` inline aan.
4. Vul in:

```text
Productnaam:             Satésaus kant-en-klaar
Verpakkingstype:         pot
Inhoudshoeveelheid:      500
Inhoudseenheid:          gram
Aantal per verpakking:   1
Eenheidsoort:            pot
```

5. Controleer:

```text
Weergavenaam: Remia Satésaus kant-en-klaar
Voorbeeld:    pot 500 g
```

6. Kies `Product opslaan`.

## 10. Product 4 — Nescafé Dolce Gusto Lungo

Het bestaande pad `Voeding & drinken > Dranken` wordt hergebruikt.

### Doelcategorie

```text
Voeding & drinken > Dranken > Koffie & thee > Koffiecapsules
```

### Stappen

1. Kies `Product aanmaken`.
2. Selecteer `Voeding & drinken > Dranken` als bestaande parent.
3. Maak `Koffie & thee` aan onder `Dranken`.
4. Maak `Koffiecapsules` aan onder `Koffie & thee`.
5. Maak merk `Nescafé Dolce Gusto` inline aan.
6. Vul productnaam `Lungo` in.
7. Vul de verpakking als telbare verpakking in:

```text
Verpakkingstype:         doos
Inhoudshoeveelheid:      leeg
Inhoudseenheid:          leeg
Aantal per verpakking:   16
Eenheidsoort:            capsule
```

8. Controleer:

```text
Weergavenaam: Nescafé Dolce Gusto Lungo
Voorbeeld:    doos met 16 capsules
```

9. Kies `Product opslaan`.

## 11. Resultaat na vier producten

### Productoverzicht

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

### Categorieboom conceptueel

De boom is geen apart MVP-beheerscherm, maar ontstaat wel in de data:

```text
Voeding & drinken
├── Dranken
│   ├── Frisdrank
│   │   └── Cola
│   └── Koffie & thee
│       └── Koffiecapsules
└── Sauzen & smaakmakers
    └── Tafelsauzen
        └── Satésaus
```

### Merken conceptueel

```text
Coca-Cola
Remia
Nescafé Dolce Gusto
```

## 12. Extra verpakking toevoegen

### Voorbeeld

`Coca-Cola Zero Sugar` bestaat al met `fles 1,5 l`. Er moet een `blik 330 ml` bij.

### Schermverloop

```text
S01 Product zoeken of openen
        ↓
S05 Productdetail
        ↓ Verpakking toevoegen
S07 Verpakking toevoegen
        ↓ Toevoegen
S05 Productdetail met bijgewerkte verpakkingslijst
```

### Stappen

1. Open `Coca-Cola Zero Sugar`.
2. Kies `Verpakking toevoegen`.
3. Productnaam, merk en categorie worden niet opnieuw gevraagd.
4. Vul in:

```text
Verpakkingstype:         blik
Inhoudshoeveelheid:      330
Inhoudseenheid:          milliliter
Aantal per verpakking:   1
Eenheidsoort:            blik
```

5. Controleer `blik 330 ml`.
6. Kies `Toevoegen`.
7. Productdetail toont nu zowel `fles 1,5 l` als `blik 330 ml`.

## 13. Multipack toevoegen

### Voorbeeld

Een multipack van zes blikken van 330 milliliter.

```text
Verpakkingstype:         multipack
Inhoudshoeveelheid:      330
Inhoudseenheid:          milliliter
Aantal per verpakking:   6
Eenheidsoort:            blik
```

Weergave:

```text
multipack 6 × 330 ml blik
```

## 14. Bestaand product bewerken

### Schermverloop

```text
S01 Productoverzicht
        ↓ product openen
S05 Productdetail
        ↓ Product bewerken
S06 Product bewerken
        ↓ Wijzigingen opslaan
S05 Bijgewerkt productdetail
```

### Stappen

1. Open het product.
2. Kies `Product bewerken`.
3. Wijzig categorie, merk of productnaam.
4. Controleer de nieuwe weergavenaam.
5. Als de wijziging een duplicaat zou maken, toont de UI een blokkerende fout.
6. Kies `Wijzigingen opslaan`.
7. Verpakkingen blijven aan hetzelfde product gekoppeld.

Verpakkingsvelden worden niet op dit scherm gewijzigd.

## 15. Verpakking bewerken

### Schermverloop

```text
S05 Productdetail
        ↓ verpakking openen
S07 Verpakking bewerken
        ↓ Wijzigingen opslaan
S05 Productdetail met bijgewerkte verpakkingsweergave
```

### Stappen

1. Open productdetail.
2. Open de verpakking.
3. Wijzig verpakkingstype, inhoud, eenheid, aantal per verpakking of eenheidsoort.
4. Controleer het voorbeeld.
5. Kies `Wijzigingen opslaan`.

In MVP wordt een verpakking niet verwijderd of gearchiveerd.

## 16. Duplicaat voorkomen tijdens merkkeuze

### Voorbeeld

`Coca-Cola` bestaat al en de beheerder probeert `coca-cola` aan te maken.

```text
S09 Nieuw merk
        ↓ naam invoeren
Fout bij naamveld:
Dit merk bestaat al.
```

### Gedrag

- Vergelijking is hoofdletterongevoelig.
- Spaties aan begin/einde worden genegeerd.
- Meerdere opeenvolgende spaties tellen als één spatie.
- Opslaan wordt geblokkeerd.

## 17. Duplicaat voorkomen tijdens categorieaanmaak

### Voorbeeld

`Cola` bestaat al onder `Frisdrank` en de beheerder probeert opnieuw `Cola` onder `Frisdrank` aan te maken.

```text
S08 Nieuwe categorie
        ↓ naam en parent invoeren
Fout bij naamveld:
Deze categorie bestaat al onder deze parent.
```

### Gedrag

- `Cola` onder een andere parent mag wel bestaan.
- Daarom wordt altijd het volledige categoriepad getoond.
- Opslaan wordt geblokkeerd bij exact genormaliseerd duplicaat onder dezelfde parent.

## 18. Duplicaat voorkomen bij product opslaan

### Voorbeeld

`Coca-Cola Zero Sugar` bestaat al binnen categorie `Cola`.

```text
S04 Nieuw product
        ↓ zelfde categorie + zelfde merk + zelfde productnaam
Fout bij productnaam of formuliersamenvatting:
Dit product bestaat al binnen deze categorie en dit merk.
```

### Gedrag

- Duplicaatcontrole gebruikt categorie, merk en genormaliseerde productnaam.
- Merkloos product wordt apart vergeleken als product zonder merk.
- Opslaan wordt geblokkeerd.

## 19. Duplicaat voorkomen bij verpakking opslaan

### Voorbeeld

`Coca-Cola Zero Sugar` heeft al `fles 1,5 l`.

```text
S07 Verpakking toevoegen
        ↓ zelfde verpakkingscombinatie invoeren
Fout bij verpakkingssectie:
Deze verpakking bestaat al bij dit product.
```

### Gedrag

- Duplicaatcontrole geldt binnen hetzelfde product.
- Opslaan wordt geblokkeerd.

## 20. Terug- en annuleergedrag

### Terug vanuit productdetail

- Keert terug naar het productoverzicht.
- Behoudt waar mogelijk zoekterm, filters en scrollpositie.

### Annuleren in productformulier

- Zonder wijzigingen: terug naar vorige context.
- Met wijzigingen: bevestiging dat niet-opgeslagen gegevens verloren gaan.

### Annuleren in merk- of categoriebottom sheet

- Sluit alleen de bottom sheet.
- Het productformulier blijft geopend.
- Eerder ingevoerde product- en verpakkingswaarden blijven behouden.

## 21. Fout- en herstelflows

### Validatiefout

1. De beheerder kiest opslaan.
2. Fouten worden bij de velden getoond.
3. Focus gaat naar de eerste fout.
4. Alle geldige invoer blijft staan.
5. Na correctie kan opnieuw worden opgeslagen.

### Server- of netwerkfout

1. De submit mislukt.
2. De UI toont een begrijpelijke fout en waar logisch `Opnieuw proberen`.
3. Formulierdata blijft behouden.
4. Dubbele submits worden voorkomen.

### Gedeeltelijk opslaan voorkomen

Product en eerste verpakking worden als één betrouwbare operatie verwerkt. Bij een fout mag de beheerder niet denken dat alles is opgeslagen terwijl slechts een deel is aangemaakt.

## 22. Samenvatting van de gewenste ervaring

De normale MVP-ervaring is:

```text
Direct product aanmaken
        ↓
Bestaande categorie/merk hergebruiken waar mogelijk
        ↓
Ontbrekend merk of categorie inline aanmaken
        ↓
Productnaam en eerste verpakking invullen
        ↓
Product en eerste verpakking samen opslaan
        ↓
Productdetail openen
        ↓
Latere verpakkingen vanuit het product toevoegen
```

De beheerder bouwt de catalogus product voor product op. De interface blijft eenvoudig, mobiel bruikbaar en vrij van buiten-scope beheerfunctionaliteit.
