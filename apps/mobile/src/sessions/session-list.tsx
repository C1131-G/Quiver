import { eq, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { toast } from "sonner-native";

import { authAtom, signOut } from "@/auth/auth-store";
import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { PlusIcon, StyledSafeAreaView } from "@/components/styled";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { referenceQuery } from "@/db/reference";
import { useScorerDb } from "@/db/scorer-db-context";
import { ScheduledList } from "@/scheduled/scheduled-list";
import { openScoring } from "@/scoring/active-session";
import { SyncIssuesSummary, SyncStatusLine } from "@/sync/sync-status";
import { usePendingSync } from "@/sync/use-sync-status";

import { SessionStatusBadge } from "./session-status-badge";

const SESSION_TYPE_LABELS = {
  competition: "Competition",
  training: "Training",
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
    <View className="flex-row items-start justify-between gap-3 pt-2">
      <View className="flex-1 gap-1">
        <Text variant="title">QuiverScore</Text>
        <Text numberOfLines={1} variant="muted">
          {email}
        </Text>
      </View>
      <Button
        aria-busy={signingOut}
        disabled={signingOut}
        onPress={handleSignOut}
        size="sm"
        variant="outline"
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
          <EmptyState>
            No sessions yet. Start one to score an athlete.
          </EmptyState>
        }
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            <Header />
            <SyncStatusLine />
            <Button
              className="h-12"
              onPress={() => router.push("/new-session")}
              size="lg"
            >
              <PlusIcon colorClassName="accent-primary-foreground" size={18} />
              <Text>New session</Text>
            </Button>
            <SyncIssuesSummary />
            <ScheduledList />
            <Text aria-level={2} role="heading" variant="section">
              Your sessions
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ListRow
            aria-label={`${item.athleteName ?? "Athlete"}, ${item.sessionDate}`}
            onPress={() => openScoring(item.id)}
          >
            <View className="flex-1 gap-1.5">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1" numberOfLines={1} variant="large">
                  {item.athleteName ?? "Unknown athlete"}
                </Text>
                <SessionStatusBadge status={item.status} />
              </View>
              <Text numberOfLines={1} variant="muted">
                {[
                  item.sessionDate,
                  SESSION_TYPE_LABELS[item.sessionType],
                  item.title,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {issuesBySession.has(item.id) ? (
                <Badge className="self-start" variant="destructive">
                  <Text>Not sent</Text>
                </Badge>
              ) : null}
              {waitingSessions.has(item.id) ? (
                <Badge className="self-start" variant="outline">
                  <Text>Waiting to send</Text>
                </Badge>
              ) : null}
            </View>
          </ListRow>
        )}
      />
    </StyledSafeAreaView>
  );
};
