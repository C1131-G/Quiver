import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@workspace/shared/database.types";

import type { SyncedTable } from "@/db/rows";

import { toSyncError } from "./errors";
import type { Remote, UpsertBatch } from "./push";

interface Response {
  error: { code?: string; message: string } | null;
  status: number;
}

const orThrow = <TResponse extends Response>(response: TResponse) => {
  if (response.error) {
    throw toSyncError(response.status, response.error);
  }
  return response;
};

const upsertBatch = (client: SupabaseClient<Database>, batch: UpsertBatch) => {
  // Each table is named on its own so the rows are checked against it.
  switch (batch.table) {
    case "arrows": {
      return client.from("arrows").upsert(batch.rows);
    }
    case "ends": {
      return client.from("ends").upsert(batch.rows);
    }
    case "rounds": {
      return client.from("rounds").upsert(batch.rows);
    }
    case "sessions": {
      return client.from("sessions").upsert(batch.rows);
    }
    default: {
      const unknownTable: never = batch;
      throw new Error(`Unknown table ${JSON.stringify(unknownTable)}`);
    }
  }
};

/** The push's view of the server, through the signed-in scorer's client. */
export const supabaseRemote = (client: SupabaseClient<Database>): Remote => ({
  remove: async (table: SyncedTable, ids: readonly string[]) => {
    orThrow(await client.from(table).delete().in("id", ids));
  },
  sessionStatus: async (id) => {
    const { data } = orThrow(
      await client.from("sessions").select("status").eq("id", id).maybeSingle()
    );
    return data?.status;
  },
  setFinished: async (session) => {
    const { data } = orThrow(
      await client
        .from("sessions")
        .update({
          completed_at: session.completed_at,
          status: session.status,
        })
        .eq("id", session.id)
        .select("id")
    );
    return (data?.length ?? 0) > 0;
  },
  upsert: async (batch) => {
    orThrow(await upsertBatch(client, batch));
  },
});
