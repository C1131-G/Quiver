import { eq, ilike, or, useLiveQuery } from "@tanstack/react-db";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";

import type { Choice } from "@/components/choice-group";
import { ChoiceGroup } from "@/components/choice-group";
import { StyledSafeAreaView } from "@/components/styled";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { referenceQuery } from "@/db/reference";
import { useScorerDb } from "@/db/scorer-db-context";

const SEARCH_WAIT_MS = 200;
const ALL = 0;

/** "%text%" for ilike; wildcards typed by the scorer are dropped. */
const LIKE_WILDCARDS = /[%_]/gu;
const containsPattern = (text: string) =>
  `%${text.replaceAll(LIKE_WILDCARDS, "")}%`;

const ReferenceStatus = () => {
  const { db, userId } = useScorerDb();
  const reference = useQuery(referenceQuery(db, userId));
  if (reference.isError) {
    return (
      <Text variant="muted">
        Offline: showing the athletes saved on this phone.
      </Text>
    );
  }
  if (reference.isFetching) {
    return <Text variant="muted">Updating athletes…</Text>;
  }
  return null;
};

/** Step one of a new session: find the athlete by name, ID or category. */
export const AthletePicker = () => {
  const { db } = useScorerDb();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(ALL);
  const [debouncedSearch] = useDebouncedValue(search, { wait: SEARCH_WAIT_MS });
  const term = debouncedSearch.trim();

  const { data: categories } = useLiveQuery({
    query: (q) =>
      q
        .from({ category: db.categories })
        .where(({ category }) => eq(category.is_active, true))
        .orderBy(({ category }) => category.sort_order, "asc"),
    queryKey: ["lookups", "categories", "active"],
  });

  const { data: athletes, isLoading } = useLiveQuery({
    query: (q) => {
      let query = q
        .from({ athlete: db.athletes })
        .orderBy(({ athlete }) => athlete.full_name, "asc");
      if (term !== "") {
        const pattern = containsPattern(term);
        query = query.where(({ athlete }) =>
          or(ilike(athlete.full_name, pattern), ilike(athlete.id_no, pattern))
        );
      }
      if (categoryId !== ALL) {
        query = query.where(({ athlete }) =>
          eq(athlete.category_id, categoryId)
        );
      }
      return query;
    },
    queryKey: ["athletes", "picker", term, categoryId],
  });

  const categoryChoices: Choice<number>[] = [
    { label: "All", value: ALL },
    ...(categories ?? []).map((category) => ({
      label: category.name,
      value: category.id,
    })),
  ];

  return (
    <StyledSafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <FlatList
        contentContainerClassName="gap-2 p-4"
        data={athletes ?? []}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(athlete) => athlete.id}
        ListEmptyComponent={
          isLoading ? null : (
            <View className="py-8">
              <Text className="text-center" variant="muted">
                {term === "" && categoryId === ALL
                  ? "No athletes on this phone yet. Connect to the internet to load them."
                  : "No athlete matches. Check the spelling or the category."}
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          <View className="gap-3 pb-2">
            <Input
              accessibilityLabel="Search athletes by name or ID"
              autoCapitalize="words"
              autoCorrect={false}
              className="h-12"
              clearButtonMode="while-editing"
              onChangeText={setSearch}
              placeholder="Search by name or ID"
              returnKeyType="search"
              value={search}
            />
            <ChoiceGroup
              choices={categoryChoices}
              label="Category"
              onChange={setCategoryId}
              value={categoryId}
            />
            <ReferenceStatus />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            aria-label={`${item.full_name}, ${item.id_no}`}
            className="border-border active:bg-accent min-h-14 justify-center border px-4 py-2"
            onPress={() =>
              router.push({
                params: { athleteId: item.id },
                pathname: "/new-session/[athleteId]",
              })
            }
            role="button"
          >
            <Text variant="large">{item.full_name}</Text>
            <Text variant="muted">{item.id_no}</Text>
          </Pressable>
        )}
      />
    </StyledSafeAreaView>
  );
};
