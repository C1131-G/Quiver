"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import type { UpdateStatus } from "@/types/electron";

const IDLE_STATUS: UpdateStatus = { state: "idle" };

const noopSubscribe = () => () => {
  // The bridge is injected by the preload before any page script runs and
  // never changes, so there is nothing to subscribe to.
};

const getBridge = () => globalThis.window?.electronAPI?.backend.update;

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
  const [status, setStatus] = useState<UpdateStatus>(IDLE_STATUS);

  useEffect(() => {
    const bridge = getBridge();
    if (!bridge) {
      return;
    }
    let active = true;
    const loadInitialStatus = async () => {
      const initial = await bridge.status();
      if (active) {
        setStatus(initial);
      }
    };
    loadInitialStatus();
    const unsubscribe = bridge.onChange(setStatus);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    available,
    check: () => getBridge()?.check(),
    install: () => getBridge()?.install(),
    status,
  };
};
