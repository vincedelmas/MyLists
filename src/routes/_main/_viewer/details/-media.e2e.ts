import {movies, users} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";


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


test("tracks a movie and lazily edits its status, rating and tags from the list", async ({ page, baseURL }) => {
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

    const editorUrl = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/user-media.ts";
        const { getUserMediaDetails } = await import(modulePath);
        return getUserMediaDetails.url as string;
    });
    let editorRequests = 0;
    let releaseEditor!: () => void;
    const editorGate = new Promise<void>(resolve => { releaseEditor = resolve; });
    await page.route(`${new URL(editorUrl, baseURL).href}**`, async route => {
        editorRequests++;
        await editorGate;
        if (editorRequests === 1) await route.fulfill({ status: 500, body: "Temporary tracking failure" });
        else await route.continue();
    });
    expect(editorRequests).toBe(0);

    await page.getByRole("button", { name: `Edit ${movies.editable.name}`, exact: true }).click();
    const editor = page.getByRole("dialog", { name: movies.editable.name, exact: true });
    await expect(editor.getByRole("status", { name: "Loading", exact: true })).toBeVisible();
    releaseEditor();
    await expect(editor.getByText("Could not load this title's details.", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(editor.getByRole("combobox").filter({ hasText: "Completed" })).toBeVisible();
    await expect(editor.getByRole("link", { name: "# Watch again", exact: true })).toBeVisible();
    const editorRating = editor.getByText("Rating", { exact: true }).locator("..").getByRole("combobox");
    await expect(editorRating).toContainText("8.0");
    expect(editorRequests).toBe(2);

    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(editor).not.toBeVisible();
    await page.getByRole("button", { name: `Edit ${movies.editable.name}`, exact: true }).click();
    await expect(editorRating).toContainText("8.0");
    expect(editorRequests).toBe(2);
    await editorRating.click();
    await page.getByRole("option", { name: "9.0", exact: true }).click();
    await expect(editorRating).toContainText("9.0");
    await expect(editorRating).toBeEnabled();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(editor).not.toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: `Edit ${movies.editable.name}`, exact: true }).click();
    await expect(editorRating).toContainText("9.0");
});


test("awaits tracking in the details loader and saves without refetching catalog details", async ({ page, baseURL }) => {
    await signIn(page);
    await page.goto(`/profile/${users.owner.name}`);
    const urls = await page.evaluate(async () => {
        const trackingModule = "/src/lib/server/functions/user-media.ts";
        const catalogModule = "/src/lib/server/functions/media-details.ts";
        const { getUserMediaDetails } = await import(trackingModule);
        const { getMediaDetails } = await import(catalogModule);
        return { tracking: getUserMediaDetails.url as string, catalog: getMediaDetails.url as string };
    });
    let releaseTracking!: () => void;
    const trackingGate = new Promise<void>(resolve => { releaseTracking = resolve; });
    let trackingRequests = 0;
    let catalogRequests = 0;
    await page.route(`${new URL(urls.tracking, baseURL).href}**`, async route => {
        trackingRequests++;
        await trackingGate;
        await route.continue();
    });
    await page.route(`${new URL(urls.catalog, baseURL).href}**`, async route => {
        catalogRequests++;
        await route.continue();
    });

    const navigation = page.goto(`/details/movies/${movies.editable.id}`);
    await expect.poll(() => trackingRequests).toBe(1);
    await expect.poll(() => catalogRequests).toBe(1);
    await expect(page.getByRole("heading", { name: movies.editable.name, exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add to List", exact: true })).toHaveCount(0);
    releaseTracking();
    await navigation;
    const add = page.getByRole("button", { name: "Add to List", exact: true });
    await expect(add).toBeVisible();
    await add.click();
    await expect(page.getByRole("button", { name: "Remove from your list", exact: true })).toBeVisible();
    await page.getByRole("combobox").filter({ hasText: "Plan to Watch" }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeEnabled();
    await page.getByRole("button", { name: "Remove from your list", exact: true }).click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(add).toBeVisible();
    expect(catalogRequests).toBe(1);
});


test("skips tracking requests for anonymous visitors and disabled lists", async ({ page, baseURL }) => {
    await page.goto("/login");
    const trackingUrl = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/user-media.ts";
        const { getUserMediaDetails } = await import(modulePath);
        return getUserMediaDetails.url as string;
    });
    let trackingRequests = 0;
    await page.route(`${new URL(trackingUrl, baseURL).href}**`, async route => {
        trackingRequests++;
        await route.continue();
    });
    await page.goto(`/details/movies/${movies.editable.id}`);
    await expect(page.getByText("Want to track your progress?", { exact: true })).toBeVisible();
    expect(trackingRequests).toBe(0);

    await signIn(page);
    await runBun(["src/routes/_main/_viewer/lists/collections/-mixed.fixtures.ts"]);
    await page.goto("/details/books/501");
    await expect(page.getByRole("heading", { name: "Books List Disabled", exact: true })).toBeVisible();
    expect(trackingRequests).toBe(0);
});
