# Configuratielog — Product Repos op Coolify

## Status

- Omgeving: productie
- Repository: `jefvanzanten/product-repos`
- Branch: `main`
- Coolify: `4.1.2`
- Reverse proxy: Traefik `3.1`
- Laatst gecontroleerd: 3 augustus 2026

Dit document beschrijft uitsluitend de uiteindelijke productie-inrichting. Onderzoeksstappen, tijdelijke herstelmaatregelen en troubleshooting vallen buiten dit log.

## Doel van de inrichting

De monorepo bevat meerdere zelfstandig bouwbare applicaties. Backend, Calorie Tracker en Product Management Admin gebruiken dezelfde GitHub-repository, maar zijn afzonderlijke Coolify-resources met ieder een eigen:

- Dockerfile;
- publieke URL;
- container;
- healthcheck;
- deploymentgeschiedenis;
- Auto Deploy-trigger;
- verzameling Watch Paths.

Daardoor hoeft een wijziging aan één app de andere apps niet opnieuw te bouwen. Alleen wijzigingen aan werkelijk gedeelde code of centrale workspacebestanden mogen meerdere deployments starten.

Inventory is als zelfstandige app voorbereid, maar heeft op het moment van dit log nog geen eigen Coolify-resource.

## Productieresources

| Coolify-resource | UUID | Dockerfile | Publieke URL | Containerpoort |
| --- | --- | --- | --- | --- |
| `backend-product-repos` | `ngcoows8swwg08scs804gows` | `/apps/backend/Dockerfile` | `https://api.jefvanzanten.dev` | `3000` |
| `Calorie Tracker` | `lkcwsg4wog4s8goo8so8ksog` | `/apps/calorie_tracker/Dockerfile` | `https://apps.jefvanzanten.dev/calorie-tracker` | `3000` |
| `product-repos-admin-dashboard` | `gcg8w0k0g4g8c0os4s88wkok` | `/apps/product-management-admin/Dockerfile` | `https://apps.jefvanzanten.dev/product-management-admin` | `3000` |

Alle drie gebruiken:

```text
Git-repository: jefvanzanten/product-repos
Branch: main
Build pack: Dockerfile
Base directory: /
Buildcontext: repository-root
Auto Deploy: ingeschakeld
```

De repository-root moet het Docker-buildcontext blijven. De Dockerfiles kopiëren naast hun eigen app ook benodigde workspacebestanden en gedeelde packages.

## Publieke routering

Traefik bedient de publieke HTTP- en HTTPS-routes. De providerfirewall laat webverkeer op poorten 80 en 443 toe. Coolifypoort 8000 blijft publiek gesloten; beheer verloopt via `https://coolify.jefvanzanten.dev`.

De relevante routering is:

```text
api.jefvanzanten.dev/*
  -> backend-product-repos:3000

apps.jefvanzanten.dev/calorie-tracker/*
  -> Calorie Tracker:3000

apps.jefvanzanten.dev/product-management-admin/*
  -> product-repos-admin-dashboard:3000
```

### Prefix behouden

Calorie Tracker en Product Management Admin gebruiken een React Router-`basename`. Hun publieke prefix moet daarom bij proxying behouden blijven:

```text
/calorie-tracker
/product-management-admin
```

Coolify genereert voor een domein met een pad standaard een `StripPrefix`-middleware. Voor deze twee resources is die middleware bewust uit de HTTPS-router verwijderd. De actieve middleware is alleen:

```text
gzip
```

Dit is belangrijk bij het later wijzigen van een domein of opnieuw genereren van standaardlabels. Controleer daarna opnieuw dat Coolify geen `StripPrefix` heeft teruggezet. Anders ontvangt React Router bijvoorbeeld `/login` in plaats van `/calorie-tracker/login` en werken routes, assets of SSR niet correct.

## Wat Watch Paths zijn

Watch Paths zijn padfilters die Coolify bij een GitHub-webhook gebruikt. Coolify vergelijkt de gewijzigde bestanden van de nieuwe commit met de patronen van iedere resource.

- Minimaal één overeenkomst: Coolify maakt voor die resource een deployment aan.
- Geen overeenkomst: Coolify maakt voor die resource geen deploymentqueue-item aan.
- Een handmatige deployment blijft altijd mogelijk en is niet afhankelijk van Watch Paths.
- Auto Deploy moet ingeschakeld zijn om een passende GitHub-push automatisch te deployen.

Watch Paths staan niet in een YAML-bestand in deze repository. Ze zijn per resource opgeslagen in Coolify. De Dockerfiles staan wel in Git, maar bepalen alleen hoe de images worden gebouwd.

### Notatie

In Coolify staat ieder patroon op een eigen regel. De patronen zijn relatief aan de repository-root.

Voorbeelden:

```text
apps/backend/**
packages/contracts/**
pnpm-lock.yaml
```

`**` omvat bestanden en onderliggende mappen. Een exact bestand zoals `pnpm-lock.yaml` matcht uitsluitend dat bestand in de repository-root.

## Ingestelde Watch Paths

### Backend

```text
apps/backend/**
packages/contracts/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.dockerignore
```

Hierdoor deployt de backend bij wijzigingen aan:

- backendcode, migraties, tests, README of Dockerfile;
- gedeelde API-contracten;
- centrale dependency- en workspace-inrichting;
- het Docker-buildcontext.

### Calorie Tracker

```text
apps/calorie_tracker/**
packages/auth-client/**
packages/contracts/**
packages/shared/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.dockerignore
```

Hierdoor deployt Calorie Tracker bij wijzigingen aan:

- de eigen app, README of Dockerfile;
- gedeelde authenticatieclientcode;
- gedeelde API-contracten;
- de gedeelde applicatieshell en presentatielaag;
- centrale dependency-, workspace- en Dockerbestanden.

### Product Management Admin

```text
apps/product-management-admin/**
packages/auth-client/**
packages/contracts/**
packages/shared/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.dockerignore
```

Hierdoor deployt Product Management Admin bij wijzigingen aan:

- de eigen app, README of Dockerfile;
- gedeelde authenticatieclientcode;
- gedeelde API-contracten;
- de gedeelde applicatieshell en presentatielaag;
- centrale dependency-, workspace- en Dockerbestanden.

### Inventory

Voor Inventory bestaat nog geen Coolify-resource. Een wijziging onder `apps/inventory/**` start daarom momenteel geen deployment.

Bij het later toevoegen van de resource is de bedoelde basisconfiguratie:

```text
apps/inventory/**
packages/auth-client/**
packages/shared/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.dockerignore
```

Voeg `packages/contracts/**` toe zodra Inventory rechtstreeks API-contracten uit dat package gebruikt.

## Welke wijzigingen welke resources triggeren

| Gewijzigd pad | Backend | Calorie Tracker | Admin |
| --- | :---: | :---: | :---: |
| `apps/backend/**` | Ja | Nee | Nee |
| `apps/calorie_tracker/**` | Nee | Ja | Nee |
| `apps/product-management-admin/**` | Nee | Nee | Ja |
| `apps/inventory/**` | Nee | Nee | Nee |
| `packages/auth-client/**` | Nee | Ja | Ja |
| `packages/contracts/**` | Ja | Ja | Ja |
| `packages/shared/**` | Nee | Ja | Ja |
| `package.json` | Ja | Ja | Ja |
| `pnpm-lock.yaml` | Ja | Ja | Ja |
| `pnpm-workspace.yaml` | Ja | Ja | Ja |
| `.dockerignore` | Ja | Ja | Ja |
| `docs/**` | Nee | Nee | Nee |

Een commit kan meerdere rijen raken. De uiteindelijke deploymentverzameling is de optelsom van alle gematchte paden.

### Waarom sommige pushes bewust alle drie triggeren

Een wijziging aan bijvoorbeeld `pnpm-lock.yaml` kan de dependencyresolutie van iedere image veranderen. Daarom staat dit bestand bij alle drie de resources. Hetzelfde geldt voor de root-`package.json`, `pnpm-workspace.yaml` en `.dockerignore`.

Als één commit zowel appcode als deze centrale bestanden wijzigt, zijn drie deployments dus correct. Voor een server met beperkte capaciteit kunnen die bij een grote gedeelde wijziging tijdelijk handmatig na elkaar worden uitgevoerd door Auto Deploy vooraf uit te schakelen en na de gefaseerde uitrol weer in te schakelen.

## Praktijktest van de Watch Paths

De filtering is met vier afzonderlijke Git-pushes getest. Voor iedere push is in de Coolify-database gecontroleerd welke webhookdeployment werkelijk als queue-item werd aangemaakt.

| Commit | Alleen gewijzigd | Verwacht | Werkelijk queue-item |
| --- | --- | --- | --- |
| `b89eee7` | `apps/backend/README.md` | Alleen backend | `543` — backend |
| `8606318` | `apps/calorie_tracker/README.md` | Alleen Calorie Tracker | `544` — Calorie Tracker |
| `0865ad7` | `apps/product-management-admin/README.md` | Alleen admin | `545` — admin |
| `388d031` | `apps/inventory/README.md` | Geen resource | Geen queue-item |

Alle drie de verwachte deployments zijn gezond afgerond. Er zijn geen late of extra queue-items voor de andere resources verschenen.

Een aparte commit die uitsluitend `docs/**` wijzigde, maakte eveneens geen deploymentqueue-item aan.

## Dockerbuilds

Iedere resource gebruikt een eigen workspace-aware Dockerfile:

```text
apps/backend/Dockerfile
apps/calorie_tracker/Dockerfile
apps/inventory/Dockerfile
apps/product-management-admin/Dockerfile
```

Belangrijke afspraken:

- de build start vanuit de repository-root;
- dependencies worden met `corepack pnpm` en de vastgelegde lockfile geïnstalleerd;
- iedere frontend bouwt alleen de eigen workspacefilter en transitieve workspace-afhankelijkheden;
- iedere frontendruntime start één React Router-server op poort 3000;
- de backendruntime gebruikt Bun en voert voor het starten de Drizzle-migraties uit;
- iedere actieve productiecontainer heeft een healthcheck.

## Productiedata en persistence

Alleen de backend heeft persistente opslag nodig. Het gekoppelde Docker-volume is:

```text
ngcoows8swwg08scs804gows-product-repos-backend-data
```

Dit volume is in de container gemount op:

```text
/data
```

Belangrijke paden:

```text
/data/sqlite.db
/data/package-images/
```

- `/data/sqlite.db` is de online SQLite-database en de bron van waarheid voor productiegegevens.
- `/data/package-images/` bevat de bestanden van verpakkingsafbeeldingen.
- SQLite bewaart voor een afbeelding alleen de publieke URL; het binaire afbeeldingsbestand staat apart in `package-images`.
- Nieuwe uploads via Product Management Admin worden rechtstreeks in dit persistente volume opgeslagen.
- Een nieuwe image of applicatiedeployment verwijdert het volume niet.

Lokale ontwikkeling blijft hiervan gescheiden:

```text
apps/backend/db/sqlite.db
apps/backend/db/package-images/
```

Lokale apps gebruiken de lokale backend en lokale data. De productiedatabase wordt niet vanuit lokale ontwikkelprocessen geopend.

## Productieconfiguratie zonder geheimen

De backend gebruikt in productie onder andere de volgende configuratiesoorten:

```text
DATABASE_URL=/data/sqlite.db
BETTER_AUTH_URL=https://api.jefvanzanten.dev
AUTH_COOKIE_DOMAIN=.jefvanzanten.dev
AUTH_TRUSTED_ORIGINS=https://apps.jefvanzanten.dev
CORS_ORIGIN=https://apps.jefvanzanten.dev
```

Frontends gebruiken tijdens de productiebuild:

```text
VITE_API_URL=https://api.jefvanzanten.dev
```

Geheime waarden zoals Better Auth-secrets, wachtwoorden en tokens horen uitsluitend in Coolify en nooit in dit log of in Git.

## Healthchecks en operationele controle

Publieke basiscontroles:

```text
https://api.jefvanzanten.dev/health/db
https://apps.jefvanzanten.dev/calorie-tracker/login
https://apps.jefvanzanten.dev/product-management-admin/login
```

De backendhealthcheck controleert ook dat SQLite een query kan uitvoeren. De frontendhealthchecks openen een SSR-loginroute op hun eigen publieke basename.

Na een deployment hoort de betreffende Coolify-resource:

1. status `finished` te krijgen;
2. een container met healthstatus `healthy` te hebben;
3. via HTTPS een succesvolle response te geven;
4. bij een app-specifieke commit geen queue-items voor niet-gerelateerde resources te veroorzaken.

## Een Watch Path later wijzigen

1. Open in Coolify de betreffende applicatieresource.
2. Zoek in de Git- of sourceconfiguratie het veld `Watch Paths`.
3. Plaats ieder repository-relatief patroon op een eigen regel.
4. Sla de resource op en controleer dat Auto Deploy de bedoelde status heeft.
5. Test met een kleine commit die uitsluitend een bestand onder het nieuwe pad wijzigt.
6. Controleer in Deployments dat alleen de bedoelde resource een webhookdeployment kreeg.
7. Test zo nodig ook een niet-matchend pad en controleer dat daarvoor geen queue-item ontstaat.

Wijzig Watch Paths altijd op basis van werkelijke dependencygrenzen. Een gedeeld package hoort alleen bij resources die dat package daadwerkelijk tijdens build of runtime consumeren.

## Relevante repositorydocumentatie

- [Backend README](../../apps/backend/README.md)
- [Calorie Tracker README](../../apps/calorie_tracker/README.md)
- [Inventory README](../../apps/inventory/README.md)
- [Product Management Admin README](../../apps/product-management-admin/README.md)
- [Plan voor zelfstandige deployments](../plans/zelfstandige-app-deployments-en-admin-herkomst-plan.md)
- [Dependencybeheer](../dependency-management.md)
