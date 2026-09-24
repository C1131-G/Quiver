const pad = (value: number) => String(value).padStart(2, "0");

/** Today on the phone's calendar, as the database stores dates. */
export const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
