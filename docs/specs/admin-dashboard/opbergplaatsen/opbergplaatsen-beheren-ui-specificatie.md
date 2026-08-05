# UI-specificatie — opbergplaatsen beheren

## Status

- Onderdeel: Product Management Admin > opbergplaatsen
- Functionele specificatie: [opbergplaatsen-beheren-specificatie.md](./opbergplaatsen-beheren-specificatie.md)
- Gedeelde admin-UI: [admin-dashboard-ui-specificatie.md](../admin-dashboard-ui-specificatie.md)
- Status: geïmplementeerd

## Doel

Dit document is de bron van waarheid voor de schermopbouw, boompresentatie, responsive maatvoering en visuele toestanden van de opbergplaatsenbeheerpagina. Gedrag, autorisatie, validatie en mutatieregels staan in de functionele specificatie.

## Paginaopzet

De pagina staat onder de admin-navbar en houdt dezelfde `16px` ruimte tot die navbar aan als de productcatalogus. De inhoud staat in één witte beheerkaart:

```text
Opbergplaatsen
Beheer de plaatsen waar voorraad kan worden opgeslagen.

[ Actief ] [ Gearchiveerd ]

┌ scrollbare locatieboom ───────────────────────┐
│ ▾ Keuken                                  ✎  │
│   ▸ Voorraadkast                          ✎  │
│   ▾ Koelkast                              ✎  │
│     ▸ Lade 1                              ✎  │
└───────────────────────────────────────────────┘

[ Hoofdlocatie toevoegen ]
```

De paginakop bevat uitsluitend de titel en beschrijving. Er staat geen actieknop in de paginakop of boven het statusfilter.

## Hoogte en scrollgedrag

- De pagina en beheerkaart gebruiken de beschikbare hoogte binnen de vaste admin-layout.
- De titel, beschrijving, statusfilters en onderste hoofdlocatieactie blijven op hun plaats staan.
- Alleen de locatieboom scrolt verticaal wanneer de locaties niet binnen de beschikbare hoogte passen.
- De boom reserveert stabiele ruimte voor haar scrollbar, zodat de rijen en acties niet horizontaal verspringen wanneer overflow ontstaat.
- De knop onder een gevulde boom staat buiten het scrollgebied en wordt niet door de locaties naar beneden gedrukt.
- De pagina zelf krijgt geen tweede verticale scrollbar rondom de boom.

## Statusfilter

Het statusfilter staat direct onder de paginakop en bestaat uit twee even brede segmenten:

```text
[ Actief ] [ Gearchiveerd ]
```

De actieve keuze krijgt een witte ondergrond en groene tekst binnen de lichtgrijze filterbalk. `Actief` is visueel de standaardkeuze.

## Gevulde actieve boom

- Iedere locatie staat in een witte rijkaart met dezelfde visuele taal als de categorieboom: een subtiele border, afgeronde hoeken, lichte schaduw en een minimale hoogte van `50px`.
- Een sublocatie springt als volledige rijkaart in. Niet alleen de naam, maar ook de kaart en beheeractie volgen de boomdiepte.
- Iedere volgende diepte springt `1rem` in, met een begrenzing voor zeer diepe bomen.
- Rijen en zichtbare kindgroepen hebben onderling `0.5rem` ruimte.
- Lange locatienamen worden op één regel afgekapt met een ellipsis; de beheeractie blijft zichtbaar.
- De uitklapindicator is groen, heeft een tekstgrootte van `1.5rem` en draait bij een geopende tak naar beneden. De categorieboom gebruikt dezelfde grotere indicator.
- Meerdere takken mogen gelijktijdig openstaan.

## Hoofdlocatieactie

Bij een gevulde actieve boom staat `Hoofdlocatie toevoegen` onder de scrollbare boom en binnen dezelfde beheerkaart. Op mobiel gebruikt deze knop de volledige beschikbare breedte.

De actie staat niet:

- in de paginakop;
- boven het statusfilter;
- in de gearchiveerde weergave.

## Actiemenu per locatie

Iedere locatierij toont rechts hetzelfde potloodicoon van `18px` als een categorie in Product Management Admin. De knop heeft geen tekstlabel in het zichtbare ontwerp; de toegankelijke naam bevat de locatienaam.

Het menu:

- is aan het potloodicoon verankerd;
- opent direct onder het icoon;
- ligt als overlay boven de overige inhoud en neemt geen structurele ruimte tussen de rijen in;
- veroorzaakt bij openen geen scrollsprong of horizontale layoutverschuiving;
- gebruikt dezelfde witte achtergrond, border, radius, schaduw en menu-itemvorm als het categorie-actiemenu.

Welke acties beschikbaar zijn en wanneer het menu sluit, staat in de functionele specificatie.

## Lege actieve toestand

Wanneer geen actieve locaties bestaan, vervangt een gestippelde lege-state-kaart de boom:

```text
Nog geen opbergplaatsen
Voeg een hoofdlocatie toe om de gedeelde locatieboom op te bouwen.

[ Hoofdlocatie toevoegen ]
```

De primaire actie staat in deze lege-state-kaart. Er staat dan geen tweede hoofdlocatieknop onder of boven de lege toestand.

## Gearchiveerde weergave

De archiefweergave gebruikt dezelfde rij- en boomopmaak. Een archieftak begint bij de locatie die de tak rechtstreeks inactiveerde:

```text
Keuken › Koelkast                 zelf gearchiveerd
  Lade 1                          via bovenliggende locatie inactief
  Lade 2                          via bovenliggende locatie inactief
```

- Een gearchiveerde rootregel toont haar volledige pad.
- De eigen en overgeërfde archiefstatus staan tekstueel onder of naast de locatienaam en worden niet uitsluitend met kleur aangegeven.
- De archiefweergave toont geen hoofdlocatieactie.
- Zonder gearchiveerde locaties toont de kaart een neutrale lege toestand zonder actieknop.

## Dialogs

Naam-, verplaats- en archiefacties openen een semantische modale dialog met een verduisterde backdrop.

Desktop:

- de dialog is compact en maximaal `34rem` breed;
- de inhoud heeft afgeronde hoeken en interne padding;
- de actieknoppen staan rechts onder de formulierinhoud.

Mobiel tot en met `520px`:

- de dialog wordt als bottom sheet tegen de onderkant geplaatst;
- de dialog gebruikt de volledige beschikbare viewportbreedte, inclusief haar padding binnen die breedte;
- alleen de bovenhoeken zijn afgerond;
- de dialog kan intern scrollen en is maximaal `92vh` hoog;
- de dialog laat geen onbedoelde strook of horizontale overflow aan de rechterkant achter.

## Responsive gedrag

- De beheerkaart gebruikt op smalle schermen `0.75rem` interne padding.
- Locatienamen mogen krimpen en afkappen, maar het uitklapicoon en potloodicoon blijven bereikbaar.
- De hoofdlocatieactie onder een gevulde boom wordt op mobiel schermbreed binnen de kaart.
- De boom blijft verticaal scrollbaar zonder horizontale paginaoverflow.
