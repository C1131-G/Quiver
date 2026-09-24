import { gte, useLiveQuery } from "@tanstack/react-db";
import { router } from "expo-router";
import { View } from "react-native";

import { ListRow } from "@/components/list-row";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useScorerDb } from "@/db/scorer-db-context";
import { today } from "@/lib/today";

const SESSION_TYPE_LABELS = {
  competition: "Competition",
  training: "Training",
} as const;

const athleteCount = (count: number) =>
  count === 1 ? "1 athlete" : `${count} athletes`;

/** Sessions an admin planned for today or later, soonest first. */
export const ScheduledList = () => {
  const { db } = useScorerDb();
  const from = today();
  const { data: templates } = useLiveQuery({
    query: (q) =>
      q
        .from({ template: db.sessionTemplates })
        .where(({ template }) => gte(template.session_date, from))
        .orderBy(({ template }) => template.session_date, "asc")
        .orderBy(({ template }) => template.title, "asc"),
    queryKey: ["session-templates", "upcoming", from],
  });

  if (templates.length === 0) {
    return null;
  }

  return (
    <View className="gap-2">
      <Text aria-level={2} role="heading" variant="section">
        Scheduled
      </Text>
      {templates.map((template) => (
        <ListRow
          aria-label={`${template.title}, ${template.session_date}`}
          key={template.id}
          onPress={() =>
            router.push({
              params: { templateId: template.id },
              pathname: "/scheduled/[templateId]",
            })
          }
        >
          <View className="flex-1 gap-1.5">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1" numberOfLines={1} variant="large">
                {template.title}
              </Text>
              <Badge variant="secondary">
                <Text>
                  {template.session_date === from
                    ? "Today"
                    : template.session_date}
                </Text>
              </Badge>
            </View>
            <Text numberOfLines={1} variant="muted">
              {[
                SESSION_TYPE_LABELS[template.session_type],
                athleteCount(template.athlete_ids.length),
              ].join(" · ")}
            </Text>
          </View>
        </ListRow>
      ))}
    </View>
  );
};
