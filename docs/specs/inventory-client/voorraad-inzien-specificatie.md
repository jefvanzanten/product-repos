# Specificatie — Voorraad inzien en filteren

## Doel

De gebruiker ziet concrete producten gegroepeerd met daaronder de werkelijke verdeling over fysieke verpakkingen, locaties, THT-data en resterende inhoud.

## Productgerichte lijst

- Hoofdgroepen zijn concrete producten, niet locations of productsamenstellingen.
- De hoofdregel gebruikt de gedeelde productweergavenaam.
- Totaal is de som van `remaining_amount / actuele productinhoud`, getoond als verpakkingsequivalent met maximaal één decimaal.
- De onderliggende regels blijven exact en maken afronding controleerbaar.

Voorbeeld:

```text
Jong belegen kaasplakken — Zuivelmeester · 3,7 verpakkingen
├── 1× volledig · 16-08-2026 · Berging › Koelkast
├── 2× volledig · 22-08-2026 · Berging › Koelkast
├── 80 / 120 g · 24-08-2026 · Huiskamer › Koelkast
└── 40 / 120 g · 24-08-2026 · Berging › Koelkast
```

## Presentatiegroepering

Volledige items mogen als `N× volledig` worden samengevoegd wanneer product, locatie en THT gelijk zijn. Aangebroken verpakkingen blijven afzonderlijk, ook bij gelijke resterende inhoud. Groepering verandert geen persistente IDs.

## Sortering

- Productgroepen met verlopen of vroegst verlopende voorraad eerst; datumloze groepen daarna alfabetisch.
- Binnen een productgroep THT oplopend; datumloos onderaan.
- Locatiepad staat op iedere onderliggende regel.

## Resterende inhoud

- Maximale inhoud komt van het concrete product.
- Resterende inhoud wordt in dezelfde dimensie berekend en mag binnen MASS (`g`/`kg`) of VOLUME (`ml`/`cl`/`l`) worden gepresenteerd.
- COUNT gebruikt uitsluitend gehele stuks.
- Een progressbar visualiseert hoeveel van de fysieke verpakking resteert; een volle balk betekent volledig.
- De precieze keuze tussen percentage en `resterend / totaal`, plus sliderstappen voor massa/volume, blijft een open UI-tweak. De exacte hoeveelheid blijft beschikbaar.

## Verloopstatus

Status wordt bepaald tegen vandaag in de applicatietijdzone:

| Situatie | Status |
| --- | --- |
| THT vóór vandaag | Verlopen |
| THT vandaag | Verloopt vandaag; nog consumeerbaar |
| THT over 1–3 dagen | Urgent |
| THT over 4–7 dagen | Binnenkort |
| THT later dan 7 dagen | Later |
| Geen THT | Geen datum |

`Bijna verlopen` toont verlopen, vandaag, urgent en binnenkort, in die urgentievolgorde. Grenzen zijn configureerbaar.

## Lage voorraad

- Lage voorraad kijkt naar totale resterende inhoud en niet alleen naar aantallen verpakkingen.
- Per concreet product bestaat een handmatig instelbare drempel.
- Zonder drempel verschijnt een product niet in het filter `Lage voorraad`.
- Een voorgestelde drempel op basis van slow/medium/fast-moving is Should have; beginheuristieken zoals 10%/25%/50% van één productinhoud moeten in gebruik worden getweakt.

## Filters

Minimaal:

- Alles;
- Lage voorraad;
- Bijna verlopen.

Filters mogen gecombineerd worden met vrije product-, merk-, categorie- en locatiezoektekst.

## Acceptatiecriteria

### AC-01 — Exacte fysieke verdeling

Gegeven meerdere volledige en aangebroken verpakkingen
Dan toont de hoofdregel één afgerond totaal
En tonen onderliggende regels de exacte locatie, THT en resterende inhoud.

### AC-02 — Veilige groepering

Gegeven twee volledige items met dezelfde locatie en THT
Dan mogen zij als `2× volledig` verschijnen
Maar blijven zij afzonderlijke inventory-itemrecords.

### AC-03 — THT-dag

Gegeven dat THT vandaag is
Dan toont de UI `Verloopt vandaag`
En niet `Verlopen`.
