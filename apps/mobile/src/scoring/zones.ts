import type { ArrowValue } from "@workspace/shared/arrows";
import { isArrowValue } from "@workspace/shared/arrows";

/**
 * The ring colours of a target face, for keypad keys and scorecard cells.
 * Each pairs a background with a text colour that stays readable on it.
 */
interface Zone {
  background: string;
  /**
   * An edge, only on the rings that could vanish into the page (white in
   * light mode, black in dark), as Quiver Dashboard's ArrowValue does.
   */
  edge: string;
  text: string;
}

const NO_EDGE = "border border-transparent";

const GOLD: Zone = {
  background: "bg-zone-gold",
  edge: NO_EDGE,
  text: "text-zone-black",
};
const RED: Zone = {
  background: "bg-zone-red",
  edge: NO_EDGE,
  text: "text-zone-white",
};
const BLUE: Zone = {
  background: "bg-zone-blue",
  edge: NO_EDGE,
  text: "text-zone-white",
};
const BLACK: Zone = {
  background: "bg-zone-black",
  edge: "border border-white/20",
  text: "text-zone-white",
};
const WHITE: Zone = {
  background: "bg-zone-white",
  edge: "border border-black/15",
  text: "text-zone-black",
};
const MISS: Zone = {
  background: "bg-zone-miss",
  edge: NO_EDGE,
  text: "text-zone-white",
};

const ZONES = {
  "1": WHITE,
  "10": GOLD,
  "2": WHITE,
  "3": BLACK,
  "4": BLACK,
  "5": BLUE,
  "6": BLUE,
  "7": RED,
  "8": RED,
  "9": GOLD,
  M: MISS,
  X: GOLD,
} satisfies Record<ArrowValue, Zone>;

export const zoneOf = (value: string): Zone =>
  isArrowValue(value) ? ZONES[value] : MISS;
