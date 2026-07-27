# Specificatie — product en merk zoeken

## Status

- Onderdeel: admin dashboard > productcatalogus
- Routes:
  - `/admin/product-catalogus/producten`
  - `/admin/product-catalogus/producten/nieuw`
- Status:
  - cataloguszoekveld: huidig, alleen UI-state;
  - merk zoeken in productformulier: huidig;
  - echte productresultaten zoeken: gepland.

## Doel

Zoeken helpt de beheerder om bestaande catalogusdata te vinden en duplicaten te voorkomen. Zoeken is nooit verplicht om een product aan te maken.

## Zoekvormen

| Zoekvorm | Waar | Huidige status |
| --- | --- | --- |
| Productcatalogus zoeken | `/admin/product-catalogus/producten?q=...` | Query wordt bewaard; er worden nog geen producten opgehaald |
| Merk zoeken | merkveld in product-aanmaakformulier | Werkt via `GET /brands?query=...` |
| Productresultaten zoeken | productcataloguspagina | Gepland, onderdeel van browsbare catalogus |
| Categorie zoeken/filteren | productcataloguspagina | Gepland, onderdeel van browsbare catalogus |

## Cataloguszoekveld

### Scherminhoud

```text
Productcatalogus
Producten

[ Zoek product, merk, categorie of verpakking ]
[ Product aanmaken ]
```

### Gedrag nu

- Het zoekveld gebruikt queryparameter `q`.
- Openen van `/admin/product-catalogus/producten?q=cola` vult het zoekveld met `cola`.
- De zoekterm wordt niet automatisch opgesplitst in merk, categorie of productnaam.
- De zoekterm wordt niet automatisch ingevuld in het productformulier.
- `Product aanmaken` blijft altijd bereikbaar.

### Later gedrag

Wanneer productzoeken wordt geïmplementeerd, zoekt dezelfde invoer op:

- productnaam;
- merknaam;
- categorienaam of categoriepad;
- verpakkingsomschrijving.

Het latere zoekresultaat hoort bij de browsbare catalogus-spec: [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md).

## Merk zoeken in product aanmaken

### Gedrag

- Het merkveld zoekt bestaande merken vanaf minimaal twee tekens.
- API: `GET /brands?query=<zoekterm>`.
- Resultaten zijn case-insensitive en gelimiteerd.
- De beheerder kiest een bestaande suggestie of bevestigt expliciet een nieuw merk.
- Een losse tekst zonder gekozen of bevestigd merk blokkeert opslaan met een veldfout.

### Geen automatische productinvulling

Een merkzoekterm vult nooit automatisch productnaam, categorie of verpakking in.

## Buiten scope

- Barcode zoeken.
- Full-text ranking of fuzzy matching.
- Productdetail openen vanuit een zoekresultaat zolang productdetail niet als eigen slice bestaat.
- Automatisch product aanmaken op basis van zoekterm.

## Acceptatiecriteria

### AC-01 — Zoekterm blijft zichtbaar

Gegeven dat de beheerder `/admin/product-catalogus/producten?q=cola` opent  
Dan staat `cola` in het zoekveld  
En wordt er geen product automatisch aangemaakt of ingevuld.

### AC-02 — Product aanmaken blijft bereikbaar

Gegeven dat er een zoekterm is ingevuld  
Wanneer de beheerder `Product aanmaken` kiest  
Dan opent het productformulier zonder verplichte zoekstap.

### AC-03 — Merk suggesties zoeken

Gegeven dat de beheerder in het productformulier minimaal twee tekens in het merkveld typt  
Dan vraagt de UI `GET /brands?query=...` op  
En kan de beheerder een bestaand merk kiezen.

### AC-04 — Merk niet impliciet kiezen

Gegeven dat de beheerder tekst in het merkveld typt maar geen suggestie of nieuw merk bevestigt  
Wanneer de beheerder het product opslaat  
Dan toont de UI een veldfout bij merk.
