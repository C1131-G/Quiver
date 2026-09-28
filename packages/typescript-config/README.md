# `@workspace/typescript-config`

The shared TypeScript configurations every package in the monorepo extends.

All of them are strict, including `exactOptionalPropertyTypes`, so optional props must be omitted rather than set to `undefined`.

```json
{
  "extends": "@workspace/typescript-config/nextjs.json"
}
```

Check a package with `bun run typecheck` in it, or run `bun run typecheck` at the repository root to check them all through Turbo.
