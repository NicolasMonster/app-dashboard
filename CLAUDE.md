# CLAUDE.md

## Project Overview

**Meta Ads Dashboard** -- a full-stack web application for visualizing and analyzing Meta (Facebook) Ads performance metrics. Features include dashboards, ad rankings, creative analysis, and credential management.

**Tech Stack:** React 19 + TypeScript 5.9 + Express + tRPC + Drizzle ORM (MySQL) + Vite 7 + Tailwind CSS 4

## Quick Reference

```bash
pnpm dev          # Start dev server (hot reload, auto port 3000-3019)
pnpm build        # Build client (Vite) + bundle server (esbuild)
pnpm start        # Run production build
pnpm check        # TypeScript type check (no emit)
pnpm test         # Run tests (vitest)
pnpm format       # Format all files (Prettier)
pnpm db:push      # Generate + apply database migrations (drizzle-kit)
```

## Directory Structure

```
client/                     # React frontend
  src/
    _core/hooks/            # Core auth hooks
    components/             # React components
      ui/                   # shadcn/ui primitives (50+ components)
    pages/                  # Route pages (Dashboard, Rankings, Creatives, Settings)
    contexts/               # React context providers (Theme, DateRange)
    hooks/                  # Custom hooks
    lib/                    # Utilities (trpc client, cn() helper)
    App.tsx                 # Root component, routing, providers
    main.tsx                # Entry point, tRPC + QueryClient setup

server/                     # Express backend
  _core/
    index.ts                # Server entry (Express, middleware, Vite setup)
    trpc.ts                 # tRPC initialization, procedures, middleware
    context.ts              # tRPC context creator
    oauth.ts                # OAuth callback handling
    cookies.ts              # Cookie management
    env.ts                  # Environment variables
    systemRouter.ts         # System health/admin routes
  routers.ts                # Main tRPC router (auth, metaAds)
  db.ts                     # Database operations + in-memory fallback
  metaAdsApi.ts             # Meta Graph API integration
  storage.ts                # Storage proxy integration

shared/                     # Shared between client and server
  types.ts                  # Type re-exports from drizzle schema
  const.ts                  # Shared constants (COOKIE_NAME, error messages)
  _core/errors.ts           # Error types

drizzle/                    # Database
  schema.ts                 # Drizzle ORM schema (users, metaAdsCredentials, metaAdsCache)
  migrations/               # Migration files
```

## Architecture

### API Layer: tRPC (end-to-end type-safe)
- Server defines procedures in `server/routers.ts`
- Client consumes via `@/lib/trpc.ts` with React Query integration
- Three procedure levels: `publicProcedure`, `protectedProcedure`, `adminProcedure`
- Router type exported as `AppRouter` for client inference

### Frontend Patterns
- **Routing:** Wouter (lightweight, patched via pnpm)
- **State:** React Context (ThemeContext, DateRangeContext) + local state
- **Data fetching:** tRPC + TanStack React Query
- **UI:** shadcn/ui (Radix UI based) components in `client/src/components/ui/`
- **Styling:** Tailwind CSS with `cn()` utility from `@/lib/utils`
- **Charts:** Recharts for data visualization
- **Default theme:** Dark mode

### Backend Patterns
- **Auth:** OAuth (optional) with JWT sessions and cookie management; guest user fallback
- **Database:** Drizzle ORM with MySQL; in-memory fallback when `DATABASE_URL` is unset
- **Caching:** 30-minute TTL for Meta API responses (stored in DB or memory)
- **Dynamic imports:** Server routers use `await import()` for db/api modules

### Path Aliases
- `@/` -> `client/src/`
- `@shared/` -> `shared/`
- `@assets/` -> `attached_assets/`

Configured in: `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`

## Code Conventions

### Naming
- **Variables/functions:** camelCase (`getMetaAdsCredentials`, `dateRange`)
- **Components:** PascalCase files and exports (`Dashboard.tsx`, `Navigation.tsx`)
- **UI components:** lowercase files (`button.tsx`, `dialog.tsx`) -- shadcn convention
- **Constants:** UPPER_SNAKE_CASE (`COOKIE_NAME`, `META_API_VERSION`)

### Formatting (Prettier)
- Double quotes, semicolons, 2-space indent, ES5 trailing commas
- Arrow parens: avoid (`x => x` not `(x) => x`)
- Print width: 80 characters

### TypeScript
- Strict mode enabled
- Prefer type inference; explicit types for function signatures
- Input validation with Zod on tRPC procedures
- Database types inferred from Drizzle schema (`$inferSelect`, `$inferInsert`)

### Imports
- Use `@/` alias for client code, `@shared/` for shared modules
- Relative imports for local sibling files
- Named imports preferred; default exports for page/major components

## Testing

- **Framework:** Vitest 2.1.4
- **Location:** `server/**/*.test.ts` and `server/**/*.spec.ts`
- **Run:** `pnpm test`
- **Pattern:** Unit tests with mock tRPC context, direct router caller invocation

## Environment Variables

Required variables are documented in `.env.example`. Key ones:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NODE_ENV` | Yes | `development` or `production` |
| `DATABASE_URL` | No | MySQL connection string (in-memory fallback if unset) |
| `JWT_SECRET` | Production | Session token signing |
| `OAUTH_SERVER_URL` | No | OAuth server (guest mode if unset) |
| `PORT` | No | Server port (default: 3000) |

Client-accessible env vars must be prefixed with `VITE_` (Vite convention).

## Key Gotchas

- **No ESLint** -- only Prettier for formatting. Run `pnpm format` before committing.
- **wouter is patched** -- see `patches/wouter@3.7.1.patch`. Don't update wouter without checking the patch.
- **Database is optional** -- the app runs with in-memory storage when `DATABASE_URL` is not set. DB operations in `server/db.ts` handle both modes.
- **OAuth is optional** -- without `OAUTH_SERVER_URL`, the app creates a guest user automatically.
- **Body parser limit** -- Express is configured with a 50MB body limit.
- **Port auto-discovery** -- server scans ports 3000-3019 if the default is in use.
