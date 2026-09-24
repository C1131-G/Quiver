"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import type { KeyboardEvent } from "react";
import { useMemo, useState } from "react";

import { formatRoundFormat } from "@/lib/format";

import { isScoreOnFace } from "./arrow-values";
import { EditableRound } from "./editable-round";
import type { Cell, Draft, EditorRound } from "./score-editor";
import {
  cellKey,
  directionForKey,
  moveFrom,
  savedValues,
  scoreForKey,
  scoreRounds,
  toChanges,
  withValue,
} from "./score-editor";
import { ScoreKeypad } from "./score-keypad";
import type { SessionDetail } from "./use-sessions";
import { useSaveScores } from "./use-sessions";

const REASON_MAX = 500;

const toEditorRounds = (session: SessionDetail): EditorRound[] =>
  session.rounds.map((round) => ({
    arrowsPerEnd: round.arrows_per_end,
    ends: round.ends.map((end) => ({
      arrows: end.arrows.map((arrow) => ({
        arrowNo: arrow.arrow_no,
        value: arrow.value,
      })),
      endNo: end.end_no,
    })),
    id: round.id,
    plannedEnds: round.planned_ends,
    roundNo: round.round_no,
  }));

const focusCell = (cell: Cell) =>
  document
    .querySelector<HTMLButtonElement>(`[data-cell="${cellKey(cell)}"]`)
    ?.focus();

const firstCell = (rounds: EditorRound[]): Cell | undefined => {
  const [round] = rounds;
  return round ? { arrowNo: 1, endNo: 1, roundId: round.id } : undefined;
};

/**
 * Admin editing for every round of a session, modelled on
 * QuiverScore: pick an arrow, press a score, the selection moves on. Changes are
 * drafts until saved together with one reason.
 */
export const ScoreEditorPanel = ({
  onDone,
  session,
}: {
  onDone: () => void;
  session: SessionDetail;
}) => {
  const rounds = useMemo(() => toEditorRounds(session), [session]);
  const saved = useMemo(() => savedValues(rounds), [rounds]);
  const [draft, setDraft] = useState<Draft>(new Map());
  const [selected, setSelected] = useState<Cell | undefined>(() =>
    firstCell(rounds)
  );
  // An off-face key press is explained inline, next to the selection.
  const [notice, setNotice] = useState<string>();
  const [reason, setReason] = useState("");
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const mutation = useSaveScores(session.id);

  const lowestOf = (roundId: string) =>
    session.rounds.find((round) => round.id === roundId)?.target_face
      ?.lowest_score ?? 1;
  const selectedRound = session.rounds.find(
    (round) => round.id === selected?.roundId
  );

  const setCell = (cell: Cell, value: string | null) =>
    setDraft((current) => withValue(saved, current, cell, value));

  const score = (cell: Cell, value: string) => {
    if (!isScoreOnFace(value, lowestOf(cell.roundId))) {
      setNotice(`${value} is not a score on this target face.`);
      return false;
    }
    setNotice(undefined);
    setCell(cell, value);
    return true;
  };

  const onKeypadScore = (value: string) => {
    if (selected && score(selected, value)) {
      setSelected(moveFrom(rounds, selected, "next"));
    }
  };

  const clearEnd = () => {
    const round = rounds.find(({ id }) => id === selected?.roundId);
    if (!(round && selected)) {
      return;
    }
    setDraft((current) => {
      let next = current;
      for (let arrowNo = 1; arrowNo <= round.arrowsPerEnd; arrowNo += 1) {
        next = withValue(saved, next, { ...selected, arrowNo }, null);
      }
      return next;
    });
  };

  const onCellKey = (event: KeyboardEvent<HTMLButtonElement>, cell: Cell) => {
    const value = scoreForKey(event.key);
    const direction = directionForKey(event.key);
    if (value) {
      event.preventDefault();
      if (score(cell, value)) {
        focusCell(moveFrom(rounds, cell, "next"));
      }
    } else if (direction) {
      event.preventDefault();
      focusCell(moveFrom(rounds, cell, direction));
    } else if (event.key === "Delete") {
      event.preventDefault();
      setCell(cell, null);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      setCell(cell, null);
      focusCell(moveFrom(rounds, cell, "previous"));
    }
  };

  const save = () => {
    if (mutation.isPending) {
      return;
    }
    mutation.mutate(
      { changes: toChanges(draft), reason: reason.trim() },
      // The editor closes onto the updated scorecard: that is the feedback.
      { onSuccess: onDone }
    );
  };

  const changedKeys = new Set(draft.keys());
  const grids = scoreRounds(rounds, saved, draft);

  return (
    <div className="grid grid-cols-[1fr_18rem] items-start gap-6">
      <div className="flex flex-col gap-6">
        {session.rounds.map((round, index) => (
          <EditableRound
            changedKeys={changedKeys}
            format={formatRoundFormat(
              round.distance?.meters ?? 0,
              round.target_face?.name ?? ""
            )}
            key={round.id}
            onCellKey={onCellKey}
            onSelect={setSelected}
            roundId={round.id}
            roundNo={round.round_no}
            rows={grids[index] ?? []}
            selected={selected}
          />
        ))}
      </div>

      <Card className="sticky top-0">
        <CardHeader>
          <CardTitle>Edit scores</CardTitle>
          <CardDescription aria-live="polite">
            {selected && selectedRound
              ? `Round ${selectedRound.round_no}, end ${selected.endNo}, arrow ${selected.arrowNo}`
              : "Select an arrow to edit"}
          </CardDescription>
          {notice ? (
            <p className="text-destructive text-xs" role="alert">
              {notice}
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <ScoreKeypad
              disabled={!selected}
              lowestScore={selected ? lowestOf(selected.roundId) : 1}
              onClearArrow={() => selected && setCell(selected, null)}
              onClearEnd={clearEnd}
              onScore={onKeypadScore}
            />
            <Field>
              <FieldLabel htmlFor="score-edit-reason">Reason</FieldLabel>
              <Textarea
                id="score-edit-reason"
                maxLength={REASON_MAX}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: checked against the paper scorecard"
                value={reason}
              />
              <FieldDescription>
                {draft.size === 0
                  ? "No changes yet."
                  : `${draft.size} ${draft.size === 1 ? "change" : "changes"}, saved together with your name and this reason.`}
              </FieldDescription>
              {mutation.error ? (
                <FieldError>{mutation.error.message}</FieldError>
              ) : null}
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() =>
                  draft.size > 0 ? setConfirmingDiscard(true) : onDone()
                }
                variant="outline"
              >
                {draft.size > 0 ? "Discard" : "Done"}
              </Button>
              <Button
                disabled={
                  draft.size === 0 || reason.trim() === "" || mutation.isPending
                }
                onClick={save}
              >
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog onOpenChange={setConfirmingDiscard} open={confirmingDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {draft.size} unsaved {draft.size === 1 ? "change" : "changes"}{" "}
              will be lost. The saved scores stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onDone} variant="destructive">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
