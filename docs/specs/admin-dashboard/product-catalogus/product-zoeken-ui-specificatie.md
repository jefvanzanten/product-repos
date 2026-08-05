# UI-specificatie — product en merk zoeken

## Status

- Onderdeel: Product Management Admin > productcatalogus
- Functionele specificatie: [product-zoeken-specificatie.md](./product-zoeken-specificatie.md)
- Browse-UI: [productcatalogus-browsen-ui-specificatie.md](./productcatalogus-browsen-ui-specificatie.md)
- Status: geïmplementeerd

## Doel

Dit document is de bron van waarheid voor de presentatie van het cataloguszoekveld en de gegroepeerde zoekresultaten.

## Cataloguszoekveld

```text
[ Zoek product, merk of categorie ]

Alle categorieën
[ Categorie aanmaken ]
```

Het zoekveld blijft zichtbaar in de cataloguscontext. De plaatsing ten opzichte van breadcrumb en browse-inhoud staat in de browse-UI-specificatie.

## Gegroepeerde resultaten

Resultaten worden, wanneer aanwezig, in deze visuele volgorde gegroepeerd:

```text
Producten
- Cola Zero Sugar
  Merk: Coca-Cola
  Categorie: Dranken > Frisdrank > Cola

Merken
- Coca-Cola
  4 producten

Categorieën
- Dranken > Frisdrank > Cola
  12 producten
```

Iedere groep toont haar eigen eventuele `Meer … tonen`-actie. Een gearchiveerd productresultaat toont altijd het tekstlabel `Gearchiveerd`.

## Brand-result state

```text
[ Zoek product, merk of categorie ]

Producten van Heinz

Sauzen
- Heinz Tomato Ketchup
- Heinz Mayonaise

Bonen
- Heinz Baked Beans

[ Product aanmaken voor Heinz ]
```

Categorieën fungeren hier als niet-klikbare groepsheaders. De primaire aanmaakactie staat onder de gegroepeerde producten.

## Geen resultaten

```text
Geen resultaten gevonden voor "<zoekterm>".
Pas je zoekterm aan of kies een categorie om een product aan te maken.
```

Deze toestand toont zonder expliciete categorie- of merkcontext geen product-aanmaakactie.
