# Specificatie — Productcatalogus doelmodel v2

## Status

- Onderdeel: Product Management Admin > productcatalogus
- Status: doelmodel; vervangt het selecteerbare root-plus-verpakkingenmodel
- ERD: [PRODUCT_ERD.md](../../../backend/ERD/PRODUCT_ERD.md)
- Domeinregels: [productcatalogus-domeinregels.md](../../../domein/productcatalogus-domeinregels.md)
- Doelcontract: [PRODUCT_CATALOG_V2_ENDPOINTS.md](../../../backend/Endpoints/PRODUCT_CATALOG_V2_ENDPOINTS.md)
- UI-specificatie: [productmodel-v2-ui-specificatie.md](./productmodel-v2-ui-specificatie.md)

## Doel

Iedere concrete verpakking/uitvoering wordt één rechtstreeks selecteerbaar `product`. Gedeelde naam-, merk-, categorie-, consumptietype- en voedingsdata staat in `product_composition`.

## Catalogusresultaten

- De catalogus toont een platte lijst concrete producten en blijft visueel zo dicht mogelijk bij de bestaande productresultaten.
- Resultaatnaam is bijvoorbeeld `Heinz Tomatenpuree — blik 200 g`.
- Er is geen selecteerbaar root- of verpakkingsresultaat meer.
- Admin, Calorie Tracker, recepten en Inventory gebruiken dezelfde formattering.

## Aanmaken

1. Beheerder zoekt via autocomplete een bestaande productsamenstelling op naam en merk.
2. Bij selectie worden naam, merk, categorie, consumptietype en macroprofiel gedeeld.
3. Zonder match maakt de beheerder een nieuwe samenstelling en optioneel macroprofiel.
4. Daarna voert die productspecifiek verpakkingstype, inhoud, afbeelding, barcode en optionele portie in.
5. Een actie `Nieuw product met dezelfde samenstelling` versnelt extra verpakkingsformaten.

Geen koppeling wordt uitsluitend door tekstsimilariteit automatisch opgeslagen.

## Bewerken

- Gedeelde velden tonen expliciet dat alle producten binnen de samenstelling worden geraakt.
- Productvelden wijzigen alleen het concrete product.
- Macrocorrecties werken live door in alle producten van de samenstelling en alle afgeleide domeinen.
- Een product dat werkelijk anders is samengesteld wordt in de MVP gearchiveerd en opnieuw onder een nieuwe samenstelling aangemaakt.

## Archiveren

- Alleen concrete producten zijn archiveerbaar.
- Een productsamenstelling blijft als historische en administratieve groepering bestaan.
- Een samenstelling zonder actieve producten verdwijnt uit gewone clientzoekresultaten, maar blijft in admin-autocomplete beschikbaar.

## Voedingsinvoer na MVP

Should have:

- mobiel foto-extractie van een voedingstabel;
- desktop afbeelding, screenshot/plakken of geselecteerde tekst;
- OCR geeft alleen voorstellen voor referentiebasis en macrovelden;
- beheerder controleert en bevestigt altijd;
- dezelfde formulierfields ondersteunen handmatige invoer en latere suggesties.

## Migratieacceptatie

- Iedere oude verpakking krijgt een nieuwe product-UUID.
- Mapping migreert alle package-FK's naar product-FK's.
- Een product is na migratie gearchiveerd als root of verpakking gearchiveerd was.
- Verpakkingsafbeelding wordt productafbeelding.
- Productportie en inhoud blijven behouden.
- Een afwijkingsrapport toont oude roots met meerdere verpakkingen vóór uitvoering.
