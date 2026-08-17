# UI-specificatie — Productcatalogus doelmodel v2

- Functionele specificatie: [productmodel-v2-specificatie.md](./productmodel-v2-specificatie.md)

## Cataloguslijst

De bestaande visuele catalogusstructuur blijft herkenbaar. Iedere rij is voortaan één concreet product en gebruikt de gedeelde weergavenaam, bijvoorbeeld:

```text
Heinz Tomatenpuree — blik 200 g
Heinz Tomatenpuree — blik 500 g
Heinz Tomatenpuree — knijpfles 500 g
```

Er is geen geneste package-lijst nodig om een selecteerbaar resultaat te bereiken.

## Productdetail

Het detail scheidt visueel:

- `Gedeelde samenstelling`: naam, merk, categorie, consumptietype en macroprofiel;
- `Dit product`: verpakkingstype, inhoud, afbeelding, barcode, portie en archiefstatus.

Een gedeelde edit vermeldt vóór opslaan hoeveel concrete producten worden geraakt.

## Aanmaken

De flow start met composition-autocomplete. Een gekozen samenstelling toont de overgenomen gedeelde waarden read-only of samengevat; een actie maakt indien nodig een nieuwe samenstelling. Daarna volgen concrete productvelden.

`Nieuw product met dezelfde samenstelling` opent direct de concrete stap met de samenstelling vooraf geselecteerd.

## Voedingsinvoer

Handmatige macrovelden blijven de primaire MVP-interface. De veldstructuur laat later OCR-, screenshot-, clipboard- of tekstsuggesties dezelfde waarden voorinvullen. Suggesties worden visueel als onbevestigd gemarkeerd en nooit automatisch opgeslagen.
