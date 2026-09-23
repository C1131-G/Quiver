"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { valuesForFace } from "./arrow-values";
import type { SessionArrow } from "./use-sessions";
import { useCorrectArrow } from "./use-sessions";

export interface CorrectionTarget {
  arrow: SessionArrow;
  endNo: number;
  lowestScore: number;
  roundNo: number;
}

const REASON_MAX = 500;

const CorrectionForm = ({
  onDone,
  sessionId,
  target,
}: {
  onDone: () => void;
  sessionId: string;
  target: CorrectionTarget;
}) => {
  const mutation = useCorrectArrow(sessionId);
  const [value, setValue] = useState(target.arrow.value);
  const [reason, setReason] = useState("");
  const unchanged = value === target.arrow.value;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate(
      { arrowId: target.arrow.id, reason: reason.trim(), value },
      {
        onSuccess: () => {
          toast.success(
            `Arrow corrected from ${target.arrow.value} to ${value}.`
          );
          onDone();
        },
      }
    );
  };

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel id="correct-arrow-value">New score</FieldLabel>
          <ToggleGroup
            aria-labelledby="correct-arrow-value"
            className="flex-wrap"
            onValueChange={(next) => {
              const [picked] = next;
              if (picked) {
                setValue(picked);
              }
            }}
            spacing={1}
            value={[value]}
            variant="outline"
          >
            {valuesForFace(target.lowestScore).map((option) => (
              <ToggleGroupItem
                aria-label={option === "M" ? "Miss" : `Score ${option}`}
                className="w-10"
                key={option}
                value={option}
              >
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="correct-arrow-reason">Reason</FieldLabel>
          <Textarea
            id="correct-arrow-reason"
            maxLength={REASON_MAX}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: judge’s call on a line cutter"
            required
            value={reason}
          />
          <FieldDescription>
            Saved with your name in the session’s correction history.
          </FieldDescription>
        </Field>
        {mutation.error ? (
          <FieldError>{mutation.error.message}</FieldError>
        ) : null}
      </FieldGroup>
      <DialogFooter className="mt-6">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button
          disabled={unchanged || reason.trim() === "" || mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? "Saving…" : "Save correction"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const CorrectArrowDialog = ({
  onOpenChange,
  open,
  sessionId,
  target,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sessionId: string;
  target: CorrectionTarget | null;
}) => (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Correct arrow</DialogTitle>
        {target ? (
          <DialogDescription>
            Round {target.roundNo}, end {target.endNo}, arrow{" "}
            {target.arrow.arrow_no}. Scored as {target.arrow.value}.
          </DialogDescription>
        ) : null}
      </DialogHeader>
      {/* Keyed by arrow so every opening starts from that arrow's score. */}
      {target ? (
        <CorrectionForm
          key={target.arrow.id}
          onDone={() => onOpenChange(false)}
          sessionId={sessionId}
          target={target}
        />
      ) : null}
    </DialogContent>
  </Dialog>
);
