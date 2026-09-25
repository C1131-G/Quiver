import type { LegendListRenderItemProps } from "@legendapp/list/react-native";
import { LegendList } from "@legendapp/list/react-native";
import { eq, ilike, or, useLiveQuery } from "@tanstack/react-db";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { memo, useCallback, useState } from "react";
import { View } from "react-native";

import type { Choice } from "@/components/choice-group";
import { ChoiceGroup } from "@/components/choice-group";
import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { StyledSafeAreaView } from "@/components/styled";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { referenceQuery } from "@/db/reference";
import type { Athlete } from "@/db/rows";
import { useScorerDb } from "@/db/scorer-db-context";

const SEARCH_WAIT_MS = 200;
const ALL = 0;

/** "%text%" for ilike; wildcards typed by the scorer are dropped. */
const LIKE_WILDCARDS = /[%_]/gu;
const containsPattern = (text: string) =>
  `%${text.replaceAll(LIKE_WILDCARDS, "")}%`;

const AthletePickerRow = memo(
  // oxlint-disable-next-line prefer-arrow-callback -- named so React DevTools shows it
  function AthletePickerRow({
    athlete,
    onPress,
  }: {
    athlete: Athlete;
    onPress: (athleteId: string) => void;
  }) {
    const handlePress = useCallback(
      () => onPress(athlete.id),
      [athlete.id, onPress]
    );
    return (
      <ListRow
        aria-label={`${athlete.full_name}, ${athlete.id_no}`}
        onPress={handlePress}
      >
        <View className="flex-1 gap-1">
          <Text numberOfLines={1} variant="large">
            {athlete.full_name}
          </Text>
          <Text variant="muted">{athlete.id_no}</Text>
        </View>
      </ListRow>
    );
  }
);

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
    query: (query) =>
      query
        .from({ category: db.categories })
        .where(({ category }) => eq(category.is_active, true))
        .orderBy(({ category }) => category.sort_order, "asc"),
    queryKey: ["lookups", "categories", "active"],
  });

  const { data: athletes, isLoading } = useLiveQuery({
    query: (builder) => {
      let query = builder
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

  const openAthlete = useCallback((athleteId: string) => {
    router.push({
      params: { athleteId },
      pathname: "/new-session/[athleteId]",
    });
  }, []);
  const renderAthlete = useCallback(
    ({ item }: LegendListRenderItemProps<Athlete>) => (
      <AthletePickerRow athlete={item} onPress={openAthlete} />
    ),
    [openAthlete]
  );
  const keyExtractor = useCallback((athlete: Athlete) => athlete.id, []);

  return (
    <StyledSafeAreaView className="bg-background flex-1" edges={["bottom"]}>
      <LegendList
        contentContainerClassName="gap-2 p-4"
        data={athletes ?? []}
        keyboardShouldPersistTaps="handled"
        keyExtractor={keyExtractor}
        maintainVisibleContentPosition
        recycleItems
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState>
              {term === "" && categoryId === ALL
                ? "No athletes on this phone yet. Connect to the internet to load them."
                : "No athlete matches. Check the spelling or the category."}
            </EmptyState>
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
        renderItem={renderAthlete}
      />
    </StyledSafeAreaView>
  );
};
