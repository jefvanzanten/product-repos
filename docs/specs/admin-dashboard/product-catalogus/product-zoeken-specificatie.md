# Specificatie - product en merk zoeken

## Status

- Onderdeel: admin dashboard > productcatalogus
- Routes:
  - `/admin/product-catalogus/producten`
  - `/admin/product-catalogus/producten/nieuw`
- Status:
  - cataloguszoekveld: geimplementeerd;
  - merk zoeken in productformulier: geimplementeerd voor product aanmaken en product bewerken;
  - echte cataloguszoekresultaten: geimplementeerd.
- Gerelateerde spec: [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md)

## Doel

Zoeken helpt de beheerder om bestaande catalogusdata te vinden en duplicaten te voorkomen. Zoeken is nooit verplicht om een product aan te maken.

Deze spec beschrijft de algemene zoekregels. De concrete UI-resultaten en klikgedrag op de cataloguspagina staan in [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md).

## Zoekvormen

| Zoekvorm | Waar | Status |
| --- | --- | --- |
| Productcatalogus zoeken | `/admin/product-catalogus/producten?q=...` | Werkt met gegroepeerde resultaten volgens browse-spec |
| Merk zoeken | merkveld in product-aanmaakformulier en product-bewerkformulier | Werkt via `GET /brands?query=...` |
| Productresultaten zoeken | productcataloguspagina | Geimplementeerd |
| Categorie zoeken | productcataloguspagina | Geimplementeerd |

## Cataloguszoekveld

### Scherminhoud

```text
Productcatalogus
Producten

[ Zoek product, merk of categorie ]
[ Product aanmaken ]
```

### Gedrag nu

- Het zoekveld gebruikt queryparameter `q`.
- Openen van `/admin/product-catalogus/producten?q=cola` vult het zoekveld met `cola`.
- De zoekterm wordt niet automatisch opgesplitst in merk, categorie of productnaam.
- De zoekterm wordt niet automatisch ingevuld in het productformulier.
- `Product aanmaken` blijft altijd bereikbaar.

## Product zoeken op cataloguspagina

### Zoekgedrag

De cataloguszoeker zoekt vanaf minimaal twee tekens.

De zoekterm wordt gematcht op:

- productnaam;
- merknaam;
- categorienaam;
- categoriepad.

De zoekterm wordt niet gematcht op:

- verpakkingstype;
- verpakkingsinhoud;
- barcode/EAN;
- alias;
- externe productdata.

Voorbeeld:

Wanneer de beheerder zoekt op `cola`, toont de UI matches zoals:

- producten waarvan de productnaam `cola` bevat, bijvoorbeeld `Cola Zero Sugar`;
- merken waarvan de merknaam `cola` bevat, bijvoorbeeld `Coca-Cola`;
- categorieën waarvan de naam of het pad `cola` bevat, bijvoorbeeld `Dranken > Frisdrank > Cola`.

Zoeken is case-insensitive contains-search.

Bij nul of één teken wordt geen productzoekopdracht uitgevoerd.

### Live zoeken en submit

Zoekresultaten verschijnen live tijdens typen, vanaf minimaal twee tekens.

Regels:

- live zoeken is debounced;
- Enter/form submit blijft werken voor keyboardgebruik en deelbare URL;
- de URL gebruikt `q=<zoekterm>` zolang de gebruiker in tekstzoekmodus zit.

## UI-resultaten op cataloguspagina

Zoekresultaten worden gegroepeerd onder:

- `Producten`;
- `Merken`;
- `Categorieën`.

De volledige UI, limieten per groep, klikgedrag en resultaatstates staan in:

- [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md)

Belangrijke zoekregels:

- productresultaat openen gaat naar productdetail;
- merkresultaat openen gaat naar een brand-result state met `brandId` in de URL;
- categorieresultaat openen gaat naar een category-browse state met `categoryId` in de URL;
- bij klikken op merk- of categorieresultaat verdwijnt `q` uit de URL;
- de zoekbalk wordt dan leeg;
- er worden geen persistente filterchips getoond.

## Geen automatische productinvulling

Een zoekterm vult nooit automatisch productnaam, merk of categorie in.

Wel mag product aanmaken expliciete context meenemen wanneer de gebruiker een resultaat of browsecontext heeft gekozen, bijvoorbeeld:

- brand-result state opent product aanmaken met `brandId`;
- category-browse state opent product aanmaken met `categoryId`.

Dit staat verder uitgewerkt in de browse-spec en product-aanmaken-spec.

## Merk zoeken in product aanmaken en product bewerken

### Gedrag

- Het merkveld zoekt bestaande merken vanaf minimaal twee tekens.
- API: `GET /brands?query=<zoekterm>`.
- Resultaten zijn case-insensitive en gelimiteerd.
- De beheerder kiest een bestaande suggestie of bevestigt expliciet een nieuw merk.
- Een losse tekst zonder gekozen of bevestigd merk blokkeert opslaan met een veldfout.

### Geen automatische productinvulling

Een merkzoekterm vult nooit automatisch productnaam, categorie of verpakking in.

## Buiten scope

- Zoeken op verpakkingstype of verpakkingsinhoud.
- Barcode zoeken.
- Full-text ranking of fuzzy matching.
- Automatisch product aanmaken op basis van zoekterm.
- Oude productmanagement-search-flow met producttype/merkproduct/variant/SKU.

## Acceptatiecriteria

### AC-01 - Zoekterm blijft zichtbaar

Gegeven dat de beheerder `/admin/product-catalogus/producten?q=cola` opent  
Dan staat `cola` in het zoekveld  
En wordt er geen product automatisch aangemaakt of ingevuld.

### AC-02 - Product aanmaken blijft bereikbaar

Gegeven dat er een zoekterm is ingevuld  
Wanneer de beheerder `Product aanmaken` kiest zonder expliciet gekozen resultaatcontext  
Dan opent het productformulier zonder prefill vanuit de zoekterm.

### AC-03 - Merk suggesties zoeken

Gegeven dat de beheerder in het productformulier minimaal twee tekens in het merkveld typt  
Dan vraagt de UI `GET /brands?query=...` op  
En kan de beheerder een bestaand merk kiezen.

### AC-04 - Merk niet impliciet kiezen

Gegeven dat de beheerder tekst in het merkveld typt maar geen suggestie of nieuw merk bevestigt  
Wanneer de beheerder het product opslaat  
Dan toont de UI een veldfout bij merk.

### AC-05 - Productzoekopdracht vanaf twee tekens

Gegeven dat de beheerder nul of één teken in het cataloguszoekveld heeft ingevuld  
Dan wordt er geen productzoekopdracht uitgevoerd.  
Wanneer de beheerder minimaal twee tekens invult  
Dan zoekt de UI naar producten, merken en categorieën die de zoekterm bevatten.

### AC-06 - Gegroepeerde zoekresultaten

Gegeven dat de zoekterm producten, merken of categorieën matcht  
Dan toont de UI resultaten gegroepeerd onder `Producten`, `Merken` en `Categorieën` waar relevant.

### AC-07 - Geen resultaten

Gegeven dat een zoekterm geen producten, merken of categorieën matcht  
Dan toont de UI een geen-resultaten toestand  
En blijft `Product aanmaken` beschikbaar.

### AC-08 - Resultaatselectie verwijdert q

Gegeven dat de beheerder zoekresultaten ziet  
Wanneer de beheerder een merk- of categorieresultaat opent  
Dan wordt `q` verwijderd uit de URL  
En toont de pagina een expliciete browse- of resultaatstaat.
