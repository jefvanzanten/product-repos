# UI-specificatie — Recepten-app

- Functionele specificatie: [recipe-app-spec.md](./recipe-app-spec.md)
- Status: doelmodel / MVP

## Overzicht `/recepten`

De beginpagina is direct het volledige publieke receptenoverzicht. Zij bevat:

1. titel `Recepten`;
2. zoekbalk;
3. sortering, standaard `Nieuwste eerst`;
4. beschikbare filters;
5. receptenlijst;
6. voor ingelogde gebruikers de navigatielink `Mijn recepten`.

Er is geen afzonderlijke landingspagina met alleen recente recepten.

## Gebruikersoverzicht

`/recepten/gebruiker/:userId` gebruikt dezelfde receptkaarten. De eigenaar ziet publieke en privé-recepten en kan `Gearchiveerd` kiezen. Andere bezoekers zien alleen publieke recepten. Privéstatus wordt met tekst aangegeven en nooit uitsluitend met kleur.

## Receptdetail

Het detail toont in deze volgorde:

- receptnaam;
- naam van de maker, niet klikbaar;
- aantal porties;
- ingrediënten met concrete productnaam/merk, hoeveelheid en eenheid;
- optionele bereidingsinstructies;
- alleen voor de maker: bewerken, zichtbaarheid wijzigen en archiveren/herstellen.

De pagina toont geen afbeelding, calorieën of macro's in de MVP.

## Ingrediënteneditor

- productautocomplete zoekt concrete actieve producten;
- resultaat gebruikt de gedeelde afgeleide productweergavenaam;
- hoeveelheid en eenheid volgen na productselectie;
- productportie is beschikbaar wanneer gedefinieerd;
- vanaf één volledige verpakking kan een informatieve equivalente tekst verschijnen zonder `×`, bijvoorbeeld `2 blikken`;
- een gearchiveerd ingrediënt krijgt bij bewerken een melding en moet worden vervangen.

## Toestanden

- Onbekend, privé voor een ander en gearchiveerd voor publieke toegang delen één verzorgde 404-presentatie.
- Lege publieke lijst: `Geen recepten gevonden`.
- Lege eigen lijst bevat een actie om een eerste recept aan te maken.
- Opslaan en archiveren blokkeren dubbel indienen en behouden formulierdata bij herstelbare fouten.
