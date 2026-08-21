# Specificatie — Voorraad inzien en filteren

## Doel

De gebruiker ziet concrete producten gegroepeerd met daaronder per voorraadregel het locatiepad, de resterende inhoud, een progressbar en het aantal fysieke verpakkingen.

## Productgerichte lijst

- Hoofdgroepen zijn concrete producten, niet locations of productsamenstellingen.
- De hoofdregel gebruikt op desktop de gedeelde productweergavenaam. Op mobiel staat eerst de productsamenstellingsnaam, met het merk daaronder in een kleiner lettertype.
- De compacte hoofdregel toont geen resterende hoeveelheid en geen progressbar.
- De compacte hoofdregel toont per fysieke verpakking een pictogram van het verpakkingstype, gevuld naar de resterende verhouding. Een aparte totaalteller is niet nodig omdat het aantal pictogrammen het aantal verpakkingen toont.
- Detailregels worden per locatie onder één locatieheader gegroepeerd, zodat hetzelfde locatiepad niet wordt herhaald. Per fysiek item staan daaronder hoeveelheid, interactieve progressbar, `− 1 +`-teller, optionele THT-datum en een instellingenknop.

Voorbeeld:

```text
Jong belegen kaasplakken — Zuivelmeester · [4 verpakkingspictogrammen] · 4
├── Berging › Koelkast
│   120 g · [100% slider] · − 1 +
├── Berging › Koelkast
│   120 g · [100% slider] · − 1 +
├── Huiskamer › Koelkast
│   80 g · [67% slider] · − 1 +
└── Berging › Koelkast
    40 g · [33% slider] · − 1 +
```

## Presentatiegroepering

Iedere fysieke verpakking krijgt een eigen detailregel, ook wanneer volledige items dezelfde locatie en THT hebben. Gelijke locatiepaden worden één keer als sectieheader getoond. De onderste detailzone gebruikt de volledige breedte voor een zo groot mogelijke slider, met daarna de teller, optionele THT-datum en helemaal rechts een tandwiel. Het tandwiel opent locatie- en THT-instellingen; `Escape`, annuleren en buiten de popover klikken sluiten zonder op te slaan. De compacte hoofdregel toont alleen de verpakkingspictogrammen, zonder totaalteller of `−`- en `+`-knoppen. De lage-voorraaddrempel wordt niet in de kaartdetails getoond.

## Sortering

- `Alles` is de standaardweergave en sorteert productgroepen alfabetisch op productweergavenaam.
- `Voorraad` sorteert alle productgroepen op het exacte totale verpakkingsequivalent, van de minste naar de meeste resterende voorraad.
- `Datum` sorteert alle productgroepen op hun exacte vroegste THT, van de vroegste naar de laatste datum; datumloze groepen staan onderaan alfabetisch.
- Binnen een productgroep staat THT oplopend en datumloos onderaan.
- Locatiepad staat op iedere onderliggende regel.

## Resterende inhoud

- Maximale inhoud komt van het concrete product.
- Resterende inhoud wordt in dezelfde dimensie berekend. De presentatie kiest de grootste praktische eenheid met maximaal twee decimalen: MASS gebruikt `kg` of `g`; VOLUME gebruikt `l`, `cl` of `ml`.
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
| Geen THT | Geen statuslabel |

De datumstatus blijft zichtbaar als verlopen, vandaag, urgent, binnenkort of later. De sortering `Datum` gebruikt de exacte vroegste THT en niet alleen deze statuscategorieën.

## Lage voorraad

- Lage voorraad kijkt naar totale resterende inhoud en niet alleen naar aantallen verpakkingen.
- Per concreet product bestaat een handmatig instelbare drempel.
- Zonder drempel krijgt een product geen status `Lage voorraad`; dit heeft geen invloed op de sortering `Voorraad`.
- Een voorgestelde drempel op basis van slow/medium/fast-moving is Should have; beginheuristieken zoals 10%/25%/50% van één productinhoud moeten in gebruik worden getweakt.

## Lijstordening

De gebruiker kan telkens één ordening kiezen:

- Alles;
- Voorraad;
- Datum.

De actieve ordening mag gecombineerd worden met vrije product-, merk-, categorie- en locatiezoektekst.

## Acceptatiecriteria

### AC-01 — Exacte fysieke verdeling

Gegeven meerdere volledige en aangebroken verpakkingen
Dan toont de hoofdregel verpakkingspictogrammen en het totale aantal
En tonen onderliggende regels per fysiek item het exacte locatiepad, de resterende inhoud, de interactieve progressbar en de teller.

### AC-02 — Veilige groepering

Gegeven twee volledige items met dezelfde locatie en THT
Dan verschijnen zij als twee afzonderlijke detailregels
En blijven zij afzonderlijke inventory-itemrecords.

### AC-03 — THT-dag

Gegeven dat THT vandaag is
Dan toont de UI `Verloopt vandaag`
En niet `Verlopen`.

### AC-04 — Voorraadvisualisatie

Gegeven één fysieke verpakking met 40% resterende inhoud
Dan toont de hoofdregel één voor 40% gevuld verpakkingspictogram
En toont de detailregel een slider op 40%
En kan de gebruiker de resterende inhoud via deze slider aanpassen
En wordt de wijziging na het loslaten opgeslagen.

Gegeven twee volledige pakken en één pak met 40% resterende inhoud
Dan toont de hoofdregel drie verpakkingspictogrammen
En bevat de hoofdregel geen resterende hoeveelheid of progressbar.
