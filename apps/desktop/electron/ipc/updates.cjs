const { autoUpdater } = require("electron-updater");

const { describeUpdateError } = require("./update-error.cjs");

/**
 * Register update-check IPC handlers and forward electron-updater's events to
 * every trusted renderer, so the app can show a "new release" indicator
 * without polling. Dependencies are injected so this stays testable and
 * independent of Electron startup state, matching the other ipc/ modules.
 *
 * Checking only makes sense in a packaged build: electron-builder writes the
 * app-update.yml that points electron-updater at the GitHub release feed at
 * package time, and a dev/unpacked run has none — electron-updater would
 * just throw looking for it. `isPackaged` gates every real check; the
 * handlers still exist in dev so the renderer never sees "no such channel".
 */
const IDLE_STATUS = { state: "idle" };
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 10_000;

const registerUpdateHandlers = ({
  ipcMain,
  isPackaged,
  getWindows,
  assertTrustedSender,
}) => {
  let latest = IDLE_STATUS;

  const broadcast = (status) => {
    latest = status;
    for (const window of getWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send("update.changed", latest);
      }
    }
  };

  const checkNow = async () => {
    if (!isPackaged) {
      return latest;
    }
    broadcast({ state: "checking" });
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error("Update check failed.", error);
      broadcast({ message: describeUpdateError(error), state: "error" });
    }
    return latest;
  };

  if (isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("checking-for-update", () => {
      broadcast({ state: "checking" });
    });
    autoUpdater.on("update-available", (release) => {
      broadcast({ state: "downloading", version: release.version });
    });
    autoUpdater.on("update-not-available", () => {
      broadcast(IDLE_STATUS);
    });
    autoUpdater.on("download-progress", (progress) => {
      broadcast({
        percent: Math.round(progress.percent),
        state: "downloading",
        version: latest.version,
      });
    });
    autoUpdater.on("update-downloaded", (release) => {
      broadcast({ state: "ready", version: release.version });
    });
    autoUpdater.on("error", (error) => {
      console.error("Updater reported an error.", error);
      broadcast({ message: describeUpdateError(error), state: "error" });
    });

    setTimeout(checkNow, FIRST_CHECK_DELAY_MS);
    setInterval(checkNow, CHECK_INTERVAL_MS);
  }

  ipcMain.handle("update.status", (event) => {
    assertTrustedSender(event);
    return latest;
  });

  ipcMain.handle("update.check", (event) => {
    assertTrustedSender(event);
    return checkNow();
  });

  ipcMain.handle("update.install", (event) => {
    assertTrustedSender(event);
    if (latest.state !== "ready") {
      throw new Error("No downloaded update is ready to install.");
    }
    autoUpdater.quitAndInstall();
  });
};

module.exports = { registerUpdateHandlers };
