import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";
import {movies, users} from "../../../../../scripts/e2e/data";
import {browseFilterGenres} from "../../_viewer/collections/-browse.data";


test("creates, automatically counts, edits and deletes a private smart list", async ({ page, baseURL }) => {
    await runBun(["src/routes/_main/_private/smart-views/-fixtures.ts"]);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/smart-views");
    await expect(page.getByRole("heading", { name: "Smart lists", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Create list", exact: true }).click();
    const editor = page.getByRole("form", { name: "Smart list editor", exact: true });
    await expect(page).toHaveURL(/\/smart-views\/create$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(editor.getByRole("button", { name: "Create list", exact: true })).toBeVisible();
    await editor.getByLabel("List name", { exact: true }).fill("My weekend plans");
    const summary = editor.getByRole("complementary", { name: "Preview smart list", exact: true });
    await expect(summary.getByText("3 media", { exact: true })).toBeVisible();
    await editor.getByLabel("Added more than … months ago").fill("6");
    await expect(summary.getByText("2 media", { exact: true })).toBeVisible();
    await expect(summary.getByText("Added over 6 months ago", { exact: true })).toBeVisible();
    await expect(editor.getByRole("button", { name: "Preview matches", exact: true })).toHaveCount(0);
    await expect(summary.locator("img")).toHaveCount(0);
    await expect(summary.getByRole("list")).toHaveCount(0);
    await editor.getByLabel("Title contains", { exact: true }).fill("Does not match any title");
    await expect(summary.getByText("0 media", { exact: true })).toBeVisible();
    await editor.getByLabel("Title contains", { exact: true }).fill("");
    await expect(summary.getByText("2 media", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Create list", exact: true }).click();
    await expect(page.getByRole("heading", { name: "My weekend plans", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const viewUrl = page.url();
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(page.getByText("A long-awaited book", { exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toHaveCount(0);

    await page.getByRole("link", { name: "Edit smart list", exact: true }).click();
    await editor.getByLabel("List name", { exact: true }).fill("Old movie plans");
    await editor.getByRole("button", { name: "Movies", exact: true }).click();
    await editor.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Old movie plans", exact: true })).toBeVisible();
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(page.getByText("A long-awaited book", { exact: true })).toHaveCount(0);

    const strangerPage = await page.context().browser()!.newPage({ baseURL });
    try {
        await signIn(strangerPage, "stranger");
        await strangerPage.goto(viewUrl);
        await expect(strangerPage.getByText("Smart list not found.", { exact: true })).toBeVisible();
        await expect(strangerPage.getByText("Old movie plans", { exact: true })).toHaveCount(0);
        await expect(strangerPage.getByText(movies.private.name, { exact: true })).toHaveCount(0);
    }
    finally {
        await strangerPage.context().close();
    }

    await page.getByRole("button", { name: "Delete smart list", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete list", exact: true }).click();
    await expect(page).toHaveURL(/\/smart-views$/);
    await expect(page.getByText("Old movie plans", { exact: true })).toHaveCount(0);
});


test("combines the expanded filters in a live view", async ({ page }) => {
    await runBun(["src/routes/_main/_private/smart-views/-fixtures.ts"]);
    await signIn(page);
    await page.goto("/smart-views");
    await page.getByRole("link", { name: "Create list", exact: true }).click();
    const editor = page.getByRole("form", { name: "Smart list editor", exact: true });
    await editor.getByLabel("List name", { exact: true }).fill("Fresh unrated movie plans");
    await editor.getByLabel("Title contains", { exact: true }).fill("Browser");
    await editor.locator("summary", { hasText: "Choose specific statuses" }).click();
    await editor.getByRole("checkbox", { name: "Plan to Watch", exact: true }).check();
    await editor.getByLabel("First release year", { exact: true }).fill("2020");
    await editor.getByLabel("Last release year", { exact: true }).fill("2020");
    await editor.getByLabel("Added within … months", { exact: true }).fill("6");
    await editor.getByRole("combobox", { name: "Rating state", exact: true }).click();
    await page.getByRole("option", { name: "Unrated only", exact: true }).click();
    await editor.getByRole("combobox", { name: "Comments", exact: true }).click();
    await page.getByRole("option", { name: "Without a comment", exact: true }).click();
    await expect(editor.getByRole("complementary", { name: "Preview smart list", exact: true }).getByText("1 media", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Create list", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Fresh unrated movie plans", exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toBeVisible();
    await expect(page.getByText(movies.private.name, { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Edit smart list", exact: true }).click();
    await expect(editor.getByLabel("Title contains", { exact: true })).toHaveValue("Browser");
    await expect(editor.getByRole("checkbox", { name: "Plan to Watch", exact: true })).toBeChecked();
    await expect(editor.getByLabel("Added within … months", { exact: true })).toHaveValue("6");
});


test("finds genres and tags despite typos and saves their canonical names", async ({ page }) => {
    await runBun(["src/routes/_main/_private/smart-views/-fixtures.ts", "seed-search"]);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/smart-views/create");
    const editor = page.getByRole("form", { name: "Smart list editor", exact: true });
    await editor.getByLabel("List name", { exact: true }).fill("Weekend science fiction");
    await editor.getByRole("button", { name: "Movies", exact: true }).click();
    await editor.getByRole("searchbox", { name: "Genres", exact: true }).fill("Scince Fiction");
    await editor.getByRole("button", { name: "Science Fiction", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Remove Science Fiction filter", exact: true })).toBeVisible();
    await expect(editor.getByRole("searchbox", { name: "Genres", exact: true })).toHaveValue("");
    await editor.getByRole("searchbox", { name: "Tags", exact: true }).fill("Weekned");
    await editor.getByRole("button", { name: "Weekend", exact: true }).click();
    await editor.getByRole("searchbox", { name: "Exclude tags", exact: true }).fill("Aovid");
    await editor.getByRole("button", { name: "Avoid", exact: true }).click();
    await expect(editor.getByRole("complementary", { name: "Preview smart list", exact: true }).getByText("1 media", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await editor.getByRole("button", { name: "Create list", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Weekend science fiction", exact: true })).toBeVisible();
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Edit smart list", exact: true }).click();
    await page.reload();
    for (const canonicalName of ["Science Fiction", "Weekend", "Avoid"]) {
        await expect(editor.getByRole("button", { name: `Remove ${canonicalName} filter`, exact: true })).toBeVisible();
    }
    await expect(editor.getByRole("searchbox", { name: "Genres", exact: true })).toHaveValue("");
    await expect(editor.getByRole("searchbox", { name: "Tags", exact: true })).toHaveValue("");
    await expect(editor.getByRole("searchbox", { name: "Exclude tags", exact: true })).toHaveValue("");
});


test("opens cards while keeping edit, pin and delete actions independent", async ({ page }) => {
    await runBun(["src/routes/_main/_private/smart-views/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.goto("/smart-views");
    const card = page.getByRole("article", { name: "Profile list 1", exact: true });
    await expect(card.getByText("2 media", { exact: true })).toBeVisible();
    await expect(card.getByRole("link", { name: "Open Profile list 1", exact: true })).toHaveCount(0);
    await card.getByRole("button", { name: "Pin to profile", exact: true }).click();
    await expect(page).toHaveURL(/\/smart-views$/);
    await expect(card.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(card.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveText("");

    await card.getByRole("link", { name: "Edit Profile list 1", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/smart-views/501/edit");
    const editor = page.getByRole("form", { name: "Smart list editor", exact: true });
    await editor.getByLabel("List name", { exact: true }).fill("An unsaved name");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Profile list 1", exact: true })).toBeVisible();
    await page.goto("/smart-views");
    await card.click({ position: { x: 12, y: 12 } });
    await expect(page).toHaveURL(url => url.pathname === "/smart-views/501");
    await expect(page.getByRole("heading", { name: "Profile list 1", exact: true })).toBeVisible();

    await page.goto(`/profile/${users.owner.name}`);
    const shortcuts = page.getByRole("region", { name: "Smart lists", exact: true });
    await expect(shortcuts.getByRole("link", { name: "Profile list 1", exact: true })).toBeVisible();
    await page.goto("/smart-views");
    await card.getByRole("button", { name: "Delete Profile list 1", exact: true }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByRole("heading", { name: "Delete this smart list?", exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/smart-views$/);
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(card.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveAttribute("aria-pressed", "true");
    await card.getByRole("button", { name: "Delete Profile list 1", exact: true }).click();
    await confirmation.getByRole("button", { name: "Delete list", exact: true }).click();
    await expect(card).toHaveCount(0);
    await expect(page).toHaveURL(/\/smart-views$/);
    await expect(page.getByRole("article", { name: "Profile list 2", exact: true })).toBeVisible();
    await page.goto(`/profile/${users.owner.name}`);
    await expect(shortcuts).toHaveCount(0);
    await page.goto(`/list/movies/${users.owner.name}?view=list`);
    await expect(page.getByRole("link", { name: movies.private.name, exact: true })).toBeVisible();
});


test("pins four lists from their cards, appends new pins, and hides the profile section when cleared", async ({ page }) => {
    await runBun(["src/routes/_main/_private/smart-views/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.goto(`/profile/${users.owner.name}`);
    await expect(page.getByText("No Media Highlighted Yet.", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Smart lists", exact: true })).toHaveCount(0);
    await page.goto("/smart-views");
    for (const index of [2, 1, 3, 4]) {
        const card = page.getByRole("article", { name: `Profile list ${index}`, exact: true });
        await card.getByRole("button", { name: "Pin to profile", exact: true }).click();
        await expect(card.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveAttribute("aria-pressed", "true");
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Move / })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Profile position", exact: true })).toHaveCount(0);
    await expect(page.getByRole("article", { name: "Profile list 5", exact: true }).getByRole("button", { name: "Pin to profile", exact: true })).toBeDisabled();
    await page.goto(`/profile/${users.owner.name}`);
    const shortcuts = page.getByRole("region", { name: "Smart lists", exact: true });
    await expect(shortcuts).toBeVisible();
    await expect(shortcuts.getByRole("link").filter({ hasText: /^Profile list/ })).toHaveText(["Profile list 2", "Profile list 1", "Profile list 3", "Profile list 4"]);
    const firstShortcut = shortcuts.getByRole("article").first();
    await expect(firstShortcut).toContainText("2 media");
    await expect(firstShortcut.locator("img")).toHaveCount(2);
    await page.setViewportSize({ width: 390, height: 844 });
    const moreRules = firstShortcut.getByRole("button", { name: /^Show \d+ more list rules?$/ });
    await expect(moreRules).toBeVisible();
    await expect(moreRules).toHaveText(/^\+\d+$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await moreRules.click();
    await expect(page.getByText("More list rules", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Added First", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await shortcuts.getByRole("link", { name: "Profile list 2", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/smart-views/502");
    await expect(page.getByRole("heading", { name: "Profile list 2", exact: true })).toBeVisible();
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit smart list", exact: true })).toBeVisible();
    await page.goto("/smart-views/505");
    await expect(page.getByRole("button", { name: "Pin to profile", exact: true })).toBeDisabled();

    await page.goto("/smart-views");
    const firstCard = page.getByRole("article", { name: "Profile list 1", exact: true });
    await firstCard.getByRole("button", { name: "Unpin from profile", exact: true }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByRole("heading", { name: "Unpin this list?", exact: true })).toBeVisible();
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(firstCard.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveAttribute("aria-pressed", "true");
    await firstCard.getByRole("button", { name: "Unpin from profile", exact: true }).click();
    await confirmation.getByRole("button", { name: "Unpin list", exact: true }).click();
    await expect(firstCard.getByRole("button", { name: "Pin to profile", exact: true })).toHaveAttribute("aria-pressed", "false");
    const fifthCard = page.getByRole("article", { name: "Profile list 5", exact: true });
    await fifthCard.getByRole("button", { name: "Pin to profile", exact: true }).click();
    await expect(fifthCard.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.goto(`/profile/${users.owner.name}`);
    await expect(shortcuts.getByRole("link").filter({ hasText: /^Profile list/ })).toHaveText(["Profile list 2", "Profile list 3", "Profile list 4", "Profile list 5"]);

    await page.goto("/smart-views");
    for (const index of [2, 3, 4, 5]) {
        const card = page.getByRole("article", { name: `Profile list ${index}`, exact: true });
        await card.getByRole("button", { name: "Unpin from profile", exact: true }).click();
        await confirmation.getByRole("button", { name: "Unpin list", exact: true }).click();
        await expect(card.getByRole("button", { name: "Pin to profile", exact: true })).toHaveAttribute("aria-pressed", "false");
    }
    await page.goto(`/profile/${users.owner.name}`);
    await expect(page.getByText("No Media Highlighted Yet.", { exact: true })).toBeVisible();
    await expect(shortcuts).toHaveCount(0);
    await page.goto("/smart-views/501");
    await expect(page.getByRole("heading", { name: "Profile list 1", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pin to profile", exact: true })).toHaveAttribute("aria-pressed", "false");
});


test("profile view access follows public, restricted and private profile rules", async ({ page, browser, baseURL }) => {
    await runBun(["src/routes/_main/_private/smart-views/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.goto("/smart-views");
    const card = page.getByRole("article", { name: "Profile list 1", exact: true });
    await card.getByRole("button", { name: "Pin to profile", exact: true }).click();
    await expect(card.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveAttribute("aria-pressed", "true");

    for (const account of [null, "stranger", "follower"] as const) {
        const visitor = await browser.newPage({ baseURL });
        try {
            if (account) await signIn(visitor, account);
            const privateResponse = await visitor.goto("/smart-views/501");
            if (account === "follower") {
                await expect(visitor.getByRole("heading", { name: "Profile list 1", exact: true })).toBeVisible();
                await expect(visitor.getByText(movies.private.name, { exact: true })).toBeVisible();
                await expect(visitor.getByRole("link", { name: "Edit smart list", exact: true })).toHaveCount(0);
                await expect(visitor.getByRole("button", { name: /^Edit / })).toHaveCount(0);
                await expect(visitor.getByRole("button", { name: "Add media to list", exact: true })).toHaveCount(0);
                await expect(visitor.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveCount(0);
                const editResponse = await visitor.goto("/smart-views/501/edit");
                await expect(visitor.getByText("Smart list not found.", { exact: true })).toBeVisible();
                await expect(visitor.getByRole("form", { name: "Smart list editor", exact: true })).toHaveCount(0);
                expect(await editResponse!.text()).not.toContain("Profile list 1");
            }
            else {
                await expect(visitor.getByText("This content is private", { exact: true })).toBeVisible();
                expect(await privateResponse!.text()).not.toContain("Profile list 1");
                expect(await privateResponse!.text()).not.toContain(movies.private.name);
            }
            await visitor.goto("/smart-views/512");
            if (account) {
                await expect(visitor.getByRole("heading", { name: "Restricted smart list", exact: true })).toBeVisible();
                await expect(visitor.getByText(movies.private.name, { exact: true })).toBeVisible();
            }
            else await expect(visitor.getByText("This content is restricted", { exact: true })).toBeVisible();
            await visitor.goto("/smart-views/511");
            await expect(visitor.getByRole("heading", { name: "Public smart list", exact: true })).toBeVisible();
            await expect(visitor.getByText(movies.private.name, { exact: true })).toHaveCount(0);
            if (account !== "stranger") await expect(visitor.getByRole("link", { name: "Edit smart list", exact: true })).toHaveCount(0);
            const unpinnedResponse = await visitor.goto("/smart-views/505");
            await expect(visitor.getByText("Smart list not found.", { exact: true })).toBeVisible();
            expect(await unpinnedResponse!.text()).not.toContain("Profile list 5");
        }
        finally {
            await visitor.context().close();
        }
    }
});


test("pins from the detail page, confirms unpinning, and switches runtime display", async ({ page }) => {
    await runBun(["src/routes/_main/_private/smart-views/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.goto("/smart-views/501");
    await page.getByRole("button", { name: "Pin to profile", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.goto("/smart-views/502");
    await page.getByRole("button", { name: "Pin to profile", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.goto(`/profile/${users.owner.name}`);
    const shortcuts = page.getByRole("region", { name: "Smart lists", exact: true });
    await expect(shortcuts.getByRole("link").filter({ hasText: /^Profile list/ })).toHaveText(["Profile list 1", "Profile list 2"]);
    await shortcuts.getByRole("link", { name: "Profile list 2", exact: true }).click();

    const table = page.getByRole("button", { name: "Table view", exact: true });
    await table.click();
    await expect(page).toHaveURL(url => url.searchParams.get("view") === "table");
    await expect(table).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await page.reload();
    await expect(table).toHaveAttribute("aria-pressed", "true");
    const browseUrl = page.url();
    await page.getByRole("link", { name: "Edit smart list", exact: true }).click();
    const editor = page.getByRole("form", { name: "Smart list editor", exact: true });
    await expect(editor.getByRole("button", { name: "Grid", exact: true })).toHaveAttribute("aria-pressed", "true");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(browseUrl);
    await page.getByRole("button", { name: "Grid view", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("view") === "grid");
    await expect(page.getByRole("table")).toHaveCount(0);

    await page.getByRole("button", { name: "Unpin from profile", exact: true }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByRole("heading", { name: "Unpin this list?", exact: true })).toBeVisible();
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unpin from profile", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Unpin from profile", exact: true }).click();
    await confirmation.getByRole("button", { name: "Unpin list", exact: true }).click();
    await expect(confirmation).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pin to profile", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("heading", { name: "Profile list 2", exact: true })).toBeVisible();
    await page.goto(`/profile/${users.owner.name}`);
    await expect(shortcuts.getByRole("link").filter({ hasText: /^Profile list/ })).toHaveText(["Profile list 1"]);
});


test("browses within saved rules and resets temporary filters without editing the view", async ({ page }) => {
    await runBun(["src/routes/_main/_private/smart-views/-fixtures.ts", "seed-shortcuts", "seed-filters"]);
    await signIn(page);
    await page.goto("/smart-views/501");
    await page.setViewportSize({ width: 390, height: 844 });
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    const search = controls.getByRole("searchbox", { name: "Search this smart list", exact: true });
    await controls.getByRole("combobox", { name: "Filter by media type", exact: true }).click();
    await expect(page.getByRole("option")).toHaveText(["All types", "movies", "books"]);
    await page.keyboard.press("Escape");
    await search.fill("long-awaited");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByText("A long-awaited book", { exact: true })).toBeVisible();
    await controls.getByRole("combobox", { name: "Filter by media type", exact: true }).click();
    await expect(page.getByRole("option")).toHaveText(["All types", "movies", "books"]);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Reset filters", exact: true }).click();
    await expect(search).toHaveValue("");
    await expect(page.getByRole("article")).toHaveCount(2);
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    const filters = page.getByRole("dialog", { name: "Additional filters", exact: true });
    const genres = filters.getByRole("group", { name: "Genres", exact: true });
    const lastGenre = genres.getByRole("checkbox", { name: browseFilterGenres.at(-1)!, exact: true });
    await expect(genres.getByRole("checkbox")).toHaveCount(14);
    await expect(lastGenre).toHaveCount(0);
    await genres.getByRole("button", { name: "More", exact: true }).click();
    await lastGenre.check();
    await genres.getByRole("button", { name: "Less", exact: true }).click();
    await expect(lastGenre).toHaveCount(0);
    await genres.getByRole("button", { name: "More", exact: true }).click();
    await expect(lastGenre).toBeChecked();
    await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    await genres.getByRole("button", { name: "More", exact: true }).click();
    await expect(lastGenre).toBeChecked();
    for (const genre of browseFilterGenres.slice(0, 19)) {
        await genres.getByRole("checkbox", { name: genre, exact: true }).check();
    }
    const nextGenre = genres.getByRole("checkbox", { name: browseFilterGenres[19], exact: true });
    await expect(nextGenre).toBeDisabled();
    await expect(lastGenre).toBeEnabled();
    await genres.getByRole("checkbox", { name: browseFilterGenres[0], exact: true }).uncheck();
    await expect(nextGenre).toBeEnabled();
    await filters.getByRole("button", { name: "Clear advanced filters", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await expect(page).toHaveURL(url => !url.searchParams.has("genres"));
    await controls.getByRole("combobox", { name: "Filter by status", exact: true }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByText("Nothing matches just yet", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reset filters", exact: true }).click();
    await controls.getByRole("combobox", { name: "Filter by media type", exact: true }).click();
    await page.getByRole("option", { name: "movies", exact: true }).click();
    await controls.getByRole("button", { name: "Table view", exact: true }).click();
    const table = page.getByRole("table", { name: "Media results", exact: true });
    await expect(table.getByRole("link")).toHaveText([movies.private.name]);
    await expect(table.locator("img")).toHaveCount(0);
    await controls.getByRole("combobox", { name: "Sort media", exact: true }).click();
    await page.getByRole("option", { name: "Title Z-A", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const browseUrl = page.url();
    await page.getByRole("link", { name: "Edit smart list", exact: true }).click();
    const editor = page.getByRole("form", { name: "Smart list editor", exact: true });
    await expect(editor.getByRole("combobox", { name: "Status", exact: true })).toContainText("Plan to watch, play or read");
    await expect(editor.getByRole("combobox", { name: "Sort by", exact: true })).toContainText("Date Added");
    await expect(editor.getByRole("button", { name: "Grid", exact: true })).toHaveAttribute("aria-pressed", "true");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(browseUrl);
    await page.getByRole("button", { name: "Reset filters", exact: true }).click();
    await expect(table.getByRole("link")).toHaveCount(2);
    await expect(controls.getByRole("combobox", { name: "Sort media", exact: true })).toContainText("Saved order");
});


test("shares list cards and tables, and refreshes smart list membership after owner edits", async ({ page }) => {
    await runBun(["src/routes/_main/_private/smart-views/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.setViewportSize({ width: 1536, height: 1000 });
    await page.goto("/smart-views/501");
    const movieCard = page.getByRole("article").filter({ has: page.getByRole("link", { name: `View ${movies.private.name}`, exact: true }) });
    const bookCard = page.getByRole("article").filter({ has: page.getByRole("link", { name: "View A long-awaited book", exact: true }) });
    await expect(movieCard.locator('[data-slot="badge"]').filter({ hasText: "Plan to Watch" }).getByTitle("Movies", { exact: true })).toBeVisible();
    await expect(bookCard.locator('[data-slot="badge"]').filter({ hasText: "Plan to Read" }).getByTitle("Books", { exact: true })).toBeVisible();
    await expect(movieCard.getByText("Movies", { exact: true })).toBeAttached();
    await expect(bookCard.getByText("Books", { exact: true })).toBeAttached();
    await expect(movieCard.getByRole("button", { name: `Edit ${movies.private.name}`, exact: true })).toBeVisible();
    expect(await movieCard.evaluate(card => getComputedStyle(card.parentElement!).gridTemplateColumns.split(" ").length)).toBe(5);
    await movieCard.getByRole("button", { name: `Edit ${movies.private.name}`, exact: true }).click();
    const editor = page.getByRole("dialog", { name: movies.private.name, exact: true });
    await editor.getByRole("button", { name: "Add to favorites", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Remove from favorites", exact: true })).toBeEnabled();
    await editor.getByRole("button", { name: "Remove from favorites", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Add to favorites", exact: true })).toBeEnabled();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(editor).toHaveCount(0);
    await page.getByRole("button", { name: "Table view", exact: true }).click();
    const table = page.getByRole("table", { name: "Media results", exact: true });
    await expect(table.getByRole("columnheader")).toHaveText(["Name", "Media type", "Status", "Information", ""]);
    await expect(table.locator("img")).toHaveCount(0);
    await table.getByRole("button", { name: `Edit ${movies.private.name}`, exact: true }).click();
    await editor.getByRole("combobox").filter({ hasText: "Plan to Watch" }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(editor.getByRole("combobox").filter({ hasText: "Completed" })).toBeEnabled();
    await expect(editor).toBeVisible();
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(table.getByRole("link")).toHaveText(["A long-awaited book"]);
    await expect(page.getByRole("combobox", { name: "Filter by media type", exact: true })).toHaveCount(0);
    await page.goto(`/list/movies/${users.owner.name}?view=list`);
    await expect(page.getByRole("row").filter({ has: page.getByRole("link", { name: movies.private.name, exact: true }) })).toContainText("Completed");
});
