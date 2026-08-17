# Specificatie — Fysieke voorraad aanpassen

## Doel

Een beheerder past één fysieke verpakking aan: resterende inhoud, locatie, THT of verwijdering uit actieve voorraad.

## Selectie

- Een gegroepeerde volledige regel kan worden uitgeklapt tot de onderliggende fysieke items.
- De gebruiker kiest expliciet een item; de backend kiest niet automatisch een verpakking.
- Aangebroken items staan al afzonderlijk.

## Resterende inhoud

- De maximale inhoud wordt afgeleid van het actuele product.
- De beheerder stelt resterende inhoud in; de app vraagt niet primair hoeveel is verbruikt.
- `0` verwijdert het item uit actieve voorraad en schrijft een mutatie.
- COUNT verandert per heel stuk.
- MASS en VOLUME blijven binnen hun dimensie converteerbaar; exacte sliderstappen zijn een open UI-beslissing.
- Optimistic locking voorkomt stil overschrijven.

## Locatie en THT

- Eén fysiek item kan naar een andere actieve locatie worden verplaatst.
- THT kan worden ingesteld, gewijzigd of verwijderd.
- Meerdere geopende verpakkingen van hetzelfde product mogen tegelijk verschillende locaties, THT-data en resterende hoeveelheden hebben.

## Archivering

- Voorraad van een later gearchiveerd product blijft zichtbaar en aanpasbaar naar beneden of leeg.
- Nieuwe voorraad toevoegen voor een gearchiveerd product is niet toegestaan.

## Acceptatiecriteria

### AC-01 — Eén verpakking aanpassen

Gegeven twee aangebroken verpakkingen van hetzelfde product
Wanneer de gebruiker één resterende inhoud wijzigt
Dan blijft de andere verpakking ongewijzigd.

### AC-02 — Verplaatsen

Gegeven een geopende fles in de berging
Wanneer die naar de koelkast wordt verplaatst
Dan verandert alleen de locatie van die fysieke inventory-itemrij.

### AC-03 — Leeg

Gegeven een resterende inhoud groter dan nul
Wanneer de beheerder die op nul zet en bevestigt
Dan verdwijnt het item uit actieve voorraad
En blijft de mutatie auditbaar.
