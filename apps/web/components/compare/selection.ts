import { z } from "zod";

/**
 * Up to six athletes, each in a fixed slot. The slot picks the series colour,
 * so removing one athlete leaves an empty slot rather than repainting the
 * others. In the URL: `athletes=a,,c`.
 */
export const MAX_COMPARED = 6;

export type Slots = (string | null)[];

const athleteId = z.uuid();

export const parseSlots = (value: string | null): Slots => {
  const slots = (value ?? "")
    .split(",")
    .slice(0, MAX_COMPARED)
    .map((id, index, all) => {
      const valid = athleteId.safeParse(id).success;
      // A repeated athlete keeps only its first slot.
      return valid && all.indexOf(id) === index ? id : null;
    });
  // A slot is only kept when it or a later slot holds an athlete.
  while (slots.length > 0 && slots.at(-1) === null) {
    slots.pop();
  }
  return slots;
};

export const serializeSlots = (slots: Slots) =>
  slots.some(Boolean) ? slots.map((id) => id ?? "").join(",") : null;

export const addToSlots = (slots: Slots, id: string): Slots => {
  if (slots.includes(id)) {
    return slots;
  }
  const free = slots.indexOf(null);
  if (free !== -1) {
    return slots.with(free, id);
  }
  return slots.length < MAX_COMPARED ? [...slots, id] : slots;
};

export const removeFromSlots = (slots: Slots, id: string): Slots =>
  parseSlots(serializeSlots(slots.map((slot) => (slot === id ? null : slot))));

export const selectedIds = (slots: Slots) =>
  slots.filter((id): id is string => id !== null);

/** A round format in the URL: `format=8-1` (distance id, face id). */
export interface RoundFormat {
  distanceId: number;
  faceId: number;
}

const FORMAT_PATTERN = /^(?<distance>\d{1,5})-(?<face>\d{1,5})$/u;

export const parseFormat = (value: string | null): RoundFormat | null => {
  const groups = FORMAT_PATTERN.exec(value ?? "")?.groups;
  if (!(groups?.distance && groups.face)) {
    return null;
  }
  return { distanceId: Number(groups.distance), faceId: Number(groups.face) };
};

export const formatParam = (format: RoundFormat) =>
  `${format.distanceId}-${format.faceId}`;

/**
 * Categorical series colours in fixed order, validated for colour-vision
 * deficiency on this app's light (#ffffff) and dark (#171717) cards. The
 * lighter light-mode slots sit under 3:1, so every value also appears as text
 * in the comparison tables.
 */
export const SERIES_COLORS = [
  { dark: "#3987e5", light: "#2a78d6" },
  { dark: "#d95926", light: "#eb6834" },
  { dark: "#199e70", light: "#1baf7a" },
  { dark: "#c98500", light: "#eda100" },
  { dark: "#d55181", light: "#e87ba4" },
  { dark: "#008300", light: "#008300" },
] as const;

export const slotKey = (slot: number) => `slot${slot + 1}`;
