# UI-specificatie — product aanmaken

## Status

- Onderdeel: Product Management Admin > productcatalogus
- Functionele specificatie: [product-aanmaken-specificatie.md](./product-aanmaken-specificatie.md)
- Status: consumptietype en macroprofiel geïmplementeerd; afbeeldingen en overige Calorie Tracker-data zijn concept

## Doel

Dit document is de bron van waarheid voor de schermopbouw, maatvoering en responsive presentatie van het product-aanmaakformulier.

## Schermopbouw

```text
Product aanmaken
Vul categorie, merk, product, voedingswaarden en verpakking in.

Alle categorieën > <volledig pad naar geselecteerde categorie>

Categorie
- bestaande categorieboom
- hoofdcategorie toevoegen
- subcategorie toevoegen
- categorie verwijderen wanneer toegestaan

Productnaam
- productnaam
- optionele productafbeelding

Merk, optioneel
- typ om merken te zoeken
- bestaand merk kiezen
- nieuw merk aanmaken

Consumptietype
- voeding, drinken of supplement

Verpakking
- verpakkingstype
- volledige verpakkingsinhoud + inhoudseenheid
- optionele portie of stuk
  - vrije naam
  - portiegrootte + inhoudseenheid
  - optioneel aantal per verpakking
  - informatieve som van porties wanneer het aantal is ingevuld
- optionele verpakkingsafbeelding

Voedingswaarden, standaard uit
- macroprofiel toevoegen
- referentiebasis
- optionele calorieën, eiwit, koolhydraten en vet
- voorlopige berekende calorieën wanneer mogelijk

[ Product opslaan ]
```

## Layoutregels

- De volledige breadcrumb staat buiten de categorieselector, direct onder de paginatitel en introductietekst en boven het productformulier.
- De paginatitel, introductietekst en breadcrumb blijven vast zichtbaar. Alleen het productformulier eronder scrolt verticaal; de categorieboom behoudt daarnaast haar eigen interne scrollgebied.
- De breadcrumb begint met `Alle categorieën` en toont daarna het volledige pad naar de geselecteerde categorie. Zonder geselecteerde categorie toont de breadcrumb alleen `Alle categorieën`.
- De categorieboom gebruikt voor categorierijen, inspringing en chevrons dezelfde visuele patronen als de categorieboom van de browsbare productcatalogus.
- Bij een vooraf geselecteerde categorie mag de categorieboom initieel alleen het pad naar die categorie openklappen en mogen andere takken ingeklapt blijven.
- De geselecteerde categorierij is direct zichtbaar zonder handmatig scrollen.
- De desktopcontent heeft een breedte van `650px`; onder deze breedte blijft de content vloeibaar.
- Formulierkaarten hebben een radius van `18px`; invoervelden, selecties en radiotegels zijn `44px` hoog.
- Tussen de hoofdkaarten zit afhankelijk van de ontwerpsectie `40px` tot `42px` verticale ruimte.
- Onder de desktopbreedte stapelen consumptietype-, referentiebasis- en macrovelden verticaal zonder horizontale overflow.
- Het macroprofiel staat initieel uit. De ingeschakelde ontwerpweergave beschrijft de uitgeklapte toestand na activering.
- De schakelaar voor voedingswaarden staat volledig binnen de formulierkaart, uitgelijnd in de rechterbovenhoek.
- De primaire knop `Product opslaan` gebruikt `1rem` verticale padding.
