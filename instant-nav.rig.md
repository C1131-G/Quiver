# Instant-navigation rig

How the Quiver dashboard proves its App Router shells commit instantly, and how to re-run that proof. One route at a time; the locked test is the regression guard.

## BUILD

`bun run preview:e2e` from the repo root (or `bun run --cwd apps/web preview:e2e`). It builds the production Next.js bundle and serves it on `http://127.0.0.1:3210`. Never measure on `next dev`: dev does not prefetch and its testing lock is unreliable.

## EXPOSE

The Playwright config starts the server with `EXPOSE_TESTING_API=1`, which flips `experimental.exposeTestingApiInProductionBuild` in `apps/web/next.config.ts`. That flag must be true in every measured build and never true in a shipped build. The locked `instant()` assertions are vacuous without it.

## RUN

`bun run test:e2e` from the repo root (or `bun run --cwd apps/web test:e2e`). Playwright builds and starts the rig automatically via `webServer`, runs the `setup` project once to authenticate, then runs the locked specs in `apps/web/e2e/instant-shell.e2e.ts` (named `.e2e.ts` so `bun test` ignores them; Playwright matches them via `testMatch`). The standalone server does not read `.env.local` by itself, so `preview:e2e` loads it with `node --env-file` (the same Node runtime the desktop app ships):

- dashboard, sessions, and compare hard navigations commit their static shell (the page heading) under the `instant()` lock;
- a sidebar soft navigation lands on the shared shell under the lock;
- a session scorecard streams its data after the shell (unlocked smoke).

## TEST USER

The `setup` project signs in as the seeded local admin (`admin` / `admin12345` from `supabase/seed.sql`) and stores the session in the gitignored `apps/web/e2e/.auth/admin.json`. These credentials are local-development only.

## DRIFT

The rig needs local Supabase running with seed data: `bun run db:start`, then `bun run db:reset` if the login or the session list is empty. The app reads its Supabase URL and publishable key from `apps/web/.env.local`, which is gitignored and required for both the server and the tests.

## LOOP

Re-run `bun run test:e2e` after any change to a route shell, a Suspense boundary, a layout, or prefetching. A newly failing locked assertion means the route stopped committing its shell instantly: push the dynamic read below a narrower boundary and re-run until green. Keep the passing spec; it is the regression guard.
