import { useSelector } from "@tanstack/react-store";
import { useEffect } from "react";

import { authAtom } from "@/auth/auth-store";
import { scorerDbFor } from "@/db/scorer-db";

import { startSync } from "./engine";

/**
 * Syncs the signed-in scorer's database with the server, and stops at
 * sign-out. Whatever is still queued waits in their database until they
 * sign in again.
 */
export const SyncRunner = () => {
  const userId = useSelector(authAtom, (state) =>
    state.status === "signed-in" ? state.scorer.userId : null
  );

  useEffect(
    // oxlint-disable-next-line prefer-arrow-callback -- named for stack traces and the effects skill
    function syncWhileSignedIn() {
      if (!userId) {
        return;
      }
      return startSync(scorerDbFor(userId), userId);
    },
    [userId]
  );

  return null;
};
