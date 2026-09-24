"use client";

import { useSyncExternalStore, useTransition } from "react";

import { updateStatusSchema } from "@/types/electron";
import type { ElectronUpdateApi, UpdateStatus } from "@/types/electron";

const IDLE_STATUS: UpdateStatus = { state: "idle" };
const LOAD_ERROR_MESSAGE = "Could not check for updates.";
const INSTALL_ERROR_MESSAGE = "Could not install the update.";

const noopSubscribe = () => () => {
  // The bridge is injected by the preload before any page script runs and
  // never changes, so there is nothing to subscribe to.
};

const getBridge = () => globalThis.window?.electronAPI?.backend.update;

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- boundary parser: unknown IPC payload in, schema-validated status out (type-safety-validation)
const parseStatus = (value: unknown) => {
  const parsed = updateStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

type StatusListener = (status: UpdateStatus) => void;

let currentStatus: UpdateStatus = IDLE_STATUS;
const statusListeners = new Set<StatusListener>();
let subscriptionCount = 0;
let stopSubscription: (() => void) | undefined;

const setSharedStatus = (status: UpdateStatus) => {
  currentStatus = status;
  for (const listener of statusListeners) {
    listener(status);
  }
};

/**
 * One bridge subscription for the whole app. Both the persistent sidebar
 * notice and Settings read the same status, so mounting Settings must not
 * start a second subscription or a second initial status load.
 */
const startSharedSubscription = (bridge: ElectronUpdateApi) => {
  let active = true;
  const loadInitialStatus = async () => {
    try {
      const initial = parseStatus(await bridge.status());
      if (active) {
        setSharedStatus(
          initial ?? { message: LOAD_ERROR_MESSAGE, state: "error" }
        );
      }
    } catch {
      if (active) {
        setSharedStatus({ message: LOAD_ERROR_MESSAGE, state: "error" });
      }
    }
  };
  void loadInitialStatus();
  const unsubscribe = bridge.onChange((status) => {
    const parsed = parseStatus(status);
    if (active && parsed) {
      setSharedStatus(parsed);
    }
  });
  return function stopSharedSubscription() {
    active = false;
    unsubscribe();
  };
};

const subscribeToStatus = (listener: StatusListener) => {
  statusListeners.add(listener);
  const bridge = getBridge();
  if (!bridge) {
    return () => {
      statusListeners.delete(listener);
    };
  }
  if (subscriptionCount === 0) {
    stopSubscription = startSharedSubscription(bridge);
  }
  subscriptionCount += 1;
  return () => {
    statusListeners.delete(listener);
    subscriptionCount -= 1;
    if (subscriptionCount === 0) {
      stopSubscription?.();
      stopSubscription = undefined;
      currentStatus = IDLE_STATUS;
    }
  };
};

const getStatusSnapshot = () => currentStatus;
const getServerStatusSnapshot = () => IDLE_STATUS;

/**
 * Tracks the desktop auto-updater. `available` is false in a regular browser
 * (and during server rendering), which has no updater — the UI that uses this
 * hook renders nothing there. Status pushed from the main process
 * (apps/desktop/electron/ipc/updates.cjs) replaces local state directly, so
 * the indicator reacts the instant a download finishes.
 */
export const useAppUpdate = () => {
  const available = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(getBridge()),
    () => false
  );
  const status = useSyncExternalStore(
    subscribeToStatus,
    getStatusSnapshot,
    getServerStatusSnapshot
  );
  const [actionPending, startAction] = useTransition();

  const check = () => {
    const bridge = getBridge();
    if (!bridge || actionPending) {
      return;
    }
    startAction(async () => {
      try {
        const next = parseStatus(await bridge.check());
        if (next) {
          setSharedStatus(next);
        }
      } catch {
        setSharedStatus({ message: LOAD_ERROR_MESSAGE, state: "error" });
      }
    });
  };

  const install = () => {
    const bridge = getBridge();
    if (!bridge || actionPending) {
      return;
    }
    startAction(async () => {
      try {
        await bridge.install();
      } catch {
        setSharedStatus({ message: INSTALL_ERROR_MESSAGE, state: "error" });
      }
    });
  };

  return { actionPending, available, check, install, status };
};
