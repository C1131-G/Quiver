import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

/**
 * Locked instant-navigation specs. Under the `instant()` lock the server
 * serves only the static shell, so each assertion below proves the route's
 * meaningful content commits without waiting on dynamic data. Dynamic bodies
 * stream in after the lock releases.
 */
test("dashboard commits its static shell under the instant lock", async ({
  page,
}) => {
  await instant(
    page,
    async () => {
      await page.goto("/dashboard");
      await expect(
        page.getByRole("heading", { name: "Performance" })
      ).toBeVisible();
    },
    { baseURL: "http://127.0.0.1:3210" }
  );
});

test("sessions commits its static shell under the instant lock", async ({
  page,
}) => {
  await instant(
    page,
    async () => {
      await page.goto("/sessions");
      await expect(
        page.getByRole("heading", { name: "Sessions" })
      ).toBeVisible();
    },
    { baseURL: "http://127.0.0.1:3210" }
  );
});

test("compare commits its static shell under the instant lock", async ({
  page,
}) => {
  await instant(
    page,
    async () => {
      await page.goto("/compare");
      await expect(
        page.getByRole("heading", { name: "Compare" })
      ).toBeVisible();
    },
    { baseURL: "http://127.0.0.1:3210" }
  );
});

test("athletes commits its static shell under the instant lock", async ({
  page,
}) => {
  await instant(
    page,
    async () => {
      await page.goto("/athletes");
      await expect(
        page.getByRole("heading", { name: "Athletes" })
      ).toBeVisible();
    },
    { baseURL: "http://127.0.0.1:3210" }
  );
});

test("scorers commits its static shell under the instant lock", async ({
  page,
}) => {
  await instant(
    page,
    async () => {
      await page.goto("/scorers");
      await expect(
        page.getByRole("heading", { name: "Scorers" })
      ).toBeVisible();
    },
    { baseURL: "http://127.0.0.1:3210" }
  );
});

test("schedule commits its static shell under the instant lock", async ({
  page,
}) => {
  await instant(
    page,
    async () => {
      await page.goto("/schedule");
      await expect(
        page.getByRole("heading", { name: "Schedule" })
      ).toBeVisible();
    },
    { baseURL: "http://127.0.0.1:3210" }
  );
});

test("soft navigation lands on the shared shell instantly", async ({
  page,
}) => {
  await page.goto("/sessions");
  await expect(page.getByRole("heading", { name: "Sessions" })).toBeVisible();
  await instant(page, async () => {
    await page.getByRole("link", { name: "Performance" }).click();
    await expect(
      page.getByRole("heading", { name: "Performance" })
    ).toBeVisible();
  });
  await expect(page).toHaveURL(/\/dashboard/u);
});

test("a session scorecard streams its data after the shell", async ({
  page,
}) => {
  await page.goto("/sessions");
  await page
    .getByRole("link", { name: /20\d\d/u })
    .first()
    .click();
  await expect(page).toHaveURL(/\/sessions\/.+/u);
  await expect(
    page.getByRole("button", { name: /edit scores/iu })
  ).toBeVisible();
});
