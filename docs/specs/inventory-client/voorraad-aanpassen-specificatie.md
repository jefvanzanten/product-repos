# Specificatie — voorraad aanpassen

## Status

- Onderdeel: inventory client
- Route: `/` (acties op uitgeklapte partijregels)
- Status: gepland

## Doel

Een beheerder kan bestaande voorraadpartijen aanpassen: aantal wijzigen, partijen verplaatsen naar een andere opbergplaats en de houdbaarheidsdatum corrigeren. Gewone gebruikers zien deze acties niet.

## Binnen scope

- `+` en `−` per partijregel.
- Exacte voorraadstand instellen per partijregel.
- Een deel van of een volledige partij verplaatsen naar een andere opbergplaats.
- Een deel van of een volledige partij van houdbaarheidsdatum wijzigen, inclusief verwijderen van de datum.
- Mutatielog zonder UI.

## Buiten scope

- Redencodes of verplichte toelichtingen bij mutaties.
- Mutatiegeschiedenis in de UI.
- Automatische voorraadmutaties vanuit consumptielogs.
- Producten, verpakkingen, locatie- of categorienamen bewerken; dat blijft in Product Management Admin.
- Bulkacties op meerdere partijen tegelijk.

## Identiteit en semantiek

- Een partij wordt uniek bepaald door **productverpakking + opbergplaats + houdbaarheidsdatum**; `geen datum` is een eigen waarde.
- Alle acties werken op één concrete partijregel (één locatie, één datum).
- Wijzigingen die op een bestaande doelcombinatie uitkomen, worden samengevoegd: aantallen worden opgeteld.
- Een partij die `0` bereikt, verdwijnt uit de voorraadlijst; de combinatie mag later opnieuw ontstaan of hergebruikt worden.

## Acties

### `+` en `−`

- Verhogen of verlagen met exact één verpakking.
- Acties zijn atomaire relatieve mutaties op de server.
- De zichtbare waarde wordt optimistisch bijgewerkt en de knoppen worden tijdelijk geblokkeerd tot de server bevestigt.
- Bij een fout wordt de oude waarde teruggezet en verschijnt een duidelijke foutmelding.
- `−` is niet beschikbaar bij een aantal van `1` of lager; bij `0` is de partij al uit de lijst verdwenen.

### Exacte voorraadstand instellen

- Een invoerveld zet het aantal naar een exacte nieuwe waarde (minimaal 0).
- De UI toont de huidige stand, bijvoorbeeld `Huidige voorraad: 5` en `Nieuwe voorraad: […]`.
- Deze actie gebruikt een versienummer (optimistic locking): een verouderde versie wordt door de backend geweigerd.
- Bij een versieconflict toont de app de actuele serverstand en vraagt opnieuw te proberen.

### Verplaatsen

- Verplaatst een gekozen aantal (standaard 1, maximaal het actuele aantal) naar een andere opbergplaats uit de locatieboom.
- Productverpakking en houdbaarheidsdatum blijven gelijk.
- De bronpartij wordt atomair verlaagd; de doelpartij wordt aangemaakt of verhoogd.
- Verplaatsen naar dezelfde locatie is niet toegestaan.

### Datum wijzigen

- Wijzigt de houdbaarheidsdatum van een gekozen aantal (standaard 1, maximaal het actuele aantal).
- De nieuwe datum mag ook `geen datum` zijn, zodat een foutief ingevoerde datum kan worden verwijderd.
- Het gewijzigde aantal wordt een nieuwe partij of wordt samengevoegd met een bestaande partij op dezelfde locatie en nieuwe datum.
- Ongewijzigde aantallen blijven in de bronpartij.

## Gelijktijdige aanpassingen

- `+` en `−` zijn relatief en atoom; gelijktijdige aanpassingen tellen correct op.
- Exact instellen gebruikt een versienummer; een verouderde versie wordt geweigerd en de UI toont de actuele stand.
- Verplaatsen en datum wijzigen worden als één atomische transactie uitgevoerd; bij falen wordt niets gedeeltelijk opgeslagen.

## Mutatielog

Iedere mutatie wordt onveranderlijk vastgelegd met minimaal:

- de betroffene partij;
- handelingstype `ADD`, `REMOVE`, `SET`, `MOVE` of `DATE`;
- verschil en/of resulterende stand;
- gebruiker (ID);
- tijdstip.

De log bewaart geen naamsnapshots van locaties of producten; bij hernoemen toont weergave altijd de actuele naam. De mutatielog heeft in deze fase geen eigen UI.

## Gearchiveerde catalogusdata

- Voorraad van een gearchiveerd product of een gearchiveerde verpakking blijft zichtbaar met het label `Gearchiveerd`.
- Verlagen, exact instellen naar een lagere stand, verplaatsen en datum wijzigen blijven toegestaan.
- Verhogen of opnieuw toevoegen aan een gearchiveerde verpakking is niet toegestaan.
- Zodra de voorraad `0` is, verdwijnt de partij uit de actieve lijst.

## Gearchiveerde opbergplaatsen

De gedeelde status- en hiërarchieregels staan in [opbergplaatsen-domeinregels.md](../../domein/opbergplaatsen-domeinregels.md).

- Voorraad op een gearchiveerde opbergplaats blijft zichtbaar met het label `Gearchiveerde locatie`.
- De locatie verschijnt niet meer in de locatieboom of enige locatiekiezer.
- Voorraad kan van de gearchiveerde locatie worden verplaatst of verlaagd, maar niet naar een gearchiveerde locatie worden verplaatst.

## Benodigde backend/API — nog te specificeren

Nog te bepalen:

- endpoints voor `+`/`−`, exact instellen, verplaatsen en datum wijzigen;
- versienummer- of conflictcontract;
- request/response DTO;
- foutcodes voor onbekende partij, locatie of datum, niet-beheerders en versieconflicten.

Het datamodel staat in het [Storage/Inventory ERD](../../backend/ERD/STORAGE_ERD.md).

## Acceptatiecriteria

### AC-01 — Eén erbij, één eraf

Gegeven dat een beheerder een partijregel met aantal 3 bekijkt  
Wanneer de beheerder `+` kiest  
Dan wordt het aantal 4  
En wanneer de beheerder daarna `−` kiest  
Dan wordt het aantal weer 3.

### AC-02 — Exacte stand instellen

Gegeven dat een partij aantal 5 heeft  
Wanneer de beheerder de nieuwe stand op 2 zet en bevestigt  
Dan wordt het aantal 2.

### AC-03 — Versieconflict

Gegeven dat een andere gebruiker dezelfde partij tussentijds heeft gewijzigd  
Wanneer de beheerder een verouderde exacte stand opslaat  
Dan weigert de backend de wijziging  
En toont de app de actuele stand met de vraag opnieuw te proberen.

### AC-04 — Gedeeltelijk verplaatsen

Gegeven dat een partij 5 verpakkingen in locatie A heeft  
Wanneer de beheerder 2 verpakkingen verplaatst naar locatie B  
Dan bevat locatie A nog 3 verpakkingen  
En bevat locatie B een partij met 2 verpakkingen, met dezelfde verpakking en datum.

### AC-05 — Datum corrigeren en verwijderen

Gegeven dat een partij een houdbaarheidsdatum heeft  
Wanneer de beheerder een aantal naar een andere datum wijzigt  
Dan ontstaat of groeit de partij op dezelfde locatie met die datum  
En wanneer de beheerder de datum verwijdert  
Dan hoort dat aantal bij de partij zonder datum.

### AC-06 — Nul verdwijnt

Gegeven dat een partij door mutaties op aantal 0 komt  
Dan verdwijnt de partij uit de voorraadlijst.

### AC-07 — Mutatielog

Gegeven dat een beheerder een mutatie uitvoert  
Dan legt de backend handelingstype, aantallen, gebruiker en tijdstip onveranderlijk vast.

### AC-08 — Read-only gebruiker

Gegeven dat een ingelogde gebruiker geen beheerder is  
Dan ziet de gebruiker geen mutatieacties  
En weigeren de mutatie-endpoints deze gebruiker zelfstandig.
