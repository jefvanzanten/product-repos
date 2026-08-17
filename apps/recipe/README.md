# Recepten

Zelfstandige React Router-app voor publieke recepten en eigenaarbeheer onder `/recepten`.

Zie [ARCHITECTURE.md](./ARCHITECTURE.md) voor de feature-first domein-, data- en presentatielagen.

## Configuratie

- `API_URL`: backend-URL voor SSR-loaders en actions.
- `VITE_API_URL`: publieke backend-URL voor Better Auth.

## Commando's

```bash
corepack pnpm --filter recipe dev
corepack pnpm --filter recipe typecheck
corepack pnpm --filter recipe build
```

De productiecontainer luistert standaard op poort `3000`; routeer `apps.jefvanzanten.dev/recepten` naar deze service.
