"use client";

import { BackspaceIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@workspace/ui/components/button";

import { ArrowValue } from "./arrow-value";
import { valuesForFace } from "./arrow-values";

/**
 * The scorer's keypad, in ring colours: X to the face's lowest ring, then
 * a miss. Below it, clearing an arrow or a whole end, as in QuiverScore.
 */
export const ScoreKeypad = ({
  disabled,
  lowestScore,
  onClearArrow,
  onClearEnd,
  onScore,
}: {
  disabled: boolean;
  lowestScore: number;
  onClearArrow: () => void;
  onClearEnd: () => void;
  onScore: (value: string) => void;
}) => (
  <div className="flex flex-col gap-3">
    <fieldset className="grid grid-cols-3 gap-2">
      <legend className="sr-only">Score keypad</legend>
      {valuesForFace(lowestScore).map((value) => (
        <Button
          aria-label={value === "M" ? "Miss" : `Score ${value}`}
          disabled={disabled}
          key={value}
          onClick={() => onScore(value)}
          size="lg"
          variant="outline"
        >
          <ArrowValue className="size-7" value={value} />
        </Button>
      ))}
    </fieldset>
    <div className="grid grid-cols-2 gap-2">
      <Button disabled={disabled} onClick={onClearArrow} variant="ghost">
        <BackspaceIcon aria-hidden="true" data-icon="inline-start" />
        Clear arrow
      </Button>
      <Button disabled={disabled} onClick={onClearEnd} variant="ghost">
        <TrashIcon aria-hidden="true" data-icon="inline-start" />
        Clear end
      </Button>
    </div>
  </div>
);
