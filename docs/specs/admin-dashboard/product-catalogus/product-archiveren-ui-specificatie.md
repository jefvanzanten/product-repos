# UI-specificatie — producten en verpakkingen archiveren

## Status

- Onderdeel: Product Management Admin > productcatalogus
- Functionele specificatie: [product-archiveren-specificatie.md](./product-archiveren-specificatie.md)
- Status: concept

## Doel

Dit document is de bron van waarheid voor de zichtbare statussen, archiveer- en herstelacties en bevestigingen rond catalogusarchivering.

## Statuspresentatie

De catalogus biedt een zichtbaar statusfilter:

```text
[ Actief ] [ Gearchiveerd ]
```

Een gearchiveerd product of een gearchiveerde verpakking toont altijd het tekstlabel `Gearchiveerd`; de status wordt niet uitsluitend met kleur gecommuniceerd.

## Productacties

Een actief productdetail toont `Product archiveren`. Voor uitvoering verschijnt een eenvoudige bevestiging met:

- de productnaam;
- uitleg dat alle verpakkingen uit actieve zoekresultaten verdwijnen;
- een expliciete bevestigings- en annuleeractie.

Een gearchiveerd productdetail toont in plaats daarvan `Product heractiveren`.

## Verpakkingacties

De verpakking-bewerkpagina toont afhankelijk van de status:

- `Verpakking archiveren`; of
- `Verpakking heractiveren`.

Voor het archiveren mag dezelfde compacte bevestigingsvorm als bij productarchivering worden gebruikt. Er is geen permanente verwijderactie zichtbaar.
