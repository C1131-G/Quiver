import path from "node:path";

import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    brief: { expire: 300, revalidate: 60, stale: 30 },
    moderate: { expire: 86_400, revalidate: 3600, stale: 300 },
    realtime: { expire: 30, revalidate: 10, stale: 0 },
    reference: { expire: 604_800, revalidate: 86_400, stale: 3600 },
  },
  experimental: {
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
    /**
     * Instant navigation validation in dev — surfaces blocking client-nav
     * paths that page-load Suspense alone doesn't catch.
     */
    instantInsights: {
      validationLevel: "warning",
    },
    /**
     * Tree-shake barrel imports from icon packages per cold start.
     */
    optimizePackageImports: ["@phosphor-icons/react"],
    serverActions: {
      bodySizeLimit: "6mb",
    },
    /**
     * Use the native Rust port of the React Compiler with Turbopack instead
     * of the Babel transform for faster compilation and memoization.
     */
    turbopackRustReactCompiler: true,
    /**
     * Shell out to local `tsc` during `next build` typecheck instead of
     * requiring typescript/lib/typescript.js, so a move to the native
     * TypeScript 7 compiler needs no config change.
     * @see https://github.com/vercel/next.js/pull/95639
     */
    useTypeScriptCli: true,
  },
  /**
   * Emit a self-contained server bundle (.next/standalone) that Electron
   * (apps/desktop) launches as a child process in production. Keeps every
   * server feature (cacheComponents, partialPrefetching, Server Actions)
   * available offline, which `output: "export"` would force us to give up.
   */
  output: "standalone",
  /**
   * Trace from the monorepo root so workspace packages and the dependencies
   * they resolve land in the standalone bundle. The server entry ends up at
   * .next/standalone/apps/web/server.js as a result.
   */
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  /**
   * Prefetch one App Shell per route (shared across Links). Session cookies are
   * included in shells that read them. Pair with Link prefetch={true} +
   * segment `prefetch = 'partial'` for URL/searchParams-aware prefetches.
   */
  partialPrefetching: true,
  reactCompiler: true,
  transpilePackages: ["@workspace/ui"],
  /**
   * Statically type next/link href and next/navigation push/replace/prefetch
   * against the App Router route map (.next/types/routes.d.ts).
   * @see https://nextjs.org/docs/app/api-reference/config/typescript#statically-typed-links
   */
  typedRoutes: true,
};

export default withBundleAnalyzer(nextConfig);
