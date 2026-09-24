<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `bunx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `bunx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

## Which skill to load

Load the skill before writing the code, not after. Two or more rows can apply at once — load all of them.

| When | Load |
| --- | --- |
| Any code change, in any language | `enforce-code-quality` |
| Editing a `.ts` or `.tsx` file | `enforce-typescript-strict` |
| Parsing untrusted data — search params, JSON, RPC results, form input | `type-safety-validation` |
| Reviewing or editing React/Next components, rendering, data fetching, or performance | `vercel-react-best-practices` |
| Reviewing or editing JSX, controls, forms, tables, dialogs, or other UI markup | `accessible-html` |
| Reviewing accessibility compliance, keyboard/focus, forms, screen readers, or hit areas | `better-accessibility` |
| About to write or edit a `useEffect` | `audit-react-effects` |
| An interaction that waits on the server — submit, save, load, spinner placement | `apply-react-async-ui` |
| The file imports `useQuery`, `useMutation`, `useSuspenseQuery`, or `queryClient` | `use-tanstack-query` |
| The file imports `@tanstack/react-table` or uses its state/features | `bunx @tanstack/intent@latest load @tanstack/react-table#create-table-hook`, `#getting-started`, `#migrate-v8-to-v9`, and `#table-state`; load applicable `@tanstack/table-core#core`, `#table-features`, `#typescript`, `#client-vs-server`, `#pagination`, `#sorting`, and `#migrate-v8-to-v9` |
| A TanStack Table is combined with Query-backed server filtering, sorting, pagination, or infinite data | `bunx @tanstack/intent@latest load @tanstack/react-table#with-tanstack-query` |
| The file has `createFileRoute`, a route loader, or reads TanStack search params | `use-tanstack-router` |
| Showing the user a toast (`sonner`) | `ask-sonner` |
| Adding or reviewing Motion animations | `animate` |
| Adding or reviewing React View Transitions or route motion | `vercel-react-view-transitions` |
| A route, layout, page, or server/client boundary in `apps/web/app` | `nextjs-app-architecture`, `nextjs-react-typescript` |
| `"use cache"`, `cacheLife`, Suspense boundaries, or prefetching | `next-cache-components-optimizer`, `next-partial-prefetching-adoption` |
| A Next.js layout shell, sidebar, or streaming boundary | `apply-next-shell-nav` |
| Supabase auth, RLS, Realtime, or the Supabase CLI | `supabase` |
| A migration, SQL function, view, index, or policy in `supabase/` | `supabase-postgres-best-practices` |
| Lint or format errors, or Oxlint config | `ultracite` |
| Any Expo or React Native code in `apps/mobile` | Read `apps/mobile/AGENTS.md` first |
| Onboarding a repository, or this table needs updating | `setup-agent-rules` |
| Auditing the repo against the skills its stack implies, or checking this setup is applied | `audit-with-skills` |
| Reading or reviewing a research paper | `read-research-paper` |

## Product names

- **Quiver Dashboard** is the desktop app for admins (`apps/web` inside `apps/desktop`).
- **QuiverScore** is the mobile app for scorers (`apps/mobile`).

Use these names in every UI string, window title, installer, and doc. Don't write "the mobile app" or "the desktop app" in user-facing text.

<important if="you are changing data ownership, feature placement, dialog snapshots, roles, or paging">

## Architecture decisions

These choices are deliberate. A skill's generic advice does not override them. Change one only after discussing it.

- **Data is read in the browser, not in Server Components.** The dashboard runs inside Electron against Supabase. Reads use the RLS-scoped browser client through TanStack Query. That keeps Realtime live updates and cache invalidation in one place. Pages stay synchronous and only compose Suspense and error boundaries.
- **Feature code lives in `apps/web/components/<domain>/`, not `features/`.** Each domain folder owns its query keys and `queryOptions` (`use-*.ts`), its components, and a skeleton at the end of the feature file.
- **Shared Edge Function contracts live in `supabase/functions/_shared/`.** The web app imports them as `@contracts/*`. Validate with the same zod schema on both sides, and never duplicate them.
- **Dialogs keep a snapshot of the row they opened with.** Live updates can refetch the list while a dialog is open, and the form must not change underneath the user.
- **Roles live in `app_metadata`, and `private.is_admin()` also requires an active profile.** Deactivating an account removes its access right away, without waiting for the token to expire.
- **QuiverScore pins React to what React Native was built with.** The workspace hoists Quiver Dashboard's React, so `apps/mobile` keeps its own copy, and `metro.config.js` and the `paths` in its `tsconfig.json` point every `react` import there. expo-doctor reports the two copies as duplicates; the exported bundle holds only one. Remove the redirect only once both apps use the same React version.
- **QuiverScore keeps the Supabase session in SecureStore, split into chunks.** SecureStore rejects values over 2048 bytes (`apps/mobile/src/lib/secure-storage.ts`). Offline, an expired session still counts as signed in, so scorers are never locked out at the range.
- **QuiverScore reads only from the phone.** Each scorer has their own SQLite file (`apps/mobile/src/db/scorer-db.ts`), so a shared phone never mixes two scorers' work. Every screen reads through TanStack DB live queries on local-only persisted collections. Athletes and lookups are copied in by a TanStack Query refresh (`src/db/reference.ts`), not a query-backed collection, because that goes into an error state when its first fetch fails offline. Scores are written by the actions in `src/scoring/actions.ts`, one transaction per action, which also queues the changed rows for the server.
- **QuiverScore syncs through its own outbox, not `@tanstack/offline-transactions`.** That library keeps unsent changes only as optimistic state and rolls them back when the server refuses them; scores must never be lost that way. The outbox (`src/sync/`) is a table in the scorer's SQLite file that names each changed row. When sent, a row still on the phone is upserted and a missing one deleted, so retries are harmless. Each session goes open first, then deletes (children first) and upserts (parents first), and a finished status is always the last write. A refusal (RLS, a submitted session) is recorded in `sync_issues`, and that session's changes stay queued until the scorer taps Try again. Pulls bring in the scorer's open sessions, and a row with unsent changes keeps the phone's version.
- **QuiverScore discards only what the server never had.** Every session in progress on the phone is a tab on the scoring screen, and the tab on screen lives in a TanStack Store atom (`src/scoring/active-session.ts`), not the route. Submit and Cancel are writes queued like any score. Discard deletes the session from the phone and sends nothing, so it is allowed only while the session's creation is still queued and `sent_sessions` has no mark for it. The sync writes that mark before a session's first send, so a send whose reply was lost still counts as sent. Otherwise stopping a session cancels it.
- **A cancelled session keeps its arrows but counts nowhere.** `session_summaries`, `arrow_details` and `private.filtered_arrows` (so every analytics call) leave out `status = 'cancelled'`; add the same filter to any new statistic. A scorer can cancel only their own session while it is in progress, and only an admin can change a session's athlete, scorer, category or event (`private.guard_session_owner`).
- **The audit log holds corrections, not scoring.** `arrow_corrections` records an admin's changes, plus any value changed after a session is submitted. A scorer fixing an arrow before submitting is not logged.
- **Code both apps need lives in `packages/shared`** (`@workspace/shared/*`): the `Database` types, arrow rules, and account helpers. `bun run db:types` writes the types there and copies them to `apps/web/lib/supabase/database.types.ts` until the dashboard imports them from the package.
- **Paging uses OFFSET with UUIDv4 keys.** QuiverScore generates the IDs, and each list holds hundreds of rows, not millions. Revisit keyset paging only if that changes.

</important>
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<important if="you are writing, editing, or reviewing TypeScript, JavaScript, or JSX code">

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `bun x ultracite fix` before committing to ensure compliance.

</important>
