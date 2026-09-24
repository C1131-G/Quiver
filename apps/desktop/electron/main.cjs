const { app, BrowserWindow, ipcMain, nativeTheme, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

/**
 * Scratch-profile override for automated Electron runs so they never touch
 * real user data. Must be applied before anything resolves a userData path.
 */
if (process.env.QUIVER_USER_DATA) {
  app.setPath("userData", process.env.QUIVER_USER_DATA);
}

const { bootMark } = require("./boot-trace.cjs");
const { registerUpdateHandlers } = require("./ipc/updates.cjs");
const {
  ensureServer,
  isAppUrl,
  PRODUCT_NAME,
  stopServer,
} = require("./server.cjs");

const loadingFilePath = () => path.join(__dirname, "loading.html");

const loadingWindowUrl = () => pathToFileURL(loadingFilePath()).href;

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
