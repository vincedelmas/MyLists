import {expect, runBun, signIn, test} from "../../../../../../scripts/e2e/fixtures";


test("paginates Continue, preserves table preferences, and keeps the profile preview at five", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/continue/-pagination.fixtures.ts"]);
    await signIn(page);
    await page.goto("/lists/continue/e2eowner");
    const cards = page.locator('main article[data-slot="media-card"]');
    await expect(cards).toHaveCount(12);
    await expect(page.getByText("25 titles", { exact: true })).toBeVisible();
    await expect(cards.first()).toContainText("Page game 01");
    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(cards).toHaveCount(12);
    await expect(cards.first()).toContainText("Page game 13");
    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("Page game 25");
    await page.getByRole("combobox", { name: "Filter by media type" }).click();
    await page.getByRole("option", { name: /^games$/i }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(cards).toHaveCount(12);
    await expect(cards.first()).toContainText("Page game 01");
    await page.getByRole("button", { name: "Table view", exact: true }).click();
    await expect(page).toHaveURL(/display=table/);
    const table = page.getByRole("table", { name: "Continue titles" });
    await expect(table.getByRole("row")).toHaveCount(13);
    await expect(cards).toHaveCount(0);
    const updateButton = table.getByRole("button", { name: "+ 60 min · Page game 01", exact: true });
    await expect(updateButton).toHaveCSS("width", "120px");
    await expect(updateButton).toHaveCSS("justify-content", "flex-start");
    await expect(updateButton).not.toHaveAttribute("aria-describedby");
    await updateButton.click();
    await expect(table.getByRole("row").filter({ hasText: "Page game 01" })).toContainText("3h played");
    await page.reload();
    await expect(table).toBeVisible();
    await page.getByRole("button", { name: "Grid view", exact: true }).click();
    await expect(cards).toHaveCount(12);
    await expect(cards.first()).toContainText("3h played");

    await page.getByRole("button", { name: "Table view", exact: true }).click();
    await page.getByRole("combobox", { name: "Sort titles" }).click();
    await page.getByRole("option", { name: "Title Z-A", exact: true }).click();
    await page.getByRole("searchbox", { name: "Search in progress titles" }).fill("No matching title");
    await expect(page.getByText("No matching titles", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "View all in progress", exact: true }).click();
    await expect(page).toHaveURL(/display=table/);
    await expect(page).toHaveURL(/sorting=title_desc/);
    await expect(page.getByRole("searchbox", { name: "Search in progress titles" })).toHaveValue("");
    await expect(table.getByRole("row")).toHaveCount(13);
    await expect(table.getByRole("row").nth(1)).toContainText("Page game 25");

    await page.goto("/profile/e2eowner");
    await expect(page.getByRole("region", { name: "Continue", exact: true }).locator('article[data-slot="media-card"]')).toHaveCount(5);
});


for (const display of ["grid", "table"] as const) {
    test(`keeps quick updates in place on the second page in ${display} view`, async ({ page }) => {
        await runBun(["src/routes/_main/_viewer/lists/continue/-pagination.fixtures.ts"]);
        await signIn(page);
        await page.goto(`/lists/continue/e2eowner?page=2&display=${display}`);

        const entries = display === "grid"
            ? page.locator('main article[data-slot="media-card"]')
            : page.getByRole("table", { name: "Continue titles" }).locator("tbody tr");

        await expect(entries).toHaveCount(12);
        await expect(entries.first()).toContainText("Page game 13");
        await expect(entries.nth(3)).toContainText("Page game 16");

        for (const hours of [3, 4]) {
            await entries.nth(3).getByRole("button").click();
            await expect(entries.nth(3)).toContainText("Page game 16");
            await expect(entries.nth(3)).toContainText(`${hours}h played`);
            await expect(entries.first()).toContainText("Page game 13");
        }

        await page.getByRole("combobox", { name: "Sort titles" }).click();
        await page.getByRole("option", { name: "Title Z-A", exact: true }).click();
        await expect(entries.first()).toContainText("Page game 25");
        await page.getByRole("combobox", { name: "Sort titles" }).click();
        await page.getByRole("option", { name: "Recently Modified", exact: true }).click();
        await expect(entries.first()).toContainText("Page game 16");

        await page.goto(`/lists/continue/e2eowner?page=2&display=${display}`);
        await expect(entries.first()).toContainText("Page game 12");

        await page.goto("/profile/e2eowner");
        await page.goto(`/lists/continue/e2eowner?display=${display}`);
        await expect(entries.first()).toContainText("Page game 16");
        await expect(entries.first()).toContainText("4h played");
    });
}


test("paginates followers and follows instead of mounting every account", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/continue/-pagination.fixtures.ts"]);
    await signIn(page);
    await page.goto("/profile/e2eowner/follows");
    const people = page.locator('main a[href^="/profile/pageperson"]');
    await expect(people).toHaveCount(24);
    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(people).toHaveCount(1);
    await expect(people.first()).toHaveText("pageperson25");
    await page.goto("/profile/e2eowner/followers");
    // The default fixture also contains one accepted follower.
    await expect(people).toHaveCount(23);
    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(people).toHaveCount(2);
});
