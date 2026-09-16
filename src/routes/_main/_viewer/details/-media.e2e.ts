import {movies, users} from "../../../../../scripts/e2e/data";
import {expect, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("adds a movie and persists status and rating changes", async ({ page }) => {
    await signIn(page);

    await page.goto(`/details/movies/${movies.editable.id}`);
    await page.getByRole("button", { name: "Add to List", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remove from your list" })).toBeVisible();

    await page.getByRole("combobox").filter({ hasText: "Plan to Watch" }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeEnabled();

    const rating = page.getByText("Rating", { exact: true }).locator("..").getByRole("combobox");
    await rating.click();

    await page.getByRole("option", { name: "8.0", exact: true }).click();
    await expect(rating).toContainText("8.0");
    await expect(rating).toBeEnabled();

    await page.reload();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeVisible();
    await expect(rating).toContainText("8.0");

    await page.goto(`/list/movies/${users.owner.name}`);
    await expect(page.getByRole("link", { name: `View ${movies.editable.name}`, exact: true })).toBeVisible();
});
