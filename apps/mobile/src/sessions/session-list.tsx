import { eq, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { toast } from "sonner-native";

import { authAtom, signOut } from "@/auth/auth-store";
import { StyledSafeAreaView } from "@/components/styled";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { referenceQuery } from "@/db/reference";
import { useScorerDb } from "@/db/scorer-db-context";
import { SyncIssuesSummary, SyncStatusLine } from "@/sync/sync-status";
import { usePendingSync } from "@/sync/use-sync-status";

const SESSION_TYPE_LABELS = {
  competition: "Competition",
  training: "Training",
} as const;

const STATUS_LABELS = {
  cancelled: "Cancelled",
  completed: "Finished",
  in_progress: "In progress",
} as const;

const Header = () => {
  const email = useSelector(authAtom, (state) =>
    state.status === "signed-in" ? state.scorer.email : ""
  );
  const [signingOut, setSigningOut] = useState(false);

  // Signing out swaps this screen for sign-in, so there is no state to reset.
  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    toast.success(
      "Signed out. Scores stay on this phone for your next sign-in."
    );
  };

  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1 gap-1">
        <Text variant="h3">QuiverScore</Text>
        <Text numberOfLines={1} variant="muted">
          {email}
        </Text>
        <SyncStatusLine />
      </View>
      <Button
        aria-busy={signingOut}
        disabled={signingOut}
        onPress={handleSignOut}
        size="sm"
        variant="ghost"
      >
        <Text>{signingOut ? "Signing out…" : "Sign out"}</Text>
      </Button>
    </View>
  );
};

/** The scorer's sessions on this phone, newest first, and a way to start one. */
export const SessionList = () => {
  const { db, userId } = useScorerDb();
  const pending = usePendingSync();
  const { issuesBySession, waitingSessions } = pending;
  // Refresh athletes and lookups in the background whenever the list opens.
  useQuery(referenceQuery(db, userId));

  const { data: sessions } = useLiveQuery({
    query: (q) =>
      q
        .from({ session: db.sessions })
        .leftJoin({ athlete: db.athletes }, ({ athlete, session }) =>
          eq(athlete.id, session.athlete_id)
        )
        .orderBy(({ session }) => session.started_at, "desc")
        .select(({ athlete, session }) => ({
          athleteName: athlete?.full_name,
          id: session.id,
          sessionDate: session.session_date,
          sessionType: session.session_type,
          status: session.status,
          title: session.title,
        })),
    queryKey: ["sessions", "list"],
  });

  return (
    <StyledSafeAreaView className="bg-background flex-1">
      <FlatList
        contentContainerClassName="gap-2 p-4"
        data={sessions}
        // Rows show whether each session has reached the server.
        extraData={pending}
        keyExtractor={(session) => session.id}
        ListEmptyComponent={
          <View className="py-8">
            <Text className="text-center" variant="muted">
              No sessions yet. Start one to score an athlete.
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            <Header />
            <Button
              className="h-12"
              onPress={() => router.push("/new-session")}
              size="lg"
            >
              <Text>New session</Text>
            </Button>
            <SyncIssuesSummary />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            aria-label={`${item.athleteName ?? "Athlete"}, ${item.sessionDate}`}
            className="border-border active:bg-accent gap-1 border px-4 py-3"
            onPress={() =>
              router.push({
                params: { sessionId: item.id },
                pathname: "/sessions/[sessionId]",
              })
            }
            role="button"
          >
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1" numberOfLines={1} variant="large">
                {item.athleteName ?? "Unknown athlete"}
              </Text>
              <Text variant="small">{STATUS_LABELS[item.status]}</Text>
            </View>
            <Text variant="muted">
              {[
                item.sessionDate,
                SESSION_TYPE_LABELS[item.sessionType],
                item.title,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {issuesBySession.has(item.id) ? (
              <Text variant="error">Not sent</Text>
            ) : null}
            {waitingSessions.has(item.id) ? (
              <Text variant="muted">Waiting to send</Text>
            ) : null}
          </Pressable>
        )}
      />
    </StyledSafeAreaView>
  );
};
