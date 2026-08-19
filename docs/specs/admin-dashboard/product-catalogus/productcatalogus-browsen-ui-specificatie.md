# UI-specificatie — browsbare productcatalogus

## Status

- Onderdeel: Product Management Admin > productcatalogus
- Functionele specificatie: [productcatalogus-browsen-specificatie.md](./productcatalogus-browsen-specificatie.md)
- Zoekpresentatie: [product-zoeken-ui-specificatie.md](./product-zoeken-ui-specificatie.md)
- Status: geïmplementeerd

## Doel

Dit document is de bron van waarheid voor de schermopbouw, visuele volgorde en lege states van de browsbare productcatalogus.

## Algemene opbouw

De admin-navigatie toont al dat de beheerder zich op `Productcatalogus` bevindt. De contentzone rendert daarom geen extra paginakop. De inhoud start compact onder de admin-navbar met:

1. de zoekbalk;
2. het statusfilter wanneer van toepassing;
3. de breadcrumb;
4. de contextuele browse-inhoud.

De breadcrumb gebruikt `1.05rem` tekstgrootte met `1.5rem` regelhoogte. De adminnavigatie, zoekbalk en breadcrumb blijven op hun plek; alleen de categorieboom scrolt wanneer de browse-inhoud hoger is dan de beschikbare viewport.

## Catalogusroot

```text
[ Zoek product, merk of categorie ]

Alle categorieën
- Dranken
- Voeding
- Huishouden

[ Categorie aanmaken ]
```

De breadcrumb met alleen `Alle categorieën` is de zichtbare context; er staat geen tweede titel `Alle categorieën` in de contentkaart. De root toont geen platte productlijst en geen product-aanmaakactie.

## Categorie-browse

Boven de categorieboom staan de zoekbalk, het statusfilter `Actief` of `Gearchiveerd` en een klikbare breadcrumb. Een geopende categorie presenteert in deze volgorde:

1. de categorierij met categorienaam en beheericoon;
2. directe subcategorieën als ingesprongen categorierijen;
3. directe producten onder de sectietitel `Producten`;
4. de acties `+ Subcategorie` en `+ Product`.

Voorbeeld:

```text
[ Zoek product, merk of categorie ]

Alle categorieën > Voeding > Tussendoortjes > Rijstwafels met smaak

▸ Drinken
▸ Drogisterij
▸ Supplementen
▾ Voeding
  ▸ Brood en broodvervangers
  ▾ Tussendoortjes
    ▸ Knabbelspek
    ▾ Rijstwafels met smaak

      Producten
      - Snack a Jacks Rijstwafels met kaassmaak
        Merk: Snack a Jacks
        zak 23 gram

      [ + Subcategorie ] [ + Product ]
```

- Iedere categoriekaart of -rij toont rechts binnen hetzelfde item een beheerknop met potloodicoon, zonder eigen kaart, outline of scheidingslijn.
- Directe subcategorieën tonen alleen hun eigen naam.
- Wanneer een categorie met directe producten wordt geopend, scrolt de categorieboom automatisch zo ver als nodig om de volledige productsectie in beeld te brengen wanneer die binnen het beschikbare scrollgebied past. Bij een productsectie die hoger is dan het beschikbare scrollgebied blijft de sectie zelf normaal doorscrollbaar.
- De automatische scroll is vloeiend, behalve wanneer de beheerder een voorkeur voor verminderde beweging heeft ingesteld.
- Subcategorieën, productsectie, productkaarten en actieknoppen volgen dezelfde boom-as en blijven binnen dezelfde breedte als de geopende categoriecontext.
- Er is één primaire knop `+ Product`; daarnaast staat maximaal één secundaire knop `+ Subcategorie`.
- Beide acties staan samen onder de inhoud van de geopende categorie.

## Lege categorie

```text
[ Zoek product, merk of categorie ]

Alle categorieën > ... > <Naam huidige categorie>

▾ <Naam huidige categorie>
  Deze categorie is nu nog leeg.
  Maak een nieuwe subcategorie of een product aan om hem te vullen.

  [ + Subcategorie ] [ + Product ]
```

De acties staan samen binnen de lege-state-kaart, onder de uitlegtekst en op dezelfde boom-as als de overige categorie-inhoud.

## Productrij of productkaart

Elke rij of kaart presenteert minimaal:

- weergavenaam;
- merk wanneer aanwezig;
- korte verpakkingssamenvatting;
- statuslabel in de gearchiveerde state.

Voorbeelden van verpakkingssamenvattingen:

```text
fles 1,5 l
blik 330 ml
3 verpakkingen
```

Binnen een geopende categorie hoeft het categoriepad niet in iedere productrij te worden herhaald.

## Lege rootcatalogus

```text
Alle categorieën
Er zijn geen categorieën gevonden.
Maak je eerste categorie aan om de catalogus op te bouwen.
[ Categorie aanmaken ]
```

De state gebruikt dezelfde browse-inhoudszone met minimale hoogte, zodat de actie onder de inhoud blijft staan.

## Modals

Rootcategorie aanmaken:

```text
Nieuwe categorie maken

[ Naam categorie ]

[ Toevoegen ] [ Annuleren ]
```

Subcategorie aanmaken:

```text
Nieuwe subcategorie maken in <huidige categorie>

[ Naam subcategorie ]

[ Toevoegen ] [ Annuleren ]
```

Categorie bewerken:

```text
Categorie bewerken

[ Naam categorie ]

[ Opslaan ] [ Annuleren ]
```

Modals tonen alleen de titel, het invoerveld en de acties, zonder aanvullende uitlegtekst. Invoervelden hebben een toegankelijke naam; een label mag visueel verborgen zijn wanneer het ontwerp alleen een veld toont.
