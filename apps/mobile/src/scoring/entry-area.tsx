import { View } from "react-native";

import type { CloseSessionProps } from "./close-session-buttons";
import { CloseSessionButtons } from "./close-session-buttons";
import type { EditBarProps } from "./edit-bar";
import { EditBar } from "./edit-bar";
import { useEntryMode } from "./entry-mode-toggle";
import { Keypad } from "./keypad";
import { TargetFace } from "./target-face";

/**
 * Everything below the scorecard: the keypad or the target while arrows are
 * left, the edit buttons, and Submit once every arrow is in. It takes the
 * height that is left, so the keys and target size to fit the phone.
 */
export const EntryArea = ({
  allShot,
  canScore,
  close,
  edit,
  lowestScore,
  onScore,
}: {
  allShot: boolean;
  canScore: boolean;
  close: CloseSessionProps;
  edit: EditBarProps;
  lowestScore: number;
  onScore: (value: string) => void;
}) => {
  const entryMode = useEntryMode();
  let entry: React.ReactNode = null;
  if (canScore) {
    entry =
      entryMode === "target" ? (
        <TargetFace
          disabled={false}
          lowestScore={lowestScore}
          onScore={onScore}
        />
      ) : (
        <Keypad disabled={false} lowestScore={lowestScore} onScore={onScore} />
      );
  }
  return (
    <View className="flex-1 justify-end gap-2">
      {entry}
      <EditBar {...edit} />
      {allShot ? <CloseSessionButtons {...close} /> : null}
    </View>
  );
};
