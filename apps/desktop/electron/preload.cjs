const { contextBridge, ipcRenderer } = require("electron");

/**
 * Sign-in is handled by Supabase inside the web app, so the bridge only
 * carries what needs the desktop: the auto-updater.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  backend: {
    update: {
      check: () => ipcRenderer.invoke("update.check"),
      install: () => ipcRenderer.invoke("update.install"),
      // Returns an unsubscribe function rather than exposing ipcRenderer
      // itself, so the renderer never touches the raw event emitter.
      onChange: (listener) => {
        const handler = (_event, status) => listener(status);
        ipcRenderer.on("update.changed", handler);
        return () => ipcRenderer.removeListener("update.changed", handler);
      },
      status: () => ipcRenderer.invoke("update.status"),
    },
  },
  platform: process.platform,
});
