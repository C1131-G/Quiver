const { app, BrowserWindow, ipcMain, nativeTheme, shell } = require("electron");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require("node:fs");
const { createServer } = require("node:net");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { pathToFileURL } = require("node:url");
const { setTimeout: delay } = require("node:timers/promises");
const { registerUpdateHandlers } = require("./ipc/updates.cjs");

const HOST = "127.0.0.1";
const PRODUCT_NAME = "Quiver Dashboard";
const WEB_ROOT = path.resolve(__dirname, "..", "..", "web");

/**
 * Scratch-profile override for automated Electron runs so they never touch
 * real user data. Must be applied before anything resolves a userData path.
 */
if (process.env.QUIVER_USER_DATA) {
  app.setPath("userData", process.env.QUIVER_USER_DATA);
}

const isProductionPreview = process.argv.includes("--production");
const isProduction = app.isPackaged || isProductionPreview;

/**
 * Set QUIVER_BOOT_TRACE=1 to print milliseconds-since-process-start for each
 * startup milestone, so time-to-first-paint regressions show up early.
 */
const bootMark = (label) => {
  if (process.env.QUIVER_BOOT_TRACE === "1") {
    console.error(`[boot-trace] ${label}: ${Math.round(performance.now())}ms`);
  }
};

const loadingFilePath = () => path.join(__dirname, "loading.html");

const loadingWindowUrl = () => pathToFileURL(loadingFilePath()).href;

let serverProcess;
let serverOrigin;

const findFreePort = async () => {
  const probe = createServer();

  probe.listen(0, HOST);
  await once(probe, "listening");

  const { port } = probe.address();

  probe.close();
  await once(probe, "close");

  return port;
};

/**
 * The port is kept stable across launches so the renderer's origin — and with
 * it localStorage, cookies, and IndexedDB — survives a restart.
 */
const persistedPortPath = () =>
  path.join(app.getPath("userData"), "server-port.json");

const readPersistedPort = () => {
  try {
    const parsed = JSON.parse(readFileSync(persistedPortPath(), "utf-8"));
    return Number.isInteger(parsed.port) && parsed.port > 0
      ? parsed.port
      : null;
  } catch {
    return null;
  }
};

const isPortAvailable = async (port) => {
  const probe = createServer();
  try {
    probe.listen(port, HOST);
    // `once` rejects if the server emits "error" first (port taken).
    await once(probe, "listening");
    return true;
  } catch {
    return false;
  } finally {
    probe.close();
  }
};

/** Reuses a `next dev` already running for apps/web instead of starting one. */
const findExistingDevServer = async () => {
  const lockPath = path.join(WEB_ROOT, ".next", "dev", "lock");
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf-8"));
    const parsedUrl = new URL(lock.appUrl);
    if (parsedUrl.hostname !== HOST) {
      return null;
    }

    const { origin } = parsedUrl;
    await fetch(origin);
    return origin;
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

const startServer = async () => {
  if (!isProduction) {
    const existingDevServer = await findExistingDevServer();
    if (existingDevServer) {
      serverOrigin = existingDevServer;
      return serverOrigin;
    }
  }

  const savedPort = readPersistedPort();
  if (savedPort !== null && !(await isPortAvailable(savedPort))) {
    throw new Error(
      `${PRODUCT_NAME} server port ${savedPort} is already in use.`
    );
  }
  const port = savedPort ?? (await findFreePort());
  if (savedPort === null) {
    writeFileSync(persistedPortPath(), JSON.stringify({ port }), "utf-8");
  }

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

/**
 * Renderer-initiated navigation stays inside the app origin (or the local
 * loading page); anything else opens in the user's browser.
 */
const attachNavigationPolicy = (contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  contents.on("will-navigate", (event, url) => {
    if (isAppUrl(url) || url === loadingWindowUrl()) {
      return;
    }
    event.preventDefault();
    shell.openExternal(url);
  });
};

/** IPC is only answered for pages served by the app's own server. */
const assertTrustedSender = (event) => {
  if (!isAppUrl(event.sender.getURL())) {
    throw new Error("Untrusted renderer.");
  }
};

const registerIpcHandlers = () => {
  registerUpdateHandlers({
    assertTrustedSender,
    getWindows: () => BrowserWindow.getAllWindows(),
    ipcMain,
    // Strictly app.isPackaged, not isProduction: a --production preview run
    // has no app-update.yml (electron-builder only writes one when it
    // packages), so checking there would just surface a stray error.
    isPackaged: app.isPackaged,
  });
};

/**
 * Paint the window in the app's own background colour so the frame that
 * appears before the first render doesn't flash white on a dark desktop.
 */
const resolveBackgroundColor = () =>
  nativeTheme.shouldUseDarkColors ? "#0a0b0d" : "#ffffff";

const createWindow = async () => {
  // Boot the server alongside window creation and first paint, not after.
  const serverReady = ensureServer();
  const mainWindow = new BrowserWindow({
    backgroundColor: resolveBackgroundColor(),
    height: 800,
    minHeight: 640,
    minWidth: 960,
    show: false,
    title: PRODUCT_NAME,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
    width: 1280,
  });
  bootMark("window created");

  attachNavigationPolicy(mainWindow.webContents);

  /**
   * Paint a local loading screen immediately — it needs no server — then
   * open the app once the Next server answers. Its proxy sends signed-out
   * users to Supabase login and everyone else to the dashboard.
   */
  mainWindow.maximize();
  await mainWindow.loadFile(loadingFilePath());
  mainWindow.show();
  bootMark("loading painted");

  const origin = await serverReady;
  mainWindow.webContents.once("did-finish-load", () =>
    bootMark("first Next paint")
  );
  await mainWindow.loadURL(origin);
};

const startApp = async () => {
  await app.whenReady();
  bootMark("whenReady");

  registerIpcHandlers();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
};

const runApp = async () => {
  try {
    await startApp();
  } catch (error) {
    console.error(error);
    app.quit();
  }
};

if (app.requestSingleInstanceLock()) {
  app.on("second-instance", () => {
    const [existingWindow] = BrowserWindow.getAllWindows();

    if (existingWindow) {
      if (existingWindow.isMinimized()) {
        existingWindow.restore();
      }

      existingWindow.focus();
    }
  });

  runApp();
} else {
  app.quit();
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopServer();
});
