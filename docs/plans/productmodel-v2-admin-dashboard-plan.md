# Implementatieplan — Product Management Admin productmodel v2

## Slice A1 — Platte readlijst

- Zet catalogusloader om naar concrete productresultaten.
- Behoud bestaande visuele lijst en categorieboom zoveel mogelijk.
- Toon verpakkingstype, inhoud en eenheid in de afgeleide naam.
- Link ieder resultaat rechtstreeks naar `/product-catalogus/:productId`.
- Voeg regressietests toe voor zoek-, categorie-, merk- en archieffilters.

## Slice A2 — Concrete productdetail

- Toon gedeelde compositionvelden en concrete productvelden als aparte secties.
- Label gedeelde edits met het aantal geraakte producten.
- Verwijder package-subdetail als primaire flow.
- Behoud afbeelding, barcode, portie, archive en restore per concreet product.

## Slice A3 — Aanmaken

- Start met composition autocomplete op naam en merk.
- Bestaande composition: hergebruik gedeelde data en macroprofiel.
- Nieuwe composition: naam, merk, categorie, consumptietype en optionele macro's.
- Concrete stap: package type, inhoud, image, barcode en optionele portie.
- Voeg actie `Nieuw product met dezelfde samenstelling` toe.

## Slice A4 — Bewerken en archiveren

- Compositionwijzigingen werken op alle children na expliciete impactmelding.
- Productwijzigingen blijven lokaal.
- Alleen concrete producten archiveren/herstellen.
- Afwijkende samenstelling in MVP: archiveer foutieve product en maak nieuw; geen move/splitactie.

## Slice A5 — Migratiecompatibiliteit

- Maak v1 create/package-routes read-only of redirect zodra v2-write live is.
- Verwijder oude packageforms pas na consumer-cutover.
- Test `source`-behoud door alle nieuwe routes en mutations.

## Should have

- Mobiel foto-OCR voor voedingstabel.
- Desktop upload, screenshot/clipboard en tekstextractie.
- Suggesties vullen bestaande macrovelden; beheerder bevestigt altijd.
