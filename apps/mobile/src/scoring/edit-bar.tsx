import { Delete, Trash2, Undo2 } from "lucide-react-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const UndoIcon = withUniwind(Undo2);
const BackspaceIcon = withUniwind(Delete);
const TrashIcon = withUniwind(Trash2);

export interface EditBarProps {
  canEditEnd: boolean;
  canUndo: boolean;
  onClearEnd: () => void;
  onDeleteArrow: () => void;
  onUndo: () => void;
}

/**
 * Taking scores back: Undo removes the arrow entered last anywhere in the
 * session; Delete arrow and Clear end act on the end being edited.
 */
export const EditBar = ({
  canEditEnd,
  canUndo,
  onClearEnd,
  onDeleteArrow,
  onUndo,
}: EditBarProps) => (
  <View className="flex-row gap-1.5">
    <Button
      className="h-11 flex-1"
      disabled={!canUndo}
      onPress={onUndo}
      variant="outline"
    >
      <UndoIcon colorClassName="accent-foreground" size={16} />
      <Text>Undo</Text>
    </Button>
    <Button
      className="h-11 flex-1"
      disabled={!canEditEnd}
      onPress={onDeleteArrow}
      variant="outline"
    >
      <BackspaceIcon colorClassName="accent-foreground" size={16} />
      <Text>Delete</Text>
    </Button>
    <Button
      className="h-11 flex-1"
      disabled={!canEditEnd}
      onPress={onClearEnd}
      variant="outline"
    >
      <TrashIcon colorClassName="accent-foreground" size={16} />
      <Text>Clear end</Text>
    </Button>
  </View>
);
