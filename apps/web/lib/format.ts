const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const shortDateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const percentFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  style: "percent",
});

const averageFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const integerFormat = new Intl.NumberFormat();

/** A Postgres `date` ("2026-09-22") as a local calendar day, never UTC. */
export const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
};

/** A local calendar day as a Postgres `date`. */
export const toIsoDate = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

export const addDays = (value: string, days: number) => {
  const date = parseIsoDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
};

export const formatDate = (value: string) =>
  dateFormat.format(parseIsoDate(value));

export const formatShortDate = (value: string) =>
  shortDateFormat.format(parseIsoDate(value));

export const formatDateTime = (value: string) =>
  dateTimeFormat.format(new Date(value));

export const formatPercent = (part: number, whole: number) =>
  whole > 0 ? percentFormat.format(part / whole) : "—";

export const formatAverage = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : averageFormat.format(value);

export const formatInteger = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : integerFormat.format(value);

/** A round format: distance and target face, e.g. "70 m · 122 cm". */
export const formatRoundFormat = (meters: number, faceName: string) =>
  `${meters} m · ${faceName}`;

const dayDateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  weekday: "short",
  year: "numeric",
});

/** A session date with its weekday, e.g. "Tue, 22 Sep 2026". */
export const formatDayDate = (value: string) =>
  dayDateFormat.format(parseIsoDate(value));

const NOON = 12;

/**
 * A time the way range scorecards write it: 12-hour, with FN (forenoon,
 * before noon) or AN (afternoon).
 */
export const formatSessionTime = (value: string) => {
  const date = new Date(value);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours % NOON || NOON}:${minutes} ${hours < NOON ? "FN" : "AN"}`;
};
