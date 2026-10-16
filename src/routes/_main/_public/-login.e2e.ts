import {password, users} from "../../../../scripts/e2e/data";
import {expect, test} from "../../../../scripts/e2e/fixtures";


test("signs in, persists the session, and protects pages after logout", async ({ page }) => {
    await page.goto("/settings/imports/mylists");
    await expect(page).toHaveURL(/\/login\?/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe("/settings/imports/mylists");

    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Email", { exact: true })).toHaveAccessibleDescription(/Invalid email address/);
    await expect(page.getByLabel("Password", { exact: true })).toHaveAccessibleDescription("Password is required.");

    await page.getByLabel("Email", { exact: true }).fill(users.owner.email);
    await page.getByLabel("Password", { exact: true }).fill("IncorrectPassword!");
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await expect(page.getByText("Invalid email or password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).not.toHaveAttribute("aria-describedby");
    await expect(page.getByLabel("Password", { exact: true })).not.toHaveAttribute("aria-describedby");
    await expect(page).toHaveURL(/\/login\?/);

    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await expect(page).toHaveURL("/settings/imports/mylists");
    await expect(page.getByRole("heading", { name: "Upload CSV File" })).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL("/settings/imports/mylists");
    await expect(page.getByRole("heading", { name: "Upload CSV File" })).toBeVisible();

    await page.locator('nav button[aria-haspopup="menu"]').last().click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: "Login", exact: true })).toBeVisible();
    await page.goto("/settings/imports/mylists");
    await expect(page).toHaveURL(/\/login\?/);
});
