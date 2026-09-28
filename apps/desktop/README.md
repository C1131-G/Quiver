# Quiver Dashboard (desktop)

The Windows app for Quiver Dashboard. Electron starts the Next.js **standalone** server from [`apps/web`](../web/README.md) on a free local port, shows a loading screen, and opens the dashboard in its window.

- **Stack:** Electron 44, electron-builder, electron-updater
- **App ID:** `com.cibi.quiver-dashboard`
- **Outputs:** an NSIS installer (`.exe`) and a portable `.zip`, both x64

## How it runs

```
Electron main (electron/main.cjs)
  ├─ picks a free port             electron/ports.cjs
  ├─ starts the Next standalone    electron/server.cjs   → resources/standalone/apps/web/server.js
  ├─ shows loading.html until the server answers
  ├─ loads http://127.0.0.1:<port> in the window (preload.cjs bridges IPC)
  └─ checks GitHub Releases for updates   electron/ipc/updates.cjs
```

In production the server runs on Electron's own binary as Node (`ELECTRON_RUN_AS_NODE`), so no second runtime ships, and it keeps a V8 compile cache in the user-data folder so later launches start faster.

The Supabase URL and publishable key are baked in from `apps/web/.env.local` at build time. The app holds no secret keys.

## Development

```bash
bun run electron:dev       # Electron with electronmon; reuses a running `next dev` for apps/web
bun run electron:preview   # build web, prepare standalone, run Electron in production mode
```

Both can be run from the repository root.

## Packaging

```bash
bun run package:win   # clean, build web, prepare standalone, electron-builder --win
bun run --cwd apps/desktop package:dir   # unpacked build for quick checks
```

Output goes to `apps/desktop/release/` as `Quiver-Dashboard-<version>-win-x64.{exe,zip}`.

| Step | Script |
| --- | --- |
| Clean old outputs | `scripts/clean.mjs` |
| Copy `.next/static` and `public` into the standalone tree | `scripts/prepare-standalone.mjs` |
| Restore standalone `node_modules` after packing | `scripts/after-pack.mjs` |

The installer lets users choose the install folder and creates desktop and Start-menu shortcuts. Use the zip on locked-down machines where installers aren't allowed.

## Releasing and auto-update

1. Bump `version` in `apps/desktop/package.json`.
2. Set `GH_TOKEN` to a GitHub token with `repo` scope.
3. Run:

   ```bash
   bun run release   # builds and publishes to GitHub Releases (C1131-G/Quiver)
   ```

Installed copies check GitHub Releases through electron-updater and offer to install the new version.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Stuck on the loading screen | The standalone server failed to start. Run `bun run electron:preview` from a terminal to see its output. |
| Blank window after an update | Rebuild with `bun run package:win`, because `prepare-standalone.mjs` must copy `.next/static`. |
| "Not configured" at sign-in | `apps/web/.env.local` was missing when the app was built. |
