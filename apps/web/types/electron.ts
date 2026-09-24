import { z } from "zod";

/**
 * Mirrors apps/desktop/electron/ipc/updates.cjs's broadcast shape.
 * "downloading" covers both the initial "found one" moment and progress
 * ticks — `percent` only shows up once the first tick arrives.
 */
export const updateStatusSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("idle") }),
  z.object({ state: z.literal("checking") }),
  z.object({
    percent: z.number().optional(),
    state: z.literal("downloading"),
    version: z.string(),
  }),
  z.object({ state: z.literal("ready"), version: z.string() }),
  z.object({ message: z.string(), state: z.literal("error") }),
]);

export type UpdateStatus = z.infer<typeof updateStatusSchema>;

export interface ElectronUpdateApi {
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
