import { useSelector } from "@tanstack/react-store";
import type { ReactNode } from "react";
import { createContext, use, useMemo } from "react";

import { authAtom } from "@/auth/auth-store";

import type { ScorerDb } from "./scorer-db";
import { scorerDbFor } from "./scorer-db";

interface ScorerContext {
  db: ScorerDb;
  userId: string;
}

const ScorerDbContext = createContext<ScorerContext | null>(null);

/** Opens the signed-in scorer's database for the screens below it. */
export const ScorerDbProvider = ({ children }: { children: ReactNode }) => {
  const userId = useSelector(authAtom, (state) =>
    state.status === "signed-in" ? state.scorer.userId : null
  );
  const value = useMemo(
    () => (userId ? { db: scorerDbFor(userId), userId } : null),
    [userId]
  );
  return <ScorerDbContext value={value}>{children}</ScorerDbContext>;
};

/** The signed-in scorer's database; only signed-in screens may call it. */
export const useScorerDb = () => {
  const context = use(ScorerDbContext);
  if (!context) {
    throw new Error("useScorerDb is only available to a signed-in scorer");
  }
  return context;
};
