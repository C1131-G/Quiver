import { expect, test as setup } from "@playwright/test";

// The seeded local-development admin from supabase/seed.sql. These
// credentials never leave the local rig; production uses real accounts.
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin12345";

setup("authenticate as the seeded admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(ADMIN_USERNAME);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /log in/iu }).click();
  await expect(page).toHaveURL(/\/dashboard/u, { timeout: 30_000 });
  await page.context().storageState({ path: "e2e/.auth/admin.json" });
});
