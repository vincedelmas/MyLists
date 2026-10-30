import {movies, privateCollection, series, users} from "../../../../../scripts/e2e/data";
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
    await expect(tagSearch).toBeEnabled();
    let tagReads = 0;
    page.on("request", request => {
        if (request.method() === "GET" && new URL(request.url()).pathname.startsWith("/_serverFn/")) tagReads++;
    });
    await tagSearch.fill("Watch again");
    await tagSearch.press("Enter");
    await expect(tags.getByRole("checkbox", { name: "# Watch again", exact: true })).toBeChecked();
    await expect(tagSearch).toBeEnabled();
    expect(tagReads).toBe(0);
    await tags.getByRole("checkbox", { name: "# Watch again", exact: true }).click();
    await expect(tags.getByRole("checkbox", { name: "# Watch again", exact: true })).toHaveCount(0);
    await expect(tagSearch).toBeEnabled();
    expect(tagReads).toBe(0);
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


test("acknowledges auto-saves without flashing and holds slow loading feedback", async ({ page }) => {
    await signIn(page);
    await page.goto(`/details/movies/${movies.editable.id}`);
    await page.getByRole("button", { name: "Add to List", exact: true }).click();
    const status = page.getByRole("combobox").filter({ hasText: /Plan to Watch|Completed/ });
    await expect(status).toBeEnabled();
    await page.clock.install();
    await page.clock.pauseAt(new Date());

    let release!: () => void;
    let received!: () => void;
    let requestReceived = new Promise<void>(resolve => { received = resolve; });
    let responseGate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/_serverFn/**", async route => {
        if (route.request().method() !== "POST" || !route.request().postData()?.includes("payload")) {
            await route.continue();
            return;
        }
        const response = await route.fetch();
        received();
        await responseGate;
        await route.fulfill({ response });
    });

    const feedback = status.locator("..");
    const initialBounds = await status.evaluate(element => {
        const {x, width, height} = element.getBoundingClientRect();
        return {x, width, height};
    });
    await status.click();
    await page.clock.runFor(100);
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await requestReceived;
    await page.clock.runFor(10);
    await expect(status).toBeDisabled();
    await expect(status).toHaveCSS("opacity", "1");
    await expect(feedback.getByText("Saved", { exact: true })).toHaveCount(0);
    await expect(feedback.locator('[data-slot="spinner"]')).toHaveCount(0);
    const delivered = page.waitForResponse(response => response.request().method() === "POST" && response.url().includes("/_serverFn/"));
    release();
    await delivered;
    await page.clock.runFor(10);
    await expect(feedback.getByText("Saved", { exact: true })).toHaveCount(1);
    await expect(status).toBeEnabled();
    expect(await status.boundingBox()).toMatchObject(initialBounds);
    await expect(page.getByText("Rating", { exact: true }).locator("..").getByText("Saved", { exact: true })).toHaveCount(0);
    await page.clock.runFor(1500);
    await expect(feedback.getByText("Saved", { exact: true })).toHaveCount(0);

    requestReceived = new Promise<void>(resolve => { received = resolve; });
    responseGate = new Promise<void>(resolve => { release = resolve; });
    await status.click();
    await page.clock.runFor(100);
    await page.getByRole("option", { name: "Plan to Watch", exact: true }).click();
    await requestReceived;
    await page.clock.runFor(10);
    await page.clock.runFor(200);
    await expect(feedback.locator('[data-slot="spinner"]')).toHaveCount(1);
    const slowDelivered = page.waitForResponse(response => response.request().method() === "POST" && response.url().includes("/_serverFn/"));
    release();
    await slowDelivered;
    await page.clock.runFor(10);
    await expect(status).toContainText("Plan to Watch");
    await expect(status).toBeDisabled();
    await page.clock.runFor(100);
    await expect(feedback.locator('[data-slot="spinner"]')).toHaveCount(1);
    await page.clock.runFor(250);
    await expect(status).toBeEnabled();
    await expect(feedback.getByText("Saved", { exact: true })).toHaveCount(1);

    // A new edit clears the previous acknowledgment; a failed request must never show one.
    await page.unroute("**/_serverFn/**");
    await page.route("**/_serverFn/**", route => route.request().method() === "POST"
        && route.request().postData()?.includes("payload") ? route.abort() : route.continue());
    await status.click();
    await page.clock.runFor(100);
    const failed = page.waitForEvent("requestfailed");
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await failed;
    await page.clock.runFor(10);
    await expect(status).toBeEnabled();
    await expect(status).toContainText("Plan to Watch");
    await expect(feedback.getByText("Saved", { exact: true })).toHaveCount(0);
});


test("updates season ratings and rewatches inside the open dialog without refetching", async ({ page, baseURL }) => {
    await signIn(page);
    await page.goto(`/details/series/${series.id}`);
    await page.getByRole("button", { name: "Add to List", exact: true }).click();
    await page.getByRole("combobox").filter({ hasText: "Plan to Watch" }).click();
    await page.getByRole("option", { name: "Watching", exact: true }).click();
    const ratingRow = page.getByText("Rating", { exact: true }).locator("..");
    await expect(ratingRow.getByRole("combobox")).toBeEnabled();
    const urls = await page.evaluate(async () => {
        const seasonsPath = "/src/lib/server/functions/tv-seasons.ts";
        const mediaPath = "/src/lib/server/functions/user-media.ts";
        return {
            seasons: (await import(seasonsPath)).getTvSeasons.url as string,
            history: (await import(mediaPath)).getUserMediaHistory.url as string,
        };
    });
    // Saves have already seeded the season snapshot; neither dialog needs a GET.
    await page.route(`${new URL(urls.seasons, baseURL).href}**`, route => route.abort());
    let reads = 0;
    const countReads = (request: { url: () => string }) => {
        if ([urls.seasons, urls.history].some(url => request.url().startsWith(new URL(url, baseURL).href))) reads++;
    };
    page.on("request", countReads);
    await ratingRow.getByRole("button").click();
    const ratings = page.getByRole("dialog", { name: "Season ratings", exact: true });
    const rating = ratings.getByRole("combobox", { name: "Season 1", exact: true });
    await expect(rating).toBeEnabled();
    for (const value of ["2.5", "8.5"]) {
        await rating.click();
        await page.getByRole("option", { name: value, exact: true }).click();
        await expect(rating).toContainText(value);
        await expect(rating).toBeEnabled();
    }
    expect(reads).toBe(0);
    await ratings.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: /0 Seasons/ }).click();
    const rewatches = page.getByRole("dialog", { name: "Re-watched seasons", exact: true });
    const season = rewatches.getByText("Season 1", { exact: true }).locator("../..");
    const increase = season.getByRole("button").last();
    await expect(increase).toBeEnabled();
    expect(reads).toBe(0);
    for (const count of [1, 2]) {
        await increase.click();
        await expect(season.getByText(`${count}x`, { exact: true })).toBeVisible();
        await expect(increase).toBeEnabled();
    }
    expect(reads).toBe(0);
    await rewatches.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page.getByRole("button", { name: /2 Seasons/ })).toBeVisible();
});


test("keeps delayed tag-save feedback visible after removing the last tag", async ({ page, baseURL }) => {
    await signIn(page);
    await page.goto(`/details/movies/${movies.editable.id}`);
    await page.getByRole("button", { name: "Add to List", exact: true }).click();
    await page.getByRole("heading").filter({ has: page.getByText("Tags", { exact: true }) })
        .getByRole("button", { name: "Manage", exact: true }).click();
    const tags = page.getByRole("dialog", { name: "Manage Tags", exact: true });
    const search = tags.getByRole("textbox", { name: "Find or create a tag...", exact: true });
    await search.fill("Temporary");
    await search.press("Enter");
    const checkbox = tags.getByRole("checkbox", { name: "# Temporary", exact: true });
    await expect(checkbox).toBeChecked();
    await expect(search).toBeEnabled();

    const path = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/user-media.ts";
        return (await import(modulePath)).postEditUserTag.url as string;
    });
    const gate = Promise.withResolvers<void>();
    const received = Promise.withResolvers<void>();
    await page.route(`${new URL(path, baseURL).href}**`, async route => {
        const response = await route.fetch();
        received.resolve();
        await gate.promise;
        await route.fulfill({ response });
    });
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    try {
        await checkbox.click();
        await received.promise;
        await page.clock.runFor(10);
        await expect(checkbox).toBeDisabled();
        await expect(checkbox).toHaveCSS("opacity", "1");
        await expect(tags.locator('[data-slot="spinner"]')).toHaveCount(0);
        await page.clock.runFor(200);
        await expect(tags.locator('[data-slot="spinner"]')).toHaveCount(1);

        const delivered = page.waitForResponse(response => response.url().startsWith(new URL(path, baseURL).href));
        gate.resolve();
        await delivered;
        await page.clock.runFor(10);
        await expect(checkbox).toHaveCount(0);
        await expect(tags.locator('[data-slot="spinner"]')).toHaveCount(1);
        await expect(search).toBeDisabled();
        await page.clock.runFor(350);
        await expect(search).toBeEnabled();
        await expect(tags.getByText("Saved", { exact: true })).toHaveCount(1);
        await page.clock.runFor(1500);
        await expect(tags.getByText("Saved", { exact: true })).toHaveCount(0);
    }
    finally { gate.resolve(); }
});


test("shows pending feedback and blocks duplicate adds and removals on slow responses", async ({ page, baseURL }) => {
    await signIn(page);
    await page.goto(`/details/movies/${movies.editable.id}`);
    const urls = await page.evaluate(async () => {
        const path = "/src/lib/server/functions/user-media.ts";
        const module = await import(path);
        return [module.postAddMediaToList.url, module.postRemoveMediaFromList.url] as string[];
    });
    let gate = Promise.withResolvers<void>();
    for (const path of urls) {
        await page.route(`${new URL(path, baseURL).href}**`, async route => {
            const response = await route.fetch();
            await gate.promise;
            await route.fulfill({ response });
        });
    }
    try {
        const add = page.getByRole("button", { name: "Add to List", exact: true });
        await add.click();
        await expect(add).toBeDisabled();
        await expect(add).toHaveAttribute("aria-busy", "true");
        await expect(add.locator('[data-slot="spinner"]')).toBeVisible();
        gate.resolve();
        const remove = page.getByRole("button", { name: "Remove from your list", exact: true });
        await expect(remove).toBeVisible();

        gate = Promise.withResolvers<void>();
        await remove.click();
        await page.getByRole("alertdialog").getByRole("button", { name: "Remove", exact: true }).click();
        await expect(remove).toBeDisabled();
        await expect(remove).toHaveAttribute("aria-busy", "true");
        await expect(remove.locator('[data-slot="spinner"]')).toBeVisible();
        gate.resolve();
        await expect(add).toBeEnabled();
    }
    finally { gate.resolve(); }
});


test("shows Quick Add feedback while its selected status is saving", async ({ page, baseURL }) => {
    await signIn(page);
    await page.goto(`/lists/collections/${privateCollection.id}`);
    const trigger = page.getByRole("button", { name: "Add media to list", exact: true });
    await trigger.click();
    const path = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/user-media.ts";
        return (await import(modulePath)).postAddMediaToList.url as string;
    });
    const gate = Promise.withResolvers<void>();
    await page.route(`${new URL(path, baseURL).href}**`, async route => {
        const response = await route.fetch();
        await gate.promise;
        await route.fulfill({ response });
    });
    try {
        const selected = page.getByRole("button", { name: "Completed", exact: true });
        await selected.click();
        await expect(trigger).toBeDisabled();
        await expect(trigger.locator('[data-slot="spinner"]')).toBeVisible();
        await expect(selected).toBeDisabled();
        await expect(selected.locator('[data-slot="spinner"]')).toBeVisible();
        await expect(page.getByRole("button", { name: "Plan to Watch", exact: true })).toBeDisabled();
        gate.resolve();
        await expect(trigger).toHaveCount(0);
    }
    finally { gate.resolve(); }
});


test("shows feedback while changing collection membership", async ({ page, baseURL }) => {
    await signIn(page);
    await page.goto(`/details/movies/${movies.imported.id}`);
    await page.getByRole("heading", { name: /Your Collections/ }).getByRole("button", { name: "Manage", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Manage Collections", exact: true });
    const checkbox = dialog.getByRole("checkbox", { name: new RegExp(privateCollection.title) });
    await expect(checkbox).not.toBeChecked();
    const paths = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/collections.ts";
        const module = await import(modulePath);
        return [module.postAddMediaToCollection.url, module.postRemoveMediaFromCollection.url] as string[];
    });
    let gate = Promise.withResolvers<void>();
    for (const path of paths) {
        await page.route(`${new URL(path, baseURL).href}**`, async route => {
            const response = await route.fetch();
            await gate.promise;
            await route.fulfill({ response });
        });
    }
    try {
        for (const checked of [true, false]) {
            gate = Promise.withResolvers<void>();
            await checkbox.click();
            await expect(checkbox).toBeDisabled();
            await expect(dialog.locator('[data-slot="spinner"]')).toBeVisible();
            gate.resolve();
            await expect(checkbox).toBeChecked({ checked });
            await expect(checkbox).toBeEnabled();
            await expect(dialog.getByText("Saved", { exact: true })).toBeVisible();
        }
    }
    finally { gate.resolve(); }
});


test("keeps disabled playtime and select backgrounds consistent in both themes", async ({page, baseURL}) => {
    await runBun(["--eval", `
        if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use isolated fixtures.");
        const {db} = await import("./src/lib/server/database/db");
        const {and, eq} = await import("drizzle-orm");
        const {games, userMediaSettings} = await import("./src/lib/server/database/schema");
        db.insert(games).values({id: 301, apiId: 301, name: "Pending game", imageCover: "game.jpg", hltbLastCheckedAt: new Date().toISOString(), hltbMainTime: 100, hltbMainAndExtraTime: 200, hltbTotalCompleteTime: 300}).run();
        db.update(userMediaSettings).set({active: true}).where(and(eq(userMediaSettings.userId, 1), eq(userMediaSettings.mediaType, "games"))).run();
    `]);
    await signIn(page);
    await page.goto("/details/games/301");
    await page.getByRole("button", {name: "Add to List", exact: true}).click();
    await page.getByRole("combobox").filter({hasText: "Plan to Play"}).click();
    await page.getByRole("option", {name: "Endless", exact: true}).click();
    const playtime = page.getByRole("spinbutton", {name: "Playtime (hours)", exact: true});
    await expect(playtime).toBeEnabled();
    const path = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/user-media.ts";
        return (await import(modulePath)).postUpdateUserMedia.url as string;
    });
    const gate = Promise.withResolvers<void>();
    await page.route(`${new URL(path, baseURL).href}**`, async route => {
        const response = await route.fetch();
        await gate.promise;
        await route.fulfill({response});
    });
    try {
        await playtime.fill("250");
        await playtime.press("Tab");
        const status = page.getByRole("combobox").filter({hasText: "Endless"});
        await expect(playtime).toBeDisabled();
        await expect(status).toBeDisabled();
        await expect(playtime.locator("..").locator('[data-slot="spinner"]')).toBeVisible();
        for (const dark of [false, true]) {
            await page.evaluate(dark => document.documentElement.classList.toggle("dark", dark), dark);
            await expect.poll(async () => {
                const [inputColor, selectColor] = await Promise.all([
                    playtime.evaluate(element => getComputedStyle(element).backgroundColor),
                    status.evaluate(element => getComputedStyle(element).backgroundColor),
                ]);
                return inputColor === selectColor;
            }).toBe(true);
        }
        gate.resolve();
        await expect(playtime).toBeEnabled();
        await expect(playtime).toHaveValue("250");
    }
    finally { gate.resolve(); }
});
