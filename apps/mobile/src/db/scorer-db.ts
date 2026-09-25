import {
  createExpoSQLitePersistence,
  persistedCollectionOptions,
} from "@tanstack/expo-db-sqlite-persistence";
import { createCollection } from "@tanstack/react-db";
import { openDatabaseSync } from "expo-sqlite";

import type {
  ArcheryEvent,
  Arrow,
  Athlete,
  Category,
  Distance,
  End,
  OutboxEntry,
  Round,
  SentSession,
  Session,
  SessionTemplate,
  SyncIssue,
  TargetFace,
} from "./rows";
import { toPersistenceDatabase } from "./sqlite";

/** Bump when a row type changes shape; stored rows are then rebuilt. */
const SCHEMA_VERSION = 1;

/**
 * Everything a scorer has on the phone, in a SQLite file of their own, so a
 * shared phone never mixes two scorers' work and signing out loses nothing.
 * Athletes, lookups and scheduled sessions are copies of the server's,
 * refreshed when online;
 * sessions, rounds, ends and arrows are written here first, the outbox
 * holds what the server has not seen yet, and sent_sessions the sessions
 * the server may already have.
 */
const createScorerDb = (userId: string) => {
  const database = openDatabaseSync(`quiverscore-${userId}.db`);
  const persistence = createExpoSQLitePersistence({
    database: toPersistenceDatabase(database),
  });

  const table = <TRow extends { id: TKey }, TKey extends number | string>(
    id: string
  ) =>
    createCollection(
      persistedCollectionOptions<TRow, TKey>({
        getKey: (row) => row.id,
        id,
        persistence,
        schemaVersion: SCHEMA_VERSION,
      })
    );

  return {
    arrows: table<Arrow, string>("arrows"),
    athletes: table<Athlete, string>("athletes"),
    categories: table<Category, number>("categories"),
    distances: table<Distance, number>("distances"),
    ends: table<End, string>("ends"),
    events: table<ArcheryEvent, number>("events"),
    outbox: table<OutboxEntry, string>("outbox"),
    rounds: table<Round, string>("rounds"),
    sentSessions: table<SentSession, string>("sent_sessions"),
    sessionTemplates: table<SessionTemplate, string>("session_templates"),
    sessions: table<Session, string>("sessions"),
    syncIssues: table<SyncIssue, string>("sync_issues"),
    targetFaces: table<TargetFace, number>("target_faces"),
  };
};

export type ScorerDb = ReturnType<typeof createScorerDb>;

const openDbs = new Map<string, ScorerDb>();

/** One database per scorer for the life of the app. */
export const scorerDbFor = (userId: string) => {
  const existing = openDbs.get(userId);
  if (existing) {
    return existing;
  }
  const created = createScorerDb(userId);
  openDbs.set(userId, created);
  return created;
};
