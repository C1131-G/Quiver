const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  backend: {
    auth: {
      changePassword: (input) =>
        ipcRenderer.invoke("auth.changePassword", input),
      login: (input) => ipcRenderer.invoke("auth.login", input),
      logout: () => ipcRenderer.invoke("auth.logout"),
      recover: (input) => ipcRenderer.invoke("auth.recover", input),
      setup: (input) => ipcRenderer.invoke("auth.setup", input),
      status: () => ipcRenderer.invoke("auth.status"),
    },
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
  // Only used by the local login page; the main process rejects this channel
  // from any other renderer and for any non-whitelisted destination.
  desktop: {
    continueToApp: (destination) =>
      ipcRenderer.invoke("app.continue", destination),
    copyRecoveryCode: (code) =>
      ipcRenderer.invoke("app.copyRecoveryCode", code),
    saveRecoveryCode: (code) =>
      ipcRenderer.invoke("app.saveRecoveryCode", code),
  },
  platform: process.platform,
});
