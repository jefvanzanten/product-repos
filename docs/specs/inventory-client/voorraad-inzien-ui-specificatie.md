# UI-specificatie — voorraad inzien

## Status

- Onderdeel: Inventory client
- Functionele specificatie: [voorraad-inzien-specificatie.md](./voorraad-inzien-specificatie.md)
- Gedeelde shell: [bottom-tabbar-ui-specificatie.md](../shared/bottom-tabbar-ui-specificatie.md)
- Status: gepland / huidige pagina is nog placeholderachtig

## Doel

Dit document is de bron van waarheid voor de schermopbouw van de productgerichte voorraadlijst.

## Schermopbouw

```text
Inventarisatie

[ Zoek in voorraad ]

<Productregel ingeklapt>
  Product / merk
  Verpakking
  Totaal aantal verpakkingen
  Vroegste houdbaarheidsstatus
  Aantal partijen/locaties   [uitklapindicator]

<Productregel uitgeklapt>
  <Partijregel>
    Volledig locatiepad
    Houdbaarheidsdatum/statuslabel
    Aantal verpakkingen
    [beheerder: mutatieacties]

[ + ] Voorraad toevoegen   (alleen beheerders)
```

## Lijstpresentatie

- De lijst is productgericht, niet locatiegericht.
- De hoofdregel per productverpakking toont het totale aantal verpakkingen over alle locaties en datums.
- Uitklappen toont afzonderlijke partijregels per locatie en houdbaarheidsdatum, met het volledige locatiepad, bijvoorbeeld `Keuken › Koelkast › Lade 1`.
- Meerdere productregels mogen tegelijk uitgeklapt zijn.
- Mutatieacties staan alleen op uitgeklapte partijregels en alleen voor beheerders.
- De toevoegactie opent de voorraad-toevoegen-sheet en geen nieuwe pagina.
- De pagina rendert binnen de gedeelde applicatieshell. De tab `Inventarisatie` verwijst naar deze route.
