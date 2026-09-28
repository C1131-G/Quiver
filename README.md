# Quiver

Archery scoring and performance tracking for a coaching team.

| App | Who uses it | Where it runs | Code |
| --- | --- | --- | --- |
| **QuiverScore** | Scorers at the range | Android and iOS (Expo) | [`apps/mobile`](apps/mobile/README.md) |
| **Quiver Dashboard** | Admins and coaches | Windows desktop (Electron wrapping Next.js) | [`apps/web`](apps/web/README.md), [`apps/desktop`](apps/desktop/README.md) |

Both apps share one Supabase project: Postgres with row-level security, Auth, Realtime and one Edge Function.

```
 QuiverScore (phone)                           Quiver Dashboard (desktop)
 ─────────────────────                         ──────────────────────────
 SQLite per scorer   ──outbox sync──▶  Supabase  ◀──RLS client + Realtime──  Next.js in Electron
 works fully offline                   Postgres                             live updates, analytics,
                                       + Auth                               exports, admin
```

## Features

**QuiverScore (scorers)**

- Scores fully offline. Each scorer's work lives in their own SQLite file on the phone and syncs through an outbox when a connection returns, so no score is ever lost to a failed request.
- Scores several athletes at once, one tab each.
- Enter each arrow on a zone-coloured keypad, or tap where it hit on a drawn target face (full, 6-ring and triple-spot faces).
- A live stats strip shows the total out of the maximum, the average arrow, 10+X and X.
- The scorecard fits on one screen: it shows the ends around the one being shot, with per-end 10+X and X counts.
- Undo, Delete arrow and Clear end. Submit locks the session; Cancel or Discard stops it.
- Starts sessions ad hoc or from a schedule the admins publish.

**Quiver Dashboard (admins)**

- Athletes, scorers, age categories, events, distances and target faces.
- Sessions update live as scorers shoot, and admins can correct scores (every change is written to an audit log).
- Performance analytics and athlete comparison, with exports.
- Scheduled session templates that scorers pick up on their phones.
- A Windows installer with automatic updates from GitHub Releases.

## Tech stack

| Layer | Choice |
| --- | --- |
| Monorepo | Bun workspaces and Turborepo |
| Mobile | Expo SDK 57, React Native 0.86, Expo Router, TanStack DB/Query/Form/Table/Store, Uniwind, React Native Reusables |
| Web | Next.js 16 (App Router), React 19, TanStack Query/Table, shadcn/ui (base-lyra) |
| Desktop | Electron 44, electron-builder, electron-updater |
| Backend | Supabase (Postgres, RLS, Auth, Realtime, Edge Functions), pgTAP tests |
| Quality | TypeScript strict, Ultracite (Oxlint and Oxfmt), Lefthook pre-commit, Bun test, Playwright |

## Repository layout

```
apps/
  mobile/        QuiverScore, the Expo scorer app
  web/           Quiver Dashboard, a Next.js app
  desktop/       The Electron shell that packages apps/web for Windows
packages/
  shared/        Code both apps use: Database types, arrow rules, scorecard maths, account helpers
  ui/            shadcn/ui components and theme for the dashboard
  typescript-config/
supabase/
  migrations/    Schema, RLS policies, functions and lookup seeds
  functions/     Edge Functions (admin-users) and the _shared contracts
  tests/         pgTAP database tests
  seed.sql       Local development data only
```

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.4 or later, and Node.js 20 or later
- Docker, for the local Supabase stack
- To run QuiverScore on a device: a development build (see [`apps/mobile`](apps/mobile/README.md))

### 1. Install

```bash
bun install
```

### 2. Start Supabase locally

```bash
bun run db:start   # Supabase CLI on ports 55321–55329
bun run db:reset   # apply migrations and seed.sql
```

The local seed creates three accounts. **They exist only for local development:**

| Login     | Password      | Role                     |
| --------- | ------------- | ------------------------ |
| `admin`   | `admin12345`  | Admin (Quiver Dashboard) |
| `scorer1` | `scorer12345` | Scorer (QuiverScore)     |
| `scorer2` | `scorer12345` | Scorer (QuiverScore)     |
| `cibi`    | `cibi12345`   | Scorer (QuiverScore)     |

### 3. Configure environment

Copy the examples and fill them in with the local or hosted project's URL and **publishable** key:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
```

> Only publishable keys belong in these files. `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values are shipped inside the apps. Never put the `service_role` or secret key in either app.

### 4. Run

```bash
bun run dev            # Quiver Dashboard in a browser at http://localhost:3000
bun run electron:dev   # Quiver Dashboard in Electron
bun run --cwd apps/mobile start   # QuiverScore dev server
```

## Scripts (repository root)

| Command | What it does |
| --- | --- |
| `bun run dev` / `build` | Turbo dev or build across the apps |
| `bun run typecheck` | TypeScript across every package |
| `bun run test` | Unit tests across every package |
| `bun run check` / `fix` | Ultracite lint and format check, or auto-fix |
| `bun run test:db` | pgTAP database tests |
| `bun run db:types` | Regenerate the `Database` types into `packages/shared` and `apps/web` |
| `bun run test:e2e` | Playwright end-to-end tests for the dashboard |
| `bun run package:win` / `release` | Build or publish the Windows installer |

A Lefthook pre-commit hook runs `ultracite fix` on staged files.

## Database and security

- **Roles** live in `app_metadata`, never `user_metadata`. `private.is_admin()` also requires an active profile, so deactivating an account removes its access immediately.
- **Row-level security** is on for every table. Scorers read reference data and read or write only their own sessions. A scorer can cancel only their own in-progress session. Only an admin can change a session's athlete, scorer, category or event.
- **Cancelled sessions** keep their arrows but count in no statistic. Any new statistic must filter out `status = 'cancelled'`.
- **The audit log** (`arrow_corrections`) records admin corrections and any change made after a session is submitted.
- Usernames sign in as `<username>@<LOGIN_USERNAME_DOMAIN>` (default `quiver.local`).

### Migrations

```bash
bunx supabase migration new <name>   # write the SQL
bun run db:reset && bun run test:db   # verify locally
bunx supabase db push                 # apply to the linked hosted project
bun run db:types                      # refresh the generated types
```

Lookup data (age categories, events, distances, target faces) is seeded by migrations, so the hosted project gets it too. `seed.sql` never runs in production.

## Releasing

| App | How |
| --- | --- |
| QuiverScore | EAS cloud build: `bunx eas-cli build -p android --profile preview` for an installable APK, `--profile production` for the stores. See [`apps/mobile`](apps/mobile/README.md). |
| Quiver Dashboard | `bun run release` builds the NSIS installer and zip and publishes them to GitHub Releases. Installed copies update themselves from there. See [`apps/desktop`](apps/desktop/README.md). |
| Database | `bunx supabase db push`, before shipping app code that depends on the change. |

## Contributing

- Read [`AGENTS.md`](AGENTS.md) first. It records the architecture decisions (offline-first sync, data ownership, roles, paging) and which conventions apply to which code.
- Keep diffs focused. Run `bun run check`, `bun run typecheck` and `bun run test` before pushing, plus `bun run test:db` when SQL changes.
- In every user-facing string, call the apps **QuiverScore** and **Quiver Dashboard**, never "the mobile app" or "the desktop app".
