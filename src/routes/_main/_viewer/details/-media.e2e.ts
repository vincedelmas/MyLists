import {movies, users} from "../../../../../scripts/e2e/data";
import {expect, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("switches local panels with the keyboard without submitting the filter form", async ({ page }) => {
    await signIn(page);
    await page.goto(`/details/movies/${movies.editable.id}`);
    await page.getByRole("button", { name: "Add to List", exact: true }).click();

    const detailsTabs = page.getByRole("tablist", { name: "Media details", exact: true });
    const progress = detailsTabs.getByRole("tab", { name: "Progress", exact: true });
    const history = detailsTabs.getByRole("tab", { name: /^History/ });
    const custom = detailsTabs.getByRole("tab", { name: "Custom", exact: true });

    await progress.focus();
    await progress.press("ArrowRight");
    await expect(history).toBeFocused();
    await expect(progress).toHaveAttribute("aria-selected", "true");

    await history.press("Enter");
    const historyPanel = page.getByRole("tabpanel", { name: /^History/ });
    await expect(historyPanel).toBeVisible();
    await expect(history).toHaveAttribute("aria-controls", (await historyPanel.getAttribute("id"))!);
    await expect(page.getByRole("tabpanel")).toHaveCount(1);

    await history.press("End");
    await expect(custom).toBeFocused();
    await custom.press("Space");
    await expect(page.getByRole("tabpanel", { name: "Custom", exact: true })).toBeVisible();

    await custom.press("Home");
    await expect(progress).toBeFocused();
    await progress.press("Enter");
    await expect(page.getByRole("tabpanel", { name: "Progress", exact: true })).toBeVisible();
    await expect(page.getByRole("combobox").filter({ hasText: "Plan to Watch" })).toBeVisible();

    await page.goto(`/lists/tracking/movies/${users.owner.name}`);
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    const filtersDialog = page.getByRole("dialog", { name: "Additional Filters", exact: true });
    const filterTabs = filtersDialog.getByRole("tablist", { name: "Filter sections", exact: true });
    const filters = filterTabs.getByRole("tab", { name: "Filters", exact: true });
    const tags = filterTabs.getByRole("tab", { name: "Tags", exact: true });
    const listUrl = page.url();

    await filters.focus();
    await filters.press("ArrowRight");
    await expect(tags).toBeFocused();
    await expect(filters).toHaveAttribute("aria-selected", "true");
    await tags.press("Enter");
    await expect(filtersDialog.getByRole("tabpanel", { name: "Tags", exact: true })).toBeVisible();
    await expect(filtersDialog).toBeVisible();
    await expect(page).toHaveURL(listUrl);

    await tags.press("ArrowLeft");
    await filters.press("Space");
    await expect(filtersDialog.getByRole("tabpanel", { name: "Filters", exact: true })).toBeVisible();

    await page.goto("/walkthrough/profile");
    const profileTabs = page.getByRole("tablist", { name: "Profile preview", exact: true });
    const overview = profileTabs.getByRole("tab", { name: "Overview", exact: true });
    const firstMedia = profileTabs.getByRole("tab").nth(1);
    await overview.focus();
    await overview.press("ArrowRight");
    await expect(firstMedia).toBeFocused();
    await firstMedia.press("Enter");
    await expect(firstMedia).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", (await firstMedia.getAttribute("id"))!);
});


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


for (const view of ["grid", "list"]) {
    test(`keeps the ${view} editor usable after an edit changes filter membership`, async ({ page }) => {
        await signIn(page);
        const search = new URLSearchParams({ view, status: JSON.stringify(["Plan to Watch"]) });
        await page.goto(`/lists/tracking/movies/${users.owner.name}?${search}`);
        const edit = page.getByRole("button", { name: `Edit ${movies.private.name}`, exact: true });
        await edit.click();
        const editor = page.getByRole("dialog", { name: movies.private.name, exact: true });
        await editor.getByRole("combobox").filter({ hasText: "Plan to Watch" }).click();
        await page.getByRole("option", { name: "Completed", exact: true }).click();
        const rating = editor.getByText("Rating", { exact: true }).locator("..").getByRole("combobox");
        await rating.click();
        await page.getByRole("option", { name: "8.0", exact: true }).click();
        await expect(rating).toContainText("8.0");
        await expect(rating).toBeEnabled();
        await editor.getByRole("button", { name: "Close", exact: true }).click();
        await expect(editor).not.toBeVisible();
        await expect(edit).toHaveCount(0);

        await page.goto(`/details/movies/${movies.private.id}`);
        await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeVisible();
        await expect(page.getByText("Rating", { exact: true }).locator("..").getByRole("combobox")).toContainText("8.0");
    });
}


test("loads editor history alongside details and leaves an untouched list alone", async ({ page, baseURL }) => {
    await signIn(page);
    await page.goto(`/lists/tracking/movies/${users.owner.name}?view=grid`);
    const edit = page.getByRole("button", { name: `Edit ${movies.private.name}`, exact: true });
    await expect(edit).toBeVisible();
    const urls = await page.evaluate(async () => {
        const detailsPath = "/src/lib/server/functions/media-details.ts";
        const historyPath = "/src/lib/server/functions/user-media.ts";
        const listsPath = "/src/lib/server/functions/media-lists.ts";
        return {
            details: (await import(detailsPath)).getMediaDetails.url as string,
            history: (await import(historyPath)).getUserMediaHistory.url as string,
            list: (await import(listsPath)).getMediaListSF.url as string,
        };
    });
    const release = Promise.withResolvers<void>();
    const detailsUrl = new URL(urls.details, baseURL).href;
    const historyUrl = new URL(urls.history, baseURL).href;
    const listUrl = new URL(urls.list, baseURL).href;
    let historyRequests = 0;
    let listRequests = 0;
    page.on("request", request => {
        if (request.url().startsWith(historyUrl)) historyRequests++;
        if (request.url().startsWith(listUrl)) listRequests++;
    });
    await page.route(`${detailsUrl}**`, async route => {
        await release.promise;
        await route.continue();
    });
    try {
        await edit.click();
        await expect.poll(() => historyRequests).toBe(1);
        const dialog = page.getByRole("dialog", { name: movies.private.name, exact: true });
        await expect(dialog.getByRole("status", { name: "Loading media editor", exact: true })).toBeVisible();
        await expect.poll(async () => (await dialog.boundingBox())!.height).toBeGreaterThanOrEqual(320);
    }
    finally {
        release.resolve();
    }
    const editor = page.getByRole("dialog", { name: movies.private.name, exact: true });
    await expect(editor.getByRole("button", { name: "Remove from your list", exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(editor).not.toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(listRequests).toBe(0);
    expect(historyRequests).toBe(1);
});
