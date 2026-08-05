# UI-specificatie — productdetail en verpakkingen

## Status

- Onderdeel: Product Management Admin > productcatalogus
- Functionele specificatie: [product-detail-specificatie.md](./product-detail-specificatie.md)
- Status: productdetail, consumptietype, macroprofiel, gescheiden bewerkflows en verpakkingsafbeeldingen geïmplementeerd; productafbeeldingen en archiveren zijn concept

## Doel

Dit document is de bron van waarheid voor de schermopbouw, kaarten, responsive formulieren en actiepresentatie van productdetail en verpakkingbeheer.

## Productdetail — read-only

### Header

De header toont de weergavenaam als titel met daar direct onder de interactieve categorie-breadcrumb.

```text
Coca-Cola Zero Sugar
Alle categorieën > Voeding > Dranken > Frisdrank > Cola
```

De breadcrumb gebruikt `1.05rem` tekstgrootte met `1.5rem` regelhoogte en is daarmee consistent met de productcatalogus-breadcrumb. De productgegevenskaart mag de categorie daarnaast als volledig tekstpad tonen.

### Kaarten

Productdetail presenteert productgegevens, voedingswaarden en verpakkingen als drie afzonderlijke witte kaarten met een radius van `8px` en een desktopbreedte van `672px`. Tussen de kaarten zit `24px` verticale ruimte.

De productgegevenskaart gebruikt bijvoorbeeld:

```text
Productgegevens
Categorie: Voeding > Dranken > Frisdrank > Cola
Merk: Coca-Cola
Productnaam: Zero Sugar
Weergavenaam: Coca-Cola Zero Sugar
Status: Actief
Consumptietype: Drinken
Afbeelding: <afbeelding of placeholder>
```

Een ontbrekend merk wordt als `-` gepresenteerd. De bewerkactie gebruikt een potloodicoon of editknop met het toegankelijke label `Productgegevens bewerken`.

De middelste kaart heet `Voedingswaarden`. Zonder profiel toont zij `Geen macroprofiel toegevoegd.` en de actie `Macroprofiel toevoegen`. Met profiel toont zij de referentiebasis en alleen bekende waarden; een bekende nulwaarde blijft zichtbaar.

## Verpakkingenlijst

Iedere verpakkingrij presenteert de in de functionele specificatie vastgelegde verpakkinggegevens, een afbeelding of vaste placeholder en de expliciete actie `Verpakking bewerken`.

Voorbeelden:

```text
fles 1,5 l
```

```text
pak 88 g
Per wafel: 4,9 g · 18 per verpakking
```

De actie `Verpakking toevoegen` staat bij de sectie. Een product zonder verpakkingen toont:

```text
Geen verpakkingen gevonden voor dit product.
[ Verpakking toevoegen ]
```

## Productgegevens bewerken

De afgeschermde productgegevens-bewerkmodus gebruikt dezelfde afzonderlijke formulierkaarten als product aanmaken, in deze volgorde:

1. `Categorie`;
2. `Productnaam`;
3. `Merk`;
4. `Consumptietype`.

De desktopcontent is `650px` breed. Tussen de hoofdkaarten zit `42px` verticale ruimte. Op smalle schermen stapelen radioselecties zonder horizontale overflow.

De acties staan onder de kaarten. Op desktop is `Annuleren` `180px` breed en vult `Wijzigingen opslaan` de resterende breedte. Op smalle schermen worden de acties over de volledige breedte gestapeld.

## Voedingswaarden bewerken

Deze afgeschermde modus toont uitsluitend de optionele macroprofielschakelaar, referentiebasis en voedingswaarden. De schakelaar staat volledig binnen de formulierkaart, uitgelijnd in de rechterbovenhoek.

## Verpakking bewerken

De verpakking-bewerkpagina opent direct als formulier zonder tussenliggende read-only verpakkingdetailpagina. Zij toont bestaande verpakkingswaarden en de foto-uploadcomponent. De zichtbare teruglink gebruikt `Terug naar product`.

## Niet-gevonden-toestanden

Product niet gevonden:

```text
Product niet gevonden.
[ Terug naar productcatalogus ]
```

Verpakking niet gevonden binnen een bestaand product:

```text
Verpakking niet gevonden.
[ Terug naar product ]
```
