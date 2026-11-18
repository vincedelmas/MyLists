import {movies} from "../../../../../scripts/e2e/data";
import {expect, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("tracks a movie and persists its status", async ({ page }) => {
    await signIn(page);
    await page.goto(`/details/movies/${movies.editable.id}`);
    await page.getByRole("button", { name: "Add to List", exact: true }).click();

    const activity = page.getByRole("heading", { name: "Your Activity" });
    await expect(activity).toBeVisible();
    await page.getByRole("combobox").filter({ hasText: "Planned" }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeEnabled();

    await page.reload();
    await expect(activity).toBeVisible();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeVisible();
});
