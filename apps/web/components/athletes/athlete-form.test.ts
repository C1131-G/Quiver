/// <reference types="bun" />

import { expect, test } from "bun:test";

import { readAthleteForm } from "./athlete-form";

const formOf = (fields: Record<string, string>) => {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
};

const valid = {
  aaiNo: "",
  categoryId: "2",
  distanceId: "3",
  eventId: "1",
  fullName: "  Ada Archer ",
  gender: "female",
  idNo: "A-17",
  targetFaceId: "4",
};

test("a complete form becomes a database row, trimmed", () => {
  expect(readAthleteForm(formOf(valid))).toEqual({
    input: {
      aai_no: null,
      category_id: 2,
      distance_id: 3,
      event_id: 1,
      full_name: "Ada Archer",
      gender: "female",
      id_no: "A-17",
      target_face_id: 4,
    },
    ok: true,
  });
});

test("an unset select is an error, not the number 0", () => {
  expect(readAthleteForm(formOf({ ...valid, categoryId: "" }))).toEqual({
    error: "Select a category.",
    field: "categoryId",
    ok: false,
  });
});

test("an unknown gender is rejected instead of becoming male", () => {
  expect(readAthleteForm(formOf({ ...valid, gender: "x" }))).toEqual({
    error: "Select a gender.",
    field: "gender",
    ok: false,
  });
});

test("a blank name is required", () => {
  expect(readAthleteForm(formOf({ ...valid, fullName: "   " }))).toEqual({
    error: "Name is required.",
    field: "fullName",
    ok: false,
  });
});
