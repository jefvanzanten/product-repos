# Backend API

Backend API gebouwd met Fastify, Drizzle ORM en SQLite.

## Tech Stack

- **Fastify** - Snel en low overhead web framework
- **Drizzle ORM** - TypeScript ORM met SQLite
- **SQLite** - Embedded database
- **TypeScript** - Type veiligheid
- **Vitest** - Testing framework
- **ESLint** - Code linting

## Project Structuur

```
src/
├── db/
│   ├── schema.ts       # Re-export van gedeelde Drizzle schema package
│   └── index.ts        # Database connectie
├── plugins/
│   └── cors.ts         # CORS configuratie
├── routes/
│   └── health.ts       # Health check endpoints
├── app.ts              # Fastify app setup
└── index.ts            # Entry point
```

Gedeelde schema's en API contracts staan in de monorepo packages:

- `packages/db-schema` - Drizzle tabellen
- `packages/contracts` - Zod schema's + gedeelde TypeScript types

## Aan de slag

### 1. Environment Setup

Kopieer `.env.example` naar `.env`:

```bash
cp .env.example .env
```

### 2. Dependencies Installeren

```bash
pnpm install
```

### 3. Database Setup

Genereer en run migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

### 4. Development Server

Start de dev server met hot reload:

```bash
pnpm dev
```

Server draait op `http://localhost:3000`

## Available Scripts

- `pnpm dev` - Start development server met hot reload
- `pnpm build` - Build TypeScript naar JavaScript
- `pnpm start` - Start productie server
- `pnpm test` - Run tests eenmalig
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:run` - Run tests eenmalig
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm typecheck` - TypeScript type checking
- `pnpm db:generate` - Genereer database migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes naar database
- `pnpm db:studio` - Open Drizzle Studio (database GUI)

## API Endpoints

### Health Checks

- `GET /` - API info
- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity check

## Database

### Schema

De database bevat een voorbeeld `users` tabel:

```typescript
{
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Drizzle Studio

Open de database GUI:

```bash
pnpm db:studio
```

## Testing

Run tests:

```bash
pnpm test
```

Run tests met coverage:

```bash
pnpm test:run --coverage
```

## Linting

Check code:

```bash
pnpm lint
```

Auto-fix issues:

```bash
pnpm lint:fix
```

## Environment Variables

| Variable | Default | Beschrijving |
|----------|---------|--------------|
| `NODE_ENV` | `development` | Environment |
| `PORT` | `3000` | Server poort |
| `HOST` | `0.0.0.0` | Server host |
| `DATABASE_URL` | `./db/sqlite.db` | Database pad |
| `CORS_ORIGIN` | `http://localhost:5173` | CORS origin |
| `LOG_LEVEL` | `info` | Log level |

## Production Build

Build en start productie server:

```bash
pnpm build
pnpm start
```

## Volgende Stappen

- Voeg meer routes toe in `src/routes/`
- Breid database schema uit in `src/db/schema.ts`
- Voeg plugins toe in `src/plugins/`
- Schrijf tests in `tests/`
