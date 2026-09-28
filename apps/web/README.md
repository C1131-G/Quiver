# Quiver Dashboard (web)

The admin and coaching app for Quiver, built with Next.js. It ships to users inside the Electron shell in [`apps/desktop`](../desktop/README.md) and also runs in a browser during development.

- **Stack:** Next.js 16 (App Router), React 19, TanStack Query and Table, shadcn/ui (base-lyra) from [`packages/ui`](../../packages/ui), Supabase
- **Font and icons:** Inter and Geist Mono, Phosphor icons

## Features

| Route | What admins do there |
| --- | --- |
| `/login` | Sign in with a username. Scorer accounts are sent to QuiverScore instead. |
| `/dashboard` | Headline numbers and recent activity |
| `/sessions` | Every session, updated live while scorers shoot. Open one to correct scores; each correction is written to the audit log. |
| `/athletes` | Add, edit and deactivate athletes. Assign age category, event, distance and target face. |
| `/scorers` | Create scorer accounts (through the `admin-users` Edge Function), and deactivate or reactivate them |
| `/compare` | Compare athletes side by side |
| `/schedule` | Session templates that scorers start on QuiverScore |
| `/settings` | Lookups (categories, events, distances, faces), and theme |

Performance tables and exports live under `components/performance` and `components/export`.

## Architecture

- **Data is read in the browser,** not in Server Components. Reads use the RLS-scoped Supabase browser client through TanStack Query, which keeps Realtime updates and cache invalidation in one place. Pages stay synchronous and only compose Suspense and error boundaries.
- **Each feature owns a folder** in `components/<domain>/`: its query keys and `queryOptions` (`use-*.ts`), its components, and a skeleton.
- **Dialogs keep a snapshot** of the row they opened with, so a live refetch never changes a form while someone is editing it.
- **Edge Function contracts** come from `supabase/functions/_shared` as `@contracts/*`, and the same zod schema validates both sides.
- **Paging** uses OFFSET with UUID keys, because each list holds hundreds of rows, not millions.

> This project runs a Next.js version newer than most references. Read the matching guide in `node_modules/next/dist/docs/` before changing routing, caching or rendering.

## Development

```bash
cp .env.example .env.local
bun run dev          # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The **publishable** key. It ships to the browser and is built into the desktop app. |
| `NEXT_PUBLIC_LOGIN_USERNAME_DOMAIN` | Usernames sign in as `<username>@<domain>`; the default is `quiver.local`. |

### Checks

```bash
bun run typecheck
bun run test          # bun unit tests (forms, filters, exports…)
bun run test:e2e      # Playwright, against a production build
bun run build
```

`bun run preview:e2e` builds the standalone server that Electron uses and serves it locally, which makes it the closest match to what users run.

## Deployment

Quiver Dashboard isn't deployed as a website. `apps/desktop` bundles the Next.js **standalone** output (`.next/standalone`) together with Electron. See [`apps/desktop`](../desktop/README.md) for packaging and releases.
