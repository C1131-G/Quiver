import { useState } from "react";
import { View } from "react-native";

import { Sheet } from "@/components/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { FieldError, SummaryRow } from "./setup-parts";
import type { SetupFormApi } from "./setup-schema";

/**
 * Date and title in one line; both are edited in a sheet so the setup
 * screen stays short enough to never scroll.
 */
export const DetailsRow = ({ form }: { form: SetupFormApi }) => {
  const [open, setOpen] = useState(false);
  return (
    <form.Subscribe
      selector={(state) => ({
        date: state.values.sessionDate,
        dateErrors: state.fieldMeta.sessionDate?.errors ?? [],
        title: state.values.title.trim(),
      })}
    >
      {({ date, dateErrors, title }) => (
        <>
          <SummaryRow
            label="Date & title"
            last
            onPress={() => setOpen(true)}
            value={title === "" ? date : `${date} · ${title}`}
          />
          {dateErrors.length > 0 ? (
            <View className="px-3 pb-2">
              <FieldError errors={dateErrors} />
            </View>
          ) : null}
          <Sheet
            onClose={() => setOpen(false)}
            open={open}
            title="Date & title"
          >
            <View className="gap-5 p-4">
              <form.Field name="sessionDate">
                {(field) => (
                  <View className="gap-2">
                    <Label nativeID="session-date-label">Date</Label>
                    <Input
                      accessibilityLabelledBy="session-date-label"
                      className="h-11"
                      inputMode="numeric"
                      maxLength={10}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="2026-09-24"
                      value={field.state.value}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </View>
                )}
              </form.Field>
              <form.Field name="title">
                {(field) => (
                  <View className="gap-2">
                    <Label nativeID="session-title-label">
                      Title (optional)
                    </Label>
                    <Input
                      accessibilityLabelledBy="session-title-label"
                      className="h-11"
                      maxLength={120}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      onSubmitEditing={() => setOpen(false)}
                      placeholder="e.g. State trials, morning"
                      returnKeyType="done"
                      value={field.state.value}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </View>
                )}
              </form.Field>
            </View>
          </Sheet>
        </>
      )}
    </form.Subscribe>
  );
};
