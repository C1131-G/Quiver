/**
 * Mirrors apps/desktop/electron/ipc/updates.cjs's broadcast shape.
 * "downloading" covers both the initial "found one" moment and progress
 * ticks — `percent` only shows up once the first tick arrives.
 */
export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { percent?: number; state: "downloading"; version: string }
  | { state: "ready"; version: string }
  | { message: string; state: "error" };

interface ElectronUpdateApi {
  check: () => Promise<UpdateStatus>;
  install: () => Promise<void>;
  onChange: (listener: (status: UpdateStatus) => void) => () => void;
  status: () => Promise<UpdateStatus>;
}

/**
 * Exposed by apps/desktop/electron/preload.cjs. Undefined when the app runs
 * in a regular browser, so every caller must handle its absence.
 */
declare global {
  interface Window {
    electronAPI?: {
      backend: {
        update: ElectronUpdateApi;
      };
      platform: string;
    };
  }
}
