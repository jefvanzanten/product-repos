# Functionele specificatie - Productcatalogus MVP

## 1. Doel

De productcatalogus in het admin dashboard laat een beheerder catalogusdata beheren die later door de inventarisatieclient gebruikt kan worden.

De MVP richt zich op de kleinste complete flow:

1. producten vinden;
2. producten aanmaken;
3. producten bewerken;
4. merken hergebruiken of inline aanmaken;
5. categorieen hergebruiken of inline aanmaken;
6. verpakkingen toevoegen en bewerken.

De productcatalogus beheert stamdata. Voorraad, locaties, minimumaantallen en tellingen horen niet bij deze module.

## 2. MVP-scope

### 2.1 Binnen MVP

- Productoverzicht als startscherm.
- Product zoeken.
- Filteren op merk en categorie.
- Product aanmaken in een formulier.
- Product bewerken.
- Productdetail bekijken.
- Merk kiezen of inline aanmaken.
- Categorie kiezen of inline aanmaken.
- Een nieuwe categorie een niveau tegelijk aanmaken.
- Eerste verpakking verplicht aanmaken bij een nieuw product.
- Extra verpakkingen toevoegen aan een bestaand product.
- Verpakkingen bewerken.
- Basisvalidatie.
- Strenge duplicaatcontrole voor merken, categorieen, producten en verpakkingen.
- Responsive gebruik op mobiel en desktop/web.
- Lege-catalogus-flow waarbij het eerste product direct aangemaakt kan worden.

### 2.2 Buiten MVP

- Barcode/EAN.
- Productfoto's.
- Statussen zoals actief, concept, controle nodig of gepubliceerd.
- Archiveren, heractiveren en verwijderen.
- Apart archief.
- Rollen en bevoegdheden binnen deze module.
- Voorraad, voorraadlocaties, minimumaantallen en voorraadmutaties.
- Apart catalogus-dashboard met metrics of datakwaliteitstaken.
- Apart merkenbeheer.
- Apart categoriebeheer.
- Categorieen hernoemen, verplaatsen of verwijderen.
- Merk bewerken, verwijderen of samenvoegen.
- Productfamilie/variant/wizard-flow als UI-concept.
- Review- of publicatiestap.
- Bulkimport en bulkexport.
- Externe productdatabases.

## 3. Kernprincipes

1. Het startscherm is het productoverzicht, niet een leeg zoekscherm en niet een apart dashboard.
2. Een beheerder kan altijd direct een product aanmaken.
3. Een product wordt altijd aangemaakt met minimaal een eerste verpakking.
4. Merk en productnaam blijven gescheiden.
5. De UI toont wel een samengestelde weergavenaam.
6. Categorie is verplicht.
7. Merk is optioneel.
8. Categorieen en merken kunnen tijdens productaanmaak worden aangemaakt zonder het formulier te verlaten.
9. Categorieen worden een niveau tegelijk aangemaakt.
10. De UI gebruikt eenvoudige catalogustermen: categorie, merk, product en verpakking.
11. Duplicaten worden geblokkeerd, niet alleen achteraf opgeschoond.
12. Mobiel en desktop zijn allebei belangrijk.

## 4. Terminologie

| UI-term | Betekenis | Voorbeeld |
| --- | --- | --- |
| Categorie | Groep waarin een product wordt geplaatst | Voeding & drinken > Dranken > Frisdrank > Cola |
| Merk | Merknaam van het product | Coca-Cola |
| Product | Het herkenbare product los van verpakking | Zero Sugar |
| Weergavenaam | Merk plus productnaam, of alleen productnaam bij merkloos product | Coca-Cola Zero Sugar |
| Verpakking | De concrete verkoop- of voorraadeenheid | fles 1,5 l |

De UI gebruikt in de MVP niet centraal de termen:

- producttype;
- productfamilie;
- merkproduct;
- variant;
- uitvoering;
- SKU;
- publicatiestatus.

Als deze begrippen technisch nog bestaan, worden ze in de UI vertaald naar categorie, merk, product en verpakking.

Mapping vanuit oudere ontwerpen of technisch model:

| Oude term | MVP UI-term |
| --- | --- |
| Producttype | Categorie |
| Merkproduct | Merk |
| Variant | Product |
| Uitvoering/SKU | Verpakking |

## 5. Conceptueel model

### 5.1 Categorie

- Een categorie heeft een naam.
- Een categorie kan optioneel een parentcategorie hebben.
- Een categorie kan subcategorieen hebben.
- Een product mag aan elke categorie worden gekoppeld, ook aan een parentcategorie.
- De UI helpt de beheerder om een logische categorie te kiezen, maar blokkeert parentcategorieen niet.

### 5.2 Merk

- Een merk heeft een naam.
- Een product kan nul of een merk hebben.
- Merk is optioneel.

### 5.3 Product

- Een product heeft verplicht een productnaam.
- Een product heeft verplicht een categorie.
- Een product kan optioneel een merk hebben.
- Een product heeft minimaal een verpakking.
- De productnaam bevat bij voorkeur niet opnieuw de merknaam.

Voorbeeld:

```text
Merk:          Coca-Cola
Productnaam:   Zero Sugar
Weergavenaam:  Coca-Cola Zero Sugar
```

Niet gewenst:

```text
Merk:          Coca-Cola
Productnaam:   Coca-Cola Zero Sugar
Weergavenaam:  Coca-Cola Coca-Cola Zero Sugar
```

### 5.4 Verpakking

- Een verpakking hoort bij precies een product.
- Een verpakking beschrijft verpakkingstype, inhoud, aantal en eenheidsoort.
- Een verpakking heeft in MVP geen barcode, foto of status.

## 6. Startscherm: productoverzicht

### 6.1 Doel

Het productoverzicht is het startscherm van de productcatalogus. De beheerder ziet direct producten en kan zoeken, filteren of een nieuw product aanmaken.

### 6.2 Inhoud

Het overzicht toont:

- zoekveld;
- filters voor categorie en merk;
- lijst met producten;
- primaire actie `Product aanmaken`;
- lege toestand als er nog geen producten zijn.

### 6.3 Productrij of productkaart

Elke productrij of productkaart toont minimaal:

- samengestelde productnaam;
- merk, als die bestaat;
- categoriepad of eindcategorie;
- korte verpakkingssamenvatting;
- klik- of tapactie naar productdetail.

Voorbeelden:

```text
Voeding & drinken > Dranken > Frisdrank > Cola
Coca-Cola Zero Sugar
fles 1,5 l
```

```text
Voeding & drinken > Koffie & thee > Koffiecapsules
Nescafe Dolce Gusto Lungo
doos met 16 capsules
```

Als een product meerdere verpakkingen heeft, mag de samenvatting bijvoorbeeld zijn:

```text
3 verpakkingen
```

### 6.4 Sortering

Standaard toont het overzicht de meest recent aangemaakte producten bovenaan.

### 6.5 Responsive gedrag

- Op mobiel worden producten als kaarten getoond.
- Op mobiel staat `Product aanmaken` onderaan sticky, boven eventuele navigatie.
- Op desktop/web mag het overzicht als tabel of brede lijst worden getoond.
- Op desktop/web staat de primaire actie bovenaan of rechtsboven.
- De sticky knop mag geen content onbereikbaar maken.

## 7. Lege catalogus

Als er nog geen producten bestaan, toont het productoverzicht een lege toestand.

De lege toestand bevat:

- korte uitleg dat er nog geen producten zijn;
- primaire actie `Eerste product aanmaken`;
- eventueel uitleg dat merk en categorie tijdens het aanmaken gekozen of aangemaakt kunnen worden.

`Eerste product aanmaken` opent direct het productformulier. Er is geen verplichte zoekstap.

## 8. Zoeken en filteren

### 8.1 Zoeken

De MVP zoekt op:

- samengestelde productnaam;
- productnaam;
- merknaam;
- categorienaam;
- categoriepad;
- verpakkingsomschrijving.

De MVP zoekt niet op:

- barcode;
- alias;
- foto;
- externe productdatabase.

### 8.2 Zoekresultaten

Zoeken toont producten die overeenkomen met de zoekterm. Een productresultaat opent direct het productdetail.

Als er geen passend product is, blijft `Product aanmaken` beschikbaar. De zoekterm mag als suggestie worden meegenomen naar het formulier, maar wordt niet automatisch opgeslagen als productnaam, merk of categorie.

### 8.3 Filters

De MVP ondersteunt filters op:

- categorie;
- merk.

Geen statusfilter in MVP.

## 9. Product aanmaken

### 9.1 Formulier

`Product aanmaken` opent een formulier met secties:

1. Productgegevens;
2. Categorie;
3. Merk;
4. Eerste verpakking.

De MVP gebruikt geen wizard, reviewstap of publicatiestap.

### 9.2 Productgegevens

Velden:

- categorie, verplicht;
- merk, optioneel;
- productnaam, verplicht.

De UI toont live de weergavenaam.

Voorbeeld:

```text
Merk:          Coca-Cola
Productnaam:   Zero Sugar
Weergavenaam:  Coca-Cola Zero Sugar
```

Als de productnaam de gekozen merknaam lijkt te herhalen, toont de UI een waarschuwing. De gebruiker kan de invoer aanpassen voordat het product wordt opgeslagen.

Voorbeeldmelding:

```text
De productnaam lijkt de merknaam al te bevatten. Gebruik bijvoorbeeld "Zero Sugar" als productnaam.
```

### 9.3 Eerste verpakking

Een nieuw product kan niet worden opgeslagen zonder eerste verpakking.

Velden:

- verpakkingstype, verplicht;
- inhoudshoeveelheid, optioneel;
- inhoudseenheid, verplicht als inhoudshoeveelheid is ingevuld;
- aantal per verpakking, verplicht en standaard `1`;
- eenheidsoort, verplicht wanneer aantal per verpakking groter is dan `1` of wanneer de verpakking telbaar is.

Geen barcodeveld in MVP.

Het formulier toont live een verpakkingsvoorbeeld.

Voorbeelden:

```text
fles 1,5 l
blik 330 ml
doos met 16 capsules
multipack 6 x 330 ml blik
```

### 9.4 Opslaan

Bij succesvol opslaan:

- product, merkrelatie, categorie en eerste verpakking worden opgeslagen;
- het productdetail opent;
- het nieuwe product is zichtbaar in het overzicht zonder handmatig verversen.

Product plus eerste verpakking worden bij voorkeur transactioneel opgeslagen. Als opslaan mislukt, mag geen onduidelijke half-aangemaakte toestand ontstaan.

## 10. Merk kiezen of aanmaken

### 10.1 Merk kiezen

Het merkveld ondersteunt:

- bestaande merken tonen;
- zoeken binnen bestaande merken;
- een merk selecteren;
- geen merk kiezen.

Merk is optioneel. De gebruiker hoeft geen dummymerk zoals `Onbekend` of `Geen merk` aan te maken.

### 10.2 Merk inline aanmaken

Vanuit het productformulier kan de beheerder een nieuw merk aanmaken.

Regels:

- nieuw merk heeft minimaal een naam;
- aanmaken gebeurt zonder het productformulier te verlaten;
- reeds ingevoerde productgegevens blijven behouden;
- na aanmaken wordt het nieuwe merk automatisch geselecteerd;
- dubbele merknamen worden geblokkeerd.

Er is geen apart merkenbeheer in MVP.

## 11. Categorie kiezen of aanmaken

### 11.1 Categorie kiezen

Het categorieveld ondersteunt:

- bestaande categorieen tonen;
- zoeken binnen categorieen;
- categoriepad tonen;
- categorie selecteren.

Categorie is verplicht.

Producten mogen aan elke categorie worden gekoppeld, ook aan een parentcategorie. De UI mag stimuleren om een zo specifiek mogelijke categorie te kiezen, maar blokkeert parentcategorieen niet.

### 11.2 Categorie inline aanmaken

Vanuit het productformulier kan de beheerder een nieuwe categorie aanmaken.

Regels:

- een nieuwe categorie wordt een niveau tegelijk aangemaakt;
- de beheerder kiest een bestaande parentcategorie of maakt een hoofdcategorie aan;
- de naam is verplicht;
- aanmaken gebeurt zonder het productformulier te verlaten;
- reeds ingevoerde productgegevens blijven behouden;
- na aanmaken wordt de nieuwe categorie automatisch geselecteerd;
- dezelfde categorienaam onder dezelfde parent wordt geblokkeerd.

Voorbeeld:

Als `Voeding & drinken` al bestaat, kan de beheerder daaronder `Dranken` aanmaken. Daarna kan onder `Dranken` eventueel `Frisdrank` worden aangemaakt. Daarna kan onder `Frisdrank` eventueel `Cola` worden aangemaakt.

Een volledig pad in een keer aanmaken, zoals `Dranken > Frisdrank > Cola`, is geen MVP-vereiste.

Er is geen apart categoriebeheer in MVP.

## 12. Productdetail

Productdetail toont:

- weergavenaam;
- merk, als die bestaat;
- productnaam;
- categoriepad;
- alle verpakkingen;
- actie `Product bewerken`;
- actie `Verpakking toevoegen`.

Elke verpakking toont minimaal:

- verpakkingstype;
- inhoud en eenheid, indien van toepassing;
- aantal per verpakking;
- eenheidsoort, indien van toepassing;
- leesbare verpakkingsomschrijving.

Voorbeeld:

```text
Coca-Cola Zero Sugar
Categorie: Voeding & drinken > Dranken > Frisdrank > Cola
Merk: Coca-Cola

Verpakkingen
- fles 1,5 l
- blik 330 ml
- multipack 6 x 330 ml blik
```

## 13. Bewerken

### 13.1 Product bewerken

De beheerder kan wijzigen:

- categorie;
- merk;
- productnaam.

Bij wijzigen blijft de live weergavenaam zichtbaar.

Duplicaatcontrole wordt opnieuw toegepast voordat wijzigingen worden opgeslagen.

### 13.2 Verpakking toevoegen

Vanaf productdetail kan de beheerder een extra verpakking toevoegen. Product, merk en categorie zijn dan al bekend en worden niet opnieuw gevraagd.

### 13.3 Verpakking bewerken

De beheerder kan verpakkingsvelden wijzigen.

In MVP kan een verpakking niet worden verwijderd, gearchiveerd of hersteld.

## 14. Seeddata

De MVP levert vaste keuzelijsten. Deze lijsten zijn in MVP niet beheerbaar via UI.

### 14.1 Verpakkingstypen

Minimaal:

- fles;
- blik;
- pot;
- zak;
- doos;
- pak;
- tube;
- bus;
- tray;
- multipack;
- los stuk;
- overig.

### 14.2 Inhoudseenheden

Minimaal:

- gram;
- kilogram;
- milliliter;
- centiliter;
- liter;
- stuk.

### 14.3 Eenheidsoorten

Minimaal:

- fles;
- blik;
- capsule;
- stuk;
- tablet;
- zakje;
- rol;
- vel;
- overig.

## 15. Validatie en duplicaatcontrole

### 15.1 Algemene validatie

- Verplichte velden tonen een foutmelding als ze leeg zijn.
- Inhoudshoeveelheid moet groter zijn dan `0` als deze is ingevuld.
- Inhoudseenheid is verplicht als inhoudshoeveelheid is ingevuld.
- Aantal per verpakking is verplicht en moet een positief geheel getal zijn.
- Validatiefouten staan direct onder het relevante veld.
- Bij meerdere fouten mag bovenaan een korte samenvatting worden getoond.
- Ingevoerde gegevens blijven behouden na een fout.

### 15.2 Normalisatie

Voor duplicaatcontrole normaliseert het systeem minimaal:

- hoofdletterongevoelig vergelijken;
- spaties aan begin en einde negeren;
- meerdere opeenvolgende spaties behandelen als een spatie.

### 15.3 Blokkerende duplicaatregels

De MVP blokkeert:

- merk met dezelfde genormaliseerde merknaam;
- categorie met dezelfde genormaliseerde naam onder dezelfde parent;
- product met dezelfde categorie, hetzelfde merk en dezelfde genormaliseerde productnaam;
- verpakking met dezelfde verpakkingscombinatie onder hetzelfde product.

Voor categorieen geldt:

- `Cola` onder `Frisdrank` en `Cola` onder een andere parent mogen allebei bestaan;
- het volledige categoriepad wordt daarom altijd getoond.

### 15.4 Foutweergave

Duplicaatfouten worden getoond als veldfout, vergelijkbaar met normale validatie.

Voorbeelden:

```text
Dit merk bestaat al.
```

```text
Deze categorie bestaat al onder deze parent.
```

```text
Dit product bestaat al binnen deze categorie en dit merk.
```

```text
Deze verpakking bestaat al bij dit product.
```

Opslaan is niet mogelijk zolang blokkerende duplicaatfouten bestaan.

## 16. Toestanden

Elke relevante pagina of actie ondersteunt:

- laden;
- leeg;
- geen zoekresultaat;
- validatiefout;
- serverfout;
- succesmelding.

Bij serverfouten:

- ingevoerde gegevens blijven behouden;
- technische foutcodes worden niet als enige uitleg getoond;
- opnieuw proberen is mogelijk waar logisch.

## 17. Niet-functionele requirements

### 17.1 Toegankelijkheid

- Alle invoervelden hebben zichtbare labels.
- De interface is met toetsenbord te gebruiken.
- Fouten zijn niet alleen met kleur aangegeven.
- Dialogen geven focus terug aan de startactie na sluiten.
- Statusmeldingen en foutmeldingen zijn bruikbaar voor screenreaders.

### 17.2 Responsiviteit

- De MVP werkt goed op mobiel en desktop/web.
- Mobiel gebruikt kaarten waar tabellen te krap zijn.
- Desktop/web mag bredere lijsten of tabellen gebruiken.
- De primaire actie blijft goed bereikbaar op beide formaten.

### 17.3 Betrouwbaarheid

- Product plus eerste verpakking worden consistent opgeslagen.
- Duplicaatcontrole bestaat niet alleen in de UI, maar ook server-side.
- Backendfouten mogen formulierdata niet laten verdwijnen.

### 17.4 Prestaties

- Zoeken wordt gedebounced.
- Verouderde zoekrequests worden genegeerd.
- Het overzicht blijft bruikbaar bij groei door paginering of incrementeel laden.

## 18. Acceptatiecriteria

### AC-01 - Productoverzicht openen

Gegeven dat de beheerder de productcatalogus opent  
Wanneer er producten bestaan  
Dan ziet de beheerder een productoverzicht  
En kan de beheerder zoeken, filteren en een product aanmaken.

### AC-02 - Eerste product aanmaken vanuit lege catalogus

Gegeven dat er nog geen producten bestaan  
Wanneer de beheerder `Eerste product aanmaken` kiest  
Dan opent het productformulier direct  
En kan de beheerder categorie, optioneel merk, productnaam en eerste verpakking invoeren  
En kan het product worden opgeslagen.

### AC-03 - Product aanmaken zonder zoeken

Gegeven dat de beheerder op het productoverzicht staat  
Wanneer de beheerder `Product aanmaken` kiest  
Dan opent het productformulier  
En is geen voorafgaande zoekopdracht vereist.

### AC-04 - Merk inline aanmaken

Gegeven dat merk `Remia` nog niet bestaat  
Wanneer de beheerder vanuit het productformulier `Remia` aanmaakt  
Dan blijft het productformulier geopend  
En blijven ingevulde gegevens behouden  
En is `Remia` automatisch geselecteerd.

### AC-05 - Categorie inline aanmaken

Gegeven dat categorie `Frisdrank` bestaat  
Wanneer de beheerder vanuit het productformulier categorie `Cola` onder `Frisdrank` aanmaakt  
Dan blijft het productformulier geopend  
En blijft ingevulde informatie behouden  
En is `Cola` automatisch geselecteerd.

### AC-06 - Productnaam en merk gescheiden houden

Gegeven dat merk `Coca-Cola` is gekozen  
Wanneer de beheerder productnaam `Zero Sugar` invult  
Dan toont de UI weergavenaam `Coca-Cola Zero Sugar`.

### AC-07 - Eerste verpakking verplicht

Gegeven dat de beheerder een nieuw product invult  
Wanneer geen eerste verpakking is ingevuld  
Dan kan het product niet worden opgeslagen  
En toont de UI een foutmelding bij de verpakkingssectie.

### AC-08 - Product zoeken

Gegeven dat `Coca-Cola Zero Sugar` bestaat  
Wanneer de beheerder zoekt naar `zero`  
Dan verschijnt het product in de resultaten  
En kan het product direct worden geopend.

### AC-09 - Zoekopdracht zonder passend product

Gegeven dat geen product past bij de zoekterm  
Wanneer de zoekresultaten worden getoond  
Dan blijft `Product aanmaken` beschikbaar  
En mag de zoekterm als suggestie worden meegenomen naar het formulier  
En wordt de zoekterm niet automatisch definitief opgeslagen als productnaam, merk of categorie.

### AC-10 - Product bewerken

Gegeven dat een product bestaat  
Wanneer de beheerder productcategorie, merk of productnaam wijzigt  
Dan worden duplicaatregels gecontroleerd  
En worden geldige wijzigingen opgeslagen.

### AC-11 - Verpakking toevoegen

Gegeven dat een product bestaat  
Wanneer de beheerder op productdetail `Verpakking toevoegen` kiest  
Dan kan een extra verpakking worden toegevoegd  
Zonder merk, categorie en productnaam opnieuw in te voeren.

### AC-12 - Verpakking bewerken

Gegeven dat een product een verpakking heeft  
Wanneer de beheerder de verpakking bewerkt  
Dan kunnen verpakkingstype, inhoud, eenheid, aantal en eenheidsoort worden gewijzigd  
En wordt de verpakkingsweergave bijgewerkt.

### AC-13 - Dubbel merk blokkeren

Gegeven dat merk `Coca-Cola` bestaat  
Wanneer de beheerder merk `coca-cola` probeert aan te maken  
Dan wordt opslaan geblokkeerd  
En toont het merkveld dat dit merk al bestaat.

### AC-14 - Dubbele categorie onder dezelfde parent blokkeren

Gegeven dat categorie `Cola` onder `Frisdrank` bestaat  
Wanneer de beheerder opnieuw `Cola` onder `Frisdrank` probeert aan te maken  
Dan wordt opslaan geblokkeerd  
En toont het categorieveld dat deze categorie daar al bestaat.

### AC-15 - Dubbel product blokkeren

Gegeven dat product `Coca-Cola Zero Sugar` in categorie `Cola` bestaat  
Wanneer de beheerder opnieuw hetzelfde merk, dezelfde productnaam en dezelfde categorie opslaat  
Dan wordt opslaan geblokkeerd  
En toont de UI dat dit product al bestaat.

### AC-16 - Dubbele verpakking blokkeren

Gegeven dat product `Coca-Cola Zero Sugar` al verpakking `fles 1,5 l` heeft  
Wanneer de beheerder dezelfde verpakking opnieuw toevoegt  
Dan wordt opslaan geblokkeerd  
En toont de UI dat deze verpakking al bestaat bij dit product.

## 19. Na MVP

Deze onderwerpen zijn bewust buiten de MVP gehouden en kunnen later worden uitgewerkt:

- barcode/EAN per verpakking;
- zoeken op barcode;
- barcode scannen met telefoon om product of verpakking te vinden;
- productfoto's;
- eventueel verpakkingsfoto's;
- archiveren en heractiveren;
- verwijderen met referentiecontroles;
- rollen en fijnmazige bevoegdheden;
- apart merkbeheer;
- apart categoriebeheer;
- categorieen hernoemen en verplaatsen;
- duplicaten samenvoegen;
- datakwaliteitsdashboard;
- import/export;
- externe productdata.
