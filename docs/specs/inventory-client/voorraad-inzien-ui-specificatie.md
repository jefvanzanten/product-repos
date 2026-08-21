# UI-specificatie — Voorraad inzien

- Functionele specificatie: [voorraad-inzien-specificatie.md](./voorraad-inzien-specificatie.md)

## Opbouw

Bovenaan staan het zoekveld en de ordeningsknoppen `Alles`, `Voorraad` en `Datum`. `Alles` is standaard actief. Daaronder staat een productgerichte lijst.

Een productkaart bevat:

- concrete productweergavenaam;
- totaal verpakkingsequivalent, maximaal één decimaal;
- vroegste relevante verloopstatus;
- uitklapbare voorraadregels.

Volledige identieke regels tonen `N× volledig`. Een aangebroken regel toont resterende en maximale inhoud plus een voortgangsbalk. Locatiepad en THT blijven direct herkenbaar.

De gevulde balk betekent resterende inhoud. De definitieve tekstvorm (percentage, hoeveelheid of combinatie) en mass/volume-sliderstappen worden via UI-validatie getweakt; COUNT beweegt altijd per heel stuk.
