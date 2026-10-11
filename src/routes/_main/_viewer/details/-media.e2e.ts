import {movies, users} from "../../../../../scripts/e2e/data";
import {expect, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("tracks a movie and persists its status, rating and tags", async ({ page }) => {
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

    const manageTags = page.getByRole("heading").filter({ has: page.getByText("Tags", { exact: true }) })
        .getByRole("button", { name: "Manage", exact: true });
    await manageTags.click();
    const tags = page.getByRole("dialog", { name: "Manage Tags", exact: true });
    const tagSearch = tags.getByRole("textbox", { name: "Find or create a tag...", exact: true });
    await tagSearch.fill("Watch again");
    await tagSearch.press("Enter");
    await expect(tags.getByRole("checkbox", { name: "# Watch again", exact: true })).toBeChecked();
    await tags.getByRole("button", { name: "Done", exact: true }).click();

    await page.reload();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeVisible();
    await expect(rating).toContainText("8.0");
    await manageTags.click();
    await expect(tags.getByRole("checkbox", { name: "# Watch again", exact: true })).toBeChecked();
    await tags.getByRole("button", { name: "Done", exact: true }).click();

    await page.goto(`/lists/tracking/movies/${users.owner.name}`);
    await expect(page.getByRole("link", { name: `View ${movies.editable.name}`, exact: true })).toBeVisible();
});
