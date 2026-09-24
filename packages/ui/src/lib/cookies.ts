/** Persists a small UI preference where the server can read it on next load. */
export const writeCookie = (name: string, value: string, maxAge: number) => {
  // oxlint-disable-next-line unicorn/no-document-cookie -- single choke point for a synchronous preference write; the async Cookie Store API would force every caller async for no benefit
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
};
