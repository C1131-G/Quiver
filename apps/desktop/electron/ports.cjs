const { app } = require("electron");
const { once } = require("node:events");
const { readFileSync, writeFileSync } = require("node:fs");
const { createServer } = require("node:net");
const path = require("node:path");

const HOST = "127.0.0.1";

const findFreePort = async () => {
  const probe = createServer();

  probe.listen(0, HOST);
  await once(probe, "listening");

  const { port } = probe.address();

  probe.close();
  await once(probe, "close");

  return port;
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

/**
 * The port is kept stable across launches so the renderer's origin — and with
 * it localStorage, cookies, and IndexedDB — survives a restart.
 */
const persistedPortPath = () =>
  path.join(app.getPath("userData"), "server-port.json");

const isValidPort = (value) =>
  Number.isInteger(value) && value > 0 && value <= 65_535;

const readPersistedPort = () => {
  try {
    const parsed = JSON.parse(readFileSync(persistedPortPath(), "utf-8"));
    return isValidPort(parsed?.port) ? parsed.port : null;
  } catch {
    return null;
  }
};

const persistPort = (port) => {
  writeFileSync(persistedPortPath(), JSON.stringify({ port }), "utf-8");
};

module.exports = {
  HOST,
  findFreePort,
  isPortAvailable,
  persistPort,
  readPersistedPort,
};
