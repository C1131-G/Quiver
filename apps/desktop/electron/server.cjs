const { app } = require("electron");
const { spawn } = require("node:child_process");
const { existsSync, mkdirSync, readFileSync } = require("node:fs");
const path = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const { bootMark } = require("./boot-trace.cjs");
const {
  findFreePort,
  HOST,
  isPortAvailable,
  persistPort,
  readPersistedPort,
} = require("./ports.cjs");

const PRODUCT_NAME = "Quiver Dashboard";
const WEB_ROOT = path.resolve(__dirname, "..", "..", "web");

const isProduction = app.isPackaged || process.argv.includes("--production");

let serverProcess;
let serverOrigin;

/**
 * The lock `next dev` writes; only its `appUrl` is used. A lock without a
 * parseable `appUrl` throws here, and the caller treats that as no server.
 */
const readDevLockUrl = (lockPath) => {
  const lock = JSON.parse(readFileSync(lockPath, "utf-8"));
  const url = new URL(lock.appUrl);
  return url.hostname === HOST ? url : null;
};

/** Reuses a `next dev` already running for apps/web instead of starting one. */
const findExistingDevServer = async () => {
  const lockPath = path.join(WEB_ROOT, ".next", "dev", "lock");
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const url = readDevLockUrl(lockPath);
    if (!url) {
      return null;
    }
    await fetch(url.origin);
    return url.origin;
  } catch {
    return null;
  }
};

/**
 * The standalone bundle lives next to the web build in development previews
 * and is shipped as an unpacked resource in packaged apps. Tracing from the
 * monorepo root nests the entry under apps/web.
 */
const resolveStandaloneEntry = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "standalone", "apps", "web", "server.js")
    : path.join(WEB_ROOT, ".next", "standalone", "apps", "web", "server.js");

/**
 * Electron's binary doubles as a Node runtime under ELECTRON_RUN_AS_NODE, so
 * the packaged app runs the Next server without bundling a second runtime.
 * The V8 compile cache lets the server skip recompiling its module graph on
 * every launch after the first.
 */
const startProductionServer = (port) => {
  const entry = resolveStandaloneEntry();
  const compileCachePath = path.join(app.getPath("userData"), "compile-cache");
  mkdirSync(compileCachePath, { recursive: true });

  serverProcess = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: HOST,
      NODE_COMPILE_CACHE: compileCachePath,
      NODE_ENV: "production",
      PORT: String(port),
    },
    stdio: "inherit",
    windowsHide: true,
  });
  bootMark("server spawned");
};

const startDevServer = (port) => {
  const bunCommand = process.platform === "win32" ? "bun.exe" : "bun";

  serverProcess = spawn(
    bunCommand,
    ["run", "dev", "--hostname", HOST, "--port", String(port)],
    {
      cwd: WEB_ROOT,
      stdio: "inherit",
      windowsHide: true,
    }
  );
  bootMark("server spawned");
};

/**
 * Early probes are cheap and the server usually answers within a few of them,
 * so ramping the backoff avoids idling past readiness on a flat poll while
 * still capping the total wait.
 */
const READINESS_DELAYS_MS = [15, 15, 25, 50, 100, 250];
const MAX_READINESS_ATTEMPTS = 240;

const waitForServer = async (origin, attempt = 0) => {
  try {
    await fetch(origin);
  } catch {
    if (attempt >= MAX_READINESS_ATTEMPTS) {
      throw new Error(`Next.js server at ${origin} did not start in time.`);
    }

    await delay(
      READINESS_DELAYS_MS[Math.min(attempt, READINESS_DELAYS_MS.length - 1)]
    );
    await waitForServer(origin, attempt + 1);
  }
};

const isServerRunning = () =>
  Boolean(serverProcess) && serverProcess.exitCode === null;

/**
 * `kill()` only reaps the direct child on Windows, which strands the `next`
 * process holding the port. Tear down the whole tree instead.
 */
const stopServer = () => {
  if (!isServerRunning()) {
    serverProcess = undefined;
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(serverProcess.pid), "/T", "/F"], {
      windowsHide: true,
    });
  } else {
    serverProcess.kill();
  }

  serverProcess = undefined;
};

const choosePort = async () => {
  const savedPort = readPersistedPort();
  if (savedPort === null) {
    const port = await findFreePort();
    persistPort(port);
    return port;
  }
  if (!(await isPortAvailable(savedPort))) {
    throw new Error(
      `${PRODUCT_NAME} server port ${savedPort} is already in use.`
    );
  }
  return savedPort;
};

const startServer = async () => {
  if (!isProduction) {
    const existingDevServer = await findExistingDevServer();
    if (existingDevServer) {
      serverOrigin = existingDevServer;
      return serverOrigin;
    }
  }

  const port = await choosePort();
  serverOrigin = `http://${HOST}:${port}`;

  if (isProduction) {
    startProductionServer(port);
  } else {
    startDevServer(port);
  }

  await waitForServer(serverOrigin);
  bootMark("server ready");

  return serverOrigin;
};

/** Concurrent callers share one start attempt instead of racing it. */
let serverStartPromise;

const ensureServer = () => {
  // A spawned server isn't answering yet while a start is in flight, so
  // callers during boot must wait on that start, not take the bare origin.
  if (serverStartPromise) {
    return serverStartPromise;
  }
  if (isServerRunning() && serverOrigin) {
    return Promise.resolve(serverOrigin);
  }

  serverStartPromise ??= (async () => {
    try {
      return await startServer();
    } finally {
      serverStartPromise = undefined;
    }
  })();
  return serverStartPromise;
};

const isAppUrl = (url) =>
  Boolean(serverOrigin) &&
  (url === serverOrigin || url.startsWith(`${serverOrigin}/`));

module.exports = { PRODUCT_NAME, ensureServer, isAppUrl, stopServer };
