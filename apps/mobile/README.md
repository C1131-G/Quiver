# QuiverScore

The scorer's app for Quiver. Scorers enter arrows at the range, often with poor or no signal, and the scores reach Quiver Dashboard as soon as the phone is back online.

- **Platforms:** Android (APK or Play Store) and iOS (TestFlight or App Store)
- **Stack:** Expo SDK 57, React Native 0.86, Expo Router, TanStack DB/Query/Form/Table/Store, Uniwind, React Native Reusables, sonner-native
- **App ID:** `com.cibi.quiverscore`, EAS project `quiverscore`

## Features

| Area | What it does |
| --- | --- |
| Sign-in | Username and password. Admin accounts are turned away, because admins use Quiver Dashboard. The session is kept in SecureStore, so a scorer stays signed in offline. |
| Athletes | Search by name or ID and filter by age category, all from the copy stored on the phone. |
| New session | Choose a format preset (60/72/36/30 arrows), the type, the venue and the date. Each round can be edited (distance, face, ends and arrows per end). The screen fits without scrolling. |
| Scheduled sessions | Start the sessions an admin scheduled, one per chosen athlete. |
| Scoring | A stats strip (total out of the maximum, average, 10+X, X), a scorecard showing the ends around the current one with per-end golds, and a zone-coloured **keypad** or **tap-on-target** entry. Undo, Delete arrow and Clear end. |
| Several athletes | One tab per athlete being scored. A list opens when there are more than three. |
| Submit and cancel | Submit locks the session on the phone. Cancel keeps its arrows but leaves them out of every statistic. Discard deletes a session the server never received. |
| Sync | A line shows what is waiting to send. A refused change shows a notice with Try again and is never dropped. |

## How it works offline

```
tap a score ─▶ one transaction ─▶ scorer's SQLite  +  outbox row
                                                        │
                                  online? ──────────────┘
                                     │
                              push: open session first, then deletes (children first),
                              then upserts (parents first), then the finished status
                                     │
                              pull: the scorer's open sessions; a row with unsent
                                    changes keeps the phone's version
```

- **One SQLite file per scorer** (`src/db/scorer-db.ts`), so two scorers sharing a phone never mix their work.
- **Screens read only from the phone,** through TanStack DB live queries on local collections. Athletes and lookups are copied in by a TanStack Query refresh (`src/db/reference.ts`).
- **Scores are written by the actions in `src/scoring/actions.ts`,** one transaction per action, and the same transaction queues the changed rows in the outbox (`src/sync/`). Sends are idempotent upserts and deletes keyed by UUID, so retries are harmless.
- The phone never uses `@tanstack/offline-transactions`, because it rolls back changes the server refuses, and scores must never be lost. See the architecture notes in the root [`AGENTS.md`](../../AGENTS.md).

## Project layout

```
src/
  app/          Routes (Expo Router): sign-in, session list, new-session, scheduled, scoring
  auth/         Sign-in form and the auth store
  components/   UI primitives (button, input, text…), sheet, choice group, stepper
  db/           The scorer's SQLite database, collections and reference refresh
  scoring/      Scoring screen, keypad, target face, scorecard, stats, actions
  sessions/     Session list, athlete picker, new-session setup
  scheduled/    Starting scheduled sessions
  sync/         Outbox, push and pull plans, sync engine and status
  lib/          Supabase client, SecureStore chunking, utilities
```

Scorecard maths and arrow rules are shared with the dashboard in [`packages/shared`](../../packages/shared).

## Development

### Environment

```bash
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL. On a real phone with a local stack, use this computer's LAN IP, not `localhost`. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The **publishable** key. It is bundled into the app, so never use the secret key. |
| `EXPO_PUBLIC_LOGIN_USERNAME_DOMAIN` | Optional. Usernames sign in as `<username>@<domain>`; the default is `quiver.local`. |

For EAS builds, the same variables are set per environment on expo.dev (`preview`, `production`).

### Running

QuiverScore uses native modules that Expo Go doesn't include, so it runs in a **development build**:

```bash
bunx eas-cli build -p android --profile development   # install this APK once
bun run start                                          # then start the dev server
```

`expo run:android` / `run:ios` build locally instead. Local Android builds need macOS or Linux for `eas build --local`; on Windows, use Gradle through `expo run:android` with the Android SDK and JDK 17, or use EAS cloud builds.

### Checks

```bash
bun run typecheck   # tsc --noEmit
bun run test        # bun test: scoring geometry, windowing, undo, sync plans
bun run doctor      # expo-doctor
bunx ultracite check apps/mobile/src   # run from the repository root
```

expo-doctor reports a duplicate `react`. That is deliberate: QuiverScore pins the React version React Native was built with, and `metro.config.js` and `tsconfig.json` point every import at it.

## Building and releasing

EAS profiles are defined in `eas.json`:

| Profile | Output | Use |
| --- | --- | --- |
| `development` | Debug APK with the dev client | Day-to-day development |
| `preview` | Installable release APK (internal distribution) | Testing with scorers |
| `production` | Store build, auto-incremented version | Play Store and App Store |

```bash
bunx eas-cli build -p android --profile preview      # APK, with an install link and QR code
bunx eas-cli build -p android --profile production
bunx eas-cli submit -p android --profile production
```

Signing credentials are managed remotely by EAS.

## Design

QuiverScore follows Quiver Dashboard's square **base-lyra** look: the same colour tokens (`src/global.css`), square corners and a red primary. It adds touches native to iOS: grouped cards, small uppercase section labels, 44pt+ tap targets, pinned primary buttons and native page sheets. Score colours follow the World Archery rings (gold, red, blue, black, white). Screens avoid both vertical and horizontal scrolling, and longer lists open in sheets.
