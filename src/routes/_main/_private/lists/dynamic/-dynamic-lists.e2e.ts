import {expect, runBun, signIn, test} from "../../../../../../scripts/e2e/fixtures";
import {expectActionsBesideDisplay, expectListHeaderBack, listAction} from "../../../../../../scripts/e2e/list-actions";
import {movies, users} from "../../../../../../scripts/e2e/data";
import {browseFilterGenres} from "../../../_viewer/lists/collections/-browse.data";


test("creates, automatically counts, edits and deletes an owner dynamic list", async ({ page, baseURL }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts"]);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    await expect(page.getByRole("heading", { name: "Lists & collections", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Create dynamic list", exact: true }).click();
    const editor = page.getByRole("form", { name: "Dynamic list editor", exact: true });
    await expect(page).toHaveURL(/\/lists\/dynamic\/create$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(editor.getByRole("button", { name: "Create dynamic list", exact: true })).toBeVisible();
    const startingPoint = page.getByRole("combobox", { name: "List starting point", exact: true });
    await editor.getByLabel("List name", { exact: true }).fill("Keep my draft");
    await startingPoint.click();
    await page.getByRole("option", { name: "Plans older than six months", exact: true }).click();
    const discard = page.getByRole("alertdialog", { name: "Discard your changes?", exact: true });
    await discard.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(editor.getByLabel("List name", { exact: true })).toHaveValue("Keep my draft");
    await expect(startingPoint).toContainText("Blank list");
    await startingPoint.click();
    await page.getByRole("option", { name: "Plans older than six months", exact: true }).click();
    await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(editor.getByLabel("List name", { exact: true })).toHaveValue("Plans older than six months");
    await expect(editor.getByRole("complementary", { name: "Preview dynamic list", exact: true }).getByText("2 media", { exact: true })).toBeVisible();
    await startingPoint.click();
    await page.getByRole("option", { name: "Blank list", exact: true }).click();
    await expect(editor.getByLabel("List name", { exact: true })).toHaveValue("My list");
    await editor.getByLabel("List name", { exact: true }).fill("My weekend plans");
    const summary = editor.getByRole("complementary", { name: "Preview dynamic list", exact: true });
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
    await editor.getByRole("button", { name: "Create dynamic list", exact: true }).click();
    await expect(page.getByRole("heading", { name: "My weekend plans", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const viewUrl = page.url();
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(page.getByText("A long-awaited book", { exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toHaveCount(0);

    await (await listAction(page, "Edit dynamic list")).click();
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
        await expect(strangerPage.getByText("This content is private", { exact: true })).toBeVisible();
        await expect(strangerPage.getByText("Old movie plans", { exact: true })).toHaveCount(0);
        await expect(strangerPage.getByText(movies.private.name, { exact: true })).toHaveCount(0);
    }
    finally {
        await strangerPage.context().close();
    }

    await (await listAction(page, "Delete dynamic list")).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete list", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await expect(page.getByText("Old movie plans", { exact: true })).toHaveCount(0);
});


test("combines the expanded filters in a live view", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts"]);
    await signIn(page);
    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    await page.getByRole("link", { name: "Create dynamic list", exact: true }).click();
    const editor = page.getByRole("form", { name: "Dynamic list editor", exact: true });
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
    await expect(editor.getByRole("complementary", { name: "Preview dynamic list", exact: true }).getByText("1 media", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Create dynamic list", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Fresh unrated movie plans", exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toBeVisible();
    await expect(page.getByText(movies.private.name, { exact: true })).toHaveCount(0);
    await (await listAction(page, "Edit dynamic list")).click();
    await expect(editor.getByLabel("Title contains", { exact: true })).toHaveValue("Browser");
    await expect(editor.getByRole("checkbox", { name: "Plan to Watch", exact: true })).toBeChecked();
    await expect(editor.getByLabel("Added within … months", { exact: true })).toHaveValue("6");
});


test("finds genres and tags despite typos and saves their canonical names", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-search"]);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/lists/dynamic/create");
    const editor = page.getByRole("form", { name: "Dynamic list editor", exact: true });
    await editor.getByLabel("List name", { exact: true }).fill("Weekend science fiction");
    await editor.getByRole("button", { name: "Movies", exact: true }).click();
    const statusChoices = editor.locator("details").filter({ hasText: "Choose specific statuses" });
    await statusChoices.locator("summary").click();
    await expect(statusChoices.getByRole("checkbox")).toHaveCount(2);
    await expect(statusChoices.getByRole("checkbox", { name: "Plan to Watch", exact: true })).toBeVisible();
    await expect(statusChoices.getByRole("checkbox", { name: "Completed", exact: true })).toBeVisible();
    await editor.getByRole("searchbox", { name: "Genres", exact: true }).fill("Scince Fiction");
    await editor.getByRole("button", { name: "Science Fiction", exact: true }).click();
    await expect(editor.getByRole("button", { name: "Remove Science Fiction filter", exact: true })).toBeVisible();
    await expect(editor.getByRole("searchbox", { name: "Genres", exact: true })).toHaveValue("");
    await editor.getByRole("searchbox", { name: "Tags", exact: true }).fill("Weekned");
    await editor.getByRole("button", { name: "Weekend", exact: true }).click();
    await editor.getByRole("searchbox", { name: "Exclude tags", exact: true }).fill("Aovid");
    await editor.getByRole("button", { name: "Avoid", exact: true }).click();
    await expect(editor.getByRole("complementary", { name: "Preview dynamic list", exact: true }).getByText("1 media", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await editor.getByRole("button", { name: "Create dynamic list", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Weekend science fiction", exact: true })).toBeVisible();
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toHaveCount(0);
    await (await listAction(page, "Edit dynamic list")).click();
    await page.reload();
    for (const canonicalName of ["Science Fiction", "Weekend", "Avoid"]) {
        await expect(editor.getByRole("button", { name: `Remove ${canonicalName} filter`, exact: true })).toBeVisible();
    }
    await expect(editor.getByRole("searchbox", { name: "Genres", exact: true })).toHaveValue("");
    await expect(editor.getByRole("searchbox", { name: "Tags", exact: true })).toHaveValue("");
    await expect(editor.getByRole("searchbox", { name: "Exclude tags", exact: true })).toHaveValue("");
});


test("saves scoped movie metadata, keeps books, and shares temporary filtering with tracking lists", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-metadata"]);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/lists/dynamic/create");
    const editor = page.getByRole("form", { name: "Dynamic list editor", exact: true });
    await editor.getByLabel("List name", { exact: true }).fill("Cate and my books");
    await editor.getByRole("button", { name: "Movies", exact: true }).click();
    await editor.getByRole("button", { name: "Books", exact: true }).click();
    const movieRules = editor.getByRole("group", { name: "Movies", exact: true });
    await movieRules.getByRole("searchbox", { name: "Actors", exact: true }).fill("Cate Blanchtt");
    await movieRules.getByRole("button", { name: "Cate Blanchett", exact: true }).click();
    const summary = editor.getByRole("complementary", { name: "Preview dynamic list", exact: true });
    await expect(summary.getByText("2 media", { exact: true })).toBeVisible();
    await expect(summary.getByText("Movies · Actors: Cate Blanchett", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await editor.getByRole("button", { name: "Create dynamic list", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Cate and my books", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `View ${movies.private.name}`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View A long-awaited book", exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toHaveCount(0);

    await (await listAction(page, "Edit dynamic list")).click();
    await expect(page.getByRole("heading", { name: "Edit dynamic list", exact: true })).toBeVisible();
    await page.reload();
    await expect(movieRules.getByRole("button", { name: "Remove Cate Blanchett filter", exact: true })).toBeVisible();
    await movieRules.getByRole("button", { name: "Remove Cate Blanchett filter", exact: true }).click();
    await expect(summary.getByText("3 media", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Cate and my books", exact: true })).toBeVisible();
    const listUrl = page.url();
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    const filters = page.getByRole("dialog", { name: "Additional filters", exact: true });
    const movieFilters = filters.getByRole("group", { name: "Movies", exact: true });
    await movieFilters.getByRole("searchbox", { name: "Actors", exact: true }).fill("Cate Blanchtt");
    await movieFilters.getByRole("button", { name: "Cate Blanchett", exact: true }).click();
    await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(2);
    await expect(page.getByRole("link", { name: "View A long-awaited book", exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toHaveCount(0);
    await page.reload();
    const applied = page.getByRole("group", { name: "Browsing results and filters", exact: true });
    await expect(applied.getByRole("button", { name: "Remove Movies · Actors: Cate Blanchett", exact: true })).toBeVisible();
    await applied.getByRole("button", { name: "Remove Movies · Actors: Cate Blanchett", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(3);
    await expect(page).toHaveURL(url => !url.searchParams.get("mediaFilters")?.includes("Cate Blanchett"));
    await page.goto(listUrl);
    await expect(page.getByRole("article")).toHaveCount(3);

    await page.goto(`/lists/tracking/movies/${users.owner.name}`);
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    const listFilters = page.getByRole("dialog", { name: "Additional Filters", exact: true });
    await listFilters.getByRole("searchbox", { name: "Actors", exact: true }).fill("Cate Blanchtt");
    await listFilters.getByRole("button", { name: "Cate Blanchett", exact: true }).click();
    await listFilters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(page.getByRole("link", { name: `View ${movies.private.name}`, exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(url => url.searchParams.get("actors")?.includes("Cate Blanchett") === true);
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(listFilters.getByRole("button", { name: "Remove Cate Blanchett filter", exact: true })).toBeVisible();
    await listFilters.getByRole("searchbox", { name: "Actors", exact: true }).fill("Michael Keatno");
    await listFilters.getByRole("button", { name: "Michael Keaton", exact: true }).click();
    await listFilters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    for (const actor of ["Cate Blanchett", "Michael Keaton"]) {
        await expect(applied.getByRole("button", { name: `Remove ${actor} filter`, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: `View ${movies.private.name}`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `View ${movies.editable.name}`, exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    for (const actor of ["Cate Blanchett", "Michael Keaton"]) {
        await expect(listFilters.getByRole("button", { name: `Remove ${actor} filter`, exact: true })).toBeVisible();
    }
    await listFilters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    for (const actor of ["Cate Blanchett", "Michael Keaton"]) {
        await expect(applied.getByRole("button", { name: `Remove ${actor} filter`, exact: true })).toBeVisible();
    }
    await applied.getByRole("button", { name: "Remove Cate Blanchett filter", exact: true }).click();
    await expect(page.getByText(movies.private.name, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: `View ${movies.editable.name}`, exact: true })).toBeVisible();
    await expect(applied.getByRole("button", { name: "Remove Michael Keaton filter", exact: true })).toBeVisible();
    await applied.getByRole("button", { name: "Remove Michael Keaton filter", exact: true }).click();
    await expect(page.getByRole("link", { name: `View ${movies.private.name}`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `View ${movies.editable.name}`, exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => !url.searchParams.has("actors"));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("preserves filters when entering and leaving the dynamic list editor", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.goto("/lists/dynamic/501?view=table&search=long-awaited");
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501" && url.searchParams.get("view") === "table"
        && url.searchParams.get("search") === "long-awaited");
    await expect(page.getByRole("table").getByRole("link", { name: "A long-awaited book", exact: true })).toBeVisible();
    await (await listAction(page, "Edit dynamic list")).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501/edit" && url.searchParams.get("view") === "table"
        && url.searchParams.get("search") === "long-awaited");
    await expect(page.getByRole("heading", { name: "Edit dynamic list", exact: true })).toBeVisible();
    const editor = page.getByRole("form", { name: "Dynamic list editor", exact: true });
    await editor.getByLabel("List name", { exact: true }).fill("Keep this unsaved name");
    await page.getByRole("main").getByRole("link", { name: "Lists & collections", exact: true }).click();
    await page.getByRole("alertdialog", { name: "Discard your changes?", exact: true }).getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501/edit");
    await expect(editor.getByLabel("List name", { exact: true })).toHaveValue("Keep this unsaved name");
    await editor.getByLabel("List name", { exact: true }).fill("Profile list 1");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501" && url.searchParams.get("view") === "table"
        && url.searchParams.get("search") === "long-awaited");
    await page.goto("/lists/dynamic/create?preset=0");
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/create" && url.searchParams.get("preset") === "0");
    await expect(page.getByLabel("List name", { exact: true })).toHaveValue("Plans older than six months");
    await page.getByRole("main").getByRole("link", { name: "Lists & collections", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await expect(page.getByRole("article", { name: "Profile list 1", exact: true })).toBeVisible();
});


test("opens cards while keeping edit, pin and delete actions independent", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    const card = page.getByRole("article", { name: "Profile list 1", exact: true });
    await expect(card.getByText("2 media", { exact: true })).toBeVisible();
    await expect(card.locator("img")).toHaveCount(2);
    await expect(card.getByText("Grid", { exact: true })).toHaveCount(0);
    await expect(card.getByRole("link", { name: "Open Profile list 1", exact: true })).toHaveCount(0);
    await (await listAction(page, "Pin to profile", card)).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await expect(await listAction(page, "Unpin from profile", card)).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(card.getByRole("button", { name: "Actions for Profile list 1", exact: true })).toHaveText("");

    await (await listAction(page, "Edit dynamic list", card)).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501/edit");
    const editor = page.getByRole("form", { name: "Dynamic list editor", exact: true });
    await editor.getByLabel("List name", { exact: true }).fill("An unsaved name");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    const discard = page.getByRole("alertdialog", { name: "Discard your changes?", exact: true });
    await discard.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(editor.getByLabel("List name", { exact: true })).toHaveValue("An unsaved name");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Profile list 1", exact: true })).toBeVisible();
    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    await card.click({ position: { x: 12, y: 12 } });
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501");
    await expect(page.getByRole("heading", { name: "Profile list 1", exact: true })).toBeVisible();

    await page.goto(`/profile/${users.owner.name}`);
    const shortcuts = page.getByRole("region", { name: "Pinned lists & collections", exact: true });
    await expect(shortcuts.getByRole("link", { name: "Profile list 1", exact: true })).toBeVisible();
    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    await (await listAction(page, "Delete dynamic list", card)).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByRole("heading", { name: "Delete this dynamic list?", exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(await listAction(page, "Unpin from profile", card)).toBeEnabled();
    await (await listAction(page, "Delete dynamic list", card)).click();
    await confirmation.getByRole("button", { name: "Delete list", exact: true }).click();
    await expect(card).toHaveCount(0);
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await expect(page.getByRole("article", { name: "Profile list 2", exact: true })).toBeVisible();
    await page.goto(`/profile/${users.owner.name}`);
    await expect(shortcuts).toHaveCount(0);
    await page.goto(`/lists/tracking/movies/${users.owner.name}?view=list`);
    await expect(page.getByRole("link", { name: movies.private.name, exact: true })).toBeVisible();
});


test("pins four lists from their cards, appends new pins, and hides the profile section when cleared", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.goto(`/profile/${users.owner.name}`);
    await expect(page.getByText("No Media Highlighted Yet.", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Pinned lists & collections", exact: true })).toHaveCount(0);
    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    for (const index of [2, 1, 3, 4]) {
        const card = page.getByRole("article", { name: `Profile list ${index}`, exact: true });
        await (await listAction(page, "Pin to profile", card)).click();
        await expect(await listAction(page, "Unpin from profile", card)).toBeEnabled();
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Move / })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Profile position", exact: true })).toHaveCount(0);
    await expect(await listAction(page, "Pin to profile", page.getByRole("article", { name: "Profile list 5", exact: true }))).toBeDisabled();
    await page.keyboard.press("Escape");
    const hubCard = page.getByRole("article", { name: "Profile list 2", exact: true });
    const allMediaBadge = hubCard.locator('[data-slot="badge"]').filter({ hasText: /^All media$/, visible: true });
    await expect(allMediaBadge.locator("svg")).toHaveCount(3);
    for (const icon of ["monitor", "popcorn", "library"]) {
        await expect(allMediaBadge.locator(`.lucide-${icon}`)).toHaveCount(1);
    }
    await expect(allMediaBadge.locator(".lucide-book-image")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    const moreRules = hubCard.getByRole("button", { name: /^Show \d+ more list rules?$/ });
    await expect(moreRules).toBeVisible();
    await expect(moreRules).toHaveText(/^\+\d+$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await moreRules.click();
    await expect(page.getByText("More list rules", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Added First", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}` && url.searchParams.get("kind") === "dynamic");
    await page.keyboard.press("Escape");
    await page.goto(`/profile/${users.owner.name}`);
    const shortcuts = page.getByRole("region", { name: "Pinned lists & collections", exact: true });
    await expect(shortcuts).toBeVisible();
    await expect(shortcuts.getByRole("heading", { level: 3 })).toHaveText(["Profile list 2", "Profile list 1", "Profile list 3", "Profile list 4"]);
    const firstShortcut = shortcuts.getByRole("article").first();
    await expect(firstShortcut).toContainText("2 media");
    await expect(firstShortcut).toContainText("Dynamic list");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await shortcuts.getByRole("link", { name: "Profile list 2", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/502");
    await expect(page.getByRole("heading", { name: "Profile list 2", exact: true })).toBeVisible();
    await expectActionsBesideDisplay(page);
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(await listAction(page, "Edit dynamic list")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/lists/dynamic/505");
    await expect(await listAction(page, "Pin to profile")).toBeDisabled();

    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    const firstCard = page.getByRole("article", { name: "Profile list 1", exact: true });
    await (await listAction(page, "Unpin from profile", firstCard)).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByRole("heading", { name: "Unpin this list?", exact: true })).toBeVisible();
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(await listAction(page, "Unpin from profile", firstCard)).toBeEnabled();
    await (await listAction(page, "Unpin from profile", firstCard)).click();
    await confirmation.getByRole("button", { name: "Unpin", exact: true }).click();
    await expect(await listAction(page, "Pin to profile", firstCard)).toBeEnabled();
    const fifthCard = page.getByRole("article", { name: "Profile list 5", exact: true });
    await (await listAction(page, "Pin to profile", fifthCard)).click();
    await expect(await listAction(page, "Unpin from profile", fifthCard)).toBeEnabled();
    await page.goto(`/profile/${users.owner.name}`);
    await expect(shortcuts.getByRole("heading", { level: 3 })).toHaveText(["Profile list 2", "Profile list 3", "Profile list 4", "Profile list 5"]);

    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    for (const index of [2, 3, 4, 5]) {
        const card = page.getByRole("article", { name: `Profile list ${index}`, exact: true });
        await (await listAction(page, "Unpin from profile", card)).click();
        await confirmation.getByRole("button", { name: "Unpin", exact: true }).click();
        await expect(await listAction(page, "Pin to profile", card)).toBeEnabled();
    }
    await page.goto(`/profile/${users.owner.name}`);
    await expect(page.getByText("No Media Highlighted Yet.", { exact: true })).toBeVisible();
    await expect(shortcuts).toHaveCount(0);
    await page.goto("/lists/dynamic/501");
    await expect(page.getByRole("heading", { name: "Profile list 1", exact: true })).toBeVisible();
    await expect(await listAction(page, "Pin to profile")).toBeEnabled();
});


test("shares four profile pins between lists and collections without exposing a private collection on a public profile", async ({ page, browser, baseURL }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts", "seed-public-profile"]);
    await runBun(["src/routes/_main/_viewer/lists/-fixtures.ts"]);
    await signIn(page);
    await page.goto(`/lists/${users.owner.name}`);
    const dynamic = page.getByRole("region", { name: "Dynamic lists", exact: true });
    for (const index of [1, 2]) {
        const card = dynamic.getByRole("article", { name: `Profile list ${index}`, exact: true });
        await (await listAction(page, "Pin to profile", card)).click();
        await expect(await listAction(page, "Unpin from profile", card)).toBeEnabled();
    }
    const collections = page.getByRole("region", { name: "Collections", exact: true });
    await (await listAction(page, "Pin to profile", collections.getByRole("article", { name: "Hub collection 01", exact: true }))).click();
    await page.goto("/lists/collections/714");
    await (await listAction(page, "Pin to profile")).click();
    await expect(await listAction(page, "Unpin from profile")).toBeEnabled();
    await page.goto("/lists/dynamic/505");
    await expect(await listAction(page, "Pin to profile")).toBeDisabled();
    await page.goto("/lists/collections/702");
    await expect(await listAction(page, "Pin to profile")).toBeDisabled();

    await page.goto(`/profile/${users.owner.name}`);
    const pins = page.getByRole("region", { name: "Pinned lists & collections", exact: true });
    await expect(pins.getByRole("article")).toHaveCount(4);
    await expect(pins.getByRole("heading", { level: 3 })).toHaveText([
        "Profile list 1", "Profile list 2", "Hub collection 01", "Hub private collection",
    ]);

    const visitor = await browser.newPage({ baseURL });
    try {
        const response = await visitor.goto(`/profile/${users.owner.name}`);
        const visiblePins = visitor.getByRole("region", { name: "Pinned lists & collections", exact: true });
        await expect(visiblePins.getByRole("article")).toHaveCount(3);
        await expect(visiblePins.getByRole("link", { name: "Hub collection 01", exact: true })).toBeVisible();
        await expect(visitor.getByText("Hub private collection", { exact: true })).toHaveCount(0);
        expect(await response!.text()).not.toContain("Hub private collection");
        await visitor.goto("/lists/collections/714");
        await expect(visitor.getByText("This content is private", { exact: true })).toBeVisible();
        await expect(visitor.getByRole("menuitem", { name: "Unpin from profile", exact: true })).toHaveCount(0);
    }
    finally {
        await visitor.context().close();
    }

    await page.goto("/lists/dynamic/501");
    await (await listAction(page, "Unpin from profile")).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Unpin", exact: true }).click();
    await page.goto("/lists/collections/702");
    await expect(await listAction(page, "Pin to profile")).toBeEnabled();
    await (await listAction(page, "Pin to profile")).click();
    await expect(await listAction(page, "Unpin from profile")).toBeEnabled();
    await page.goto(`/profile/${users.owner.name}`);
    await expect(pins.getByRole("heading", { level: 3 })).toHaveText([
        "Profile list 2", "Hub collection 01", "Hub private collection", "Hub collection 02",
    ]);
    await page.goto("/lists/collections/702");
    await (await listAction(page, "Delete collection")).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete collection", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await expect(await listAction(page, "Pin to profile", dynamic.getByRole("article", { name: "Profile list 5", exact: true }))).toBeEnabled();
    await page.goto(`/profile/${users.owner.name}`);
    await expect(pins.getByRole("article")).toHaveCount(3);
});


test("pinned and unpinned dynamic lists follow public, restricted and private profile rules", async ({ page, browser, baseURL }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    const card = page.getByRole("article", { name: "Profile list 1", exact: true });
    await (await listAction(page, "Pin to profile", card)).click();
    await expect(await listAction(page, "Unpin from profile", card)).toBeEnabled();

    for (const account of [null, "stranger", "follower"] as const) {
        const visitor = await browser.newPage({ baseURL });
        try {
            if (account) await signIn(visitor, account);
            const privateResponse = await visitor.goto("/lists/dynamic/501");
            if (account === "follower") {
                await expect(visitor.getByRole("heading", { name: "Profile list 1", exact: true })).toBeVisible();
                await expect(visitor.getByText(movies.private.name, { exact: true })).toBeVisible();
                await expect(await listAction(visitor, "Edit dynamic list")).toHaveCount(0);
                await expect(visitor.getByRole("button", { name: /^Edit / })).toHaveCount(0);
                await expect(visitor.getByRole("button", { name: "Add media to list", exact: true })).toHaveCount(0);
                await expect(visitor.getByRole("menuitem", { name: "Unpin from profile", exact: true })).toHaveCount(0);
                const editResponse = await visitor.goto("/lists/dynamic/501/edit");
                await expect(visitor.getByText("Dynamic list not found.", { exact: true })).toBeVisible();
                await expect(visitor.getByRole("form", { name: "Dynamic list editor", exact: true })).toHaveCount(0);
                expect(await editResponse!.text()).not.toContain("Profile list 1");
            }
            else {
                await expect(visitor.getByText("This content is private", { exact: true })).toBeVisible();
                expect(await privateResponse!.text()).not.toContain("Profile list 1");
                expect(await privateResponse!.text()).not.toContain(movies.private.name);
            }
            await visitor.goto("/lists/dynamic/512");
            if (account) {
                await expect(visitor.getByRole("heading", { name: "Restricted dynamic list", exact: true })).toBeVisible();
                await expect(visitor.getByText(movies.private.name, { exact: true })).toBeVisible();
            }
            else await expect(visitor.getByText("This content is restricted", { exact: true })).toBeVisible();
            await visitor.goto("/lists/dynamic/511");
            await expect(visitor.getByRole("heading", { name: "Public dynamic list", exact: true })).toBeVisible();
            await expect(visitor.getByText(movies.private.name, { exact: true })).toHaveCount(0);
            if (account !== "stranger") await expect(await listAction(visitor, "Edit dynamic list")).toHaveCount(0);
            const unpinnedResponse = await visitor.goto("/lists/dynamic/505");
            if (account === "follower") {
                await expect(visitor.getByRole("heading", { name: "Profile list 5", exact: true })).toBeVisible();
                await expect(visitor.getByText(movies.private.name, { exact: true })).toBeVisible();
                await expect(visitor.getByText("A long-awaited book", { exact: true })).toBeVisible();
                await expect(await listAction(visitor, "Edit dynamic list")).toHaveCount(0);
                await expect(visitor.getByRole("menuitem", { name: "Pin to profile", exact: true })).toHaveCount(0);
                await expect(visitor.getByRole("menuitem", { name: "Delete dynamic list", exact: true })).toHaveCount(0);
                await expect(visitor.getByRole("button", { name: /^Edit / })).toHaveCount(0);
            }
            else {
                await expect(visitor.getByText("This content is private", { exact: true })).toBeVisible();
                expect(await unpinnedResponse!.text()).not.toContain("Profile list 5");
                expect(await unpinnedResponse!.text()).not.toContain(movies.private.name);
            }

            const restrictedUnpinnedResponse = await visitor.goto("/lists/dynamic/514");
            if (account) {
                await expect(visitor.getByRole("heading", { name: "Unpinned restricted dynamic list", exact: true })).toBeVisible();
                await expect(visitor.getByText(movies.private.name, { exact: true })).toBeVisible();
                await expect(await listAction(visitor, "Edit dynamic list")).toHaveCount(0);
            }
            else {
                await expect(visitor.getByText("This content is restricted", { exact: true })).toBeVisible();
                expect(await restrictedUnpinnedResponse!.text()).not.toContain("Unpinned restricted dynamic list");
                expect(await restrictedUnpinnedResponse!.text()).not.toContain(movies.private.name);
            }
            await visitor.goto("/lists/dynamic/513");
            await expect(visitor.getByRole("heading", { name: "Unpinned public dynamic list", exact: true })).toBeVisible();
            if (account !== "stranger") {
                await expect(await listAction(visitor, "Edit dynamic list")).toHaveCount(0);
                await expect(visitor.getByRole("menuitem", { name: "Pin to profile", exact: true })).toHaveCount(0);
                await expect(visitor.getByRole("menuitem", { name: "Delete dynamic list", exact: true })).toHaveCount(0);
            }

            const privateHubResponse = await visitor.goto(`/lists/${users.owner.name}?kind=dynamic`);
            await expect(visitor).toHaveURL(url => url.pathname === `/lists/${users.owner.name}` && url.searchParams.get("kind") === "dynamic");
            await expect(visitor.getByRole("heading", { name: "Lists & collections", exact: true })).toBeVisible();
            if (account === "follower") {
                await expect(visitor.getByRole("article", { name: "Profile list 5", exact: true })).toBeVisible();
                await expect(visitor.getByRole("article", { name: "Profile list 5", exact: true }).getByRole("button", { name: "Actions for Profile list 5", exact: true })).toHaveCount(0);
            }
            else {
                await expect(visitor.getByText("Tracking lists are private", { exact: true })).toBeVisible();
                await expect(visitor.getByRole("link", { name: "Movies list", exact: true })).toHaveCount(0);
                expect(await privateHubResponse!.text()).not.toContain("Profile list 5");
                expect(await privateHubResponse!.text()).not.toContain(movies.private.name);
            }
            const restrictedHubResponse = await visitor.goto(`/lists/${users.restricted.name}?kind=dynamic`);
            await expect(visitor).toHaveURL(url => url.pathname === `/lists/${users.restricted.name}` && url.searchParams.get("kind") === "dynamic");
            await expect(visitor.getByRole("heading", { name: "Lists & collections", exact: true })).toBeVisible();
            if (account) {
                await expect(visitor.getByRole("article", { name: "Unpinned restricted dynamic list", exact: true })).toBeVisible();
            }
            else {
                await expect(visitor.getByText("Tracking lists are private", { exact: true })).toBeVisible();
                expect(await restrictedHubResponse!.text()).not.toContain("Unpinned restricted dynamic list");
                expect(await restrictedHubResponse!.text()).not.toContain(movies.private.name);
            }

        }
        finally {
            await visitor.context().close();
        }
    }
});


test("pins from the detail page, confirms unpinning, and switches runtime display", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.goto("/lists/dynamic/501");
    await expectListHeaderBack(page, "Profile list 1");
    await expectActionsBesideDisplay(page);
    await page.getByRole("button", { name: "Quick actions", exact: true }).focus();
    await page.keyboard.press("Enter");
    const pin = page.getByRole("menuitem", { name: "Pin to profile", exact: true });
    await expect(pin).toBeEnabled();
    await page.keyboard.press("Home");
    await expect(pin).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(await listAction(page, "Unpin from profile")).toBeEnabled();

    await page.goto("/lists/dynamic/502");
    await (await listAction(page, "Pin to profile")).click();
    await expect(await listAction(page, "Unpin from profile")).toBeEnabled();
    await page.goto(`/profile/${users.owner.name}`);
    const shortcuts = page.getByRole("region", { name: "Pinned lists & collections", exact: true });
    await expect(shortcuts.getByRole("heading", { level: 3 })).toHaveText(["Profile list 1", "Profile list 2"]);
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
    await (await listAction(page, "Edit dynamic list")).click();
    const editor = page.getByRole("form", { name: "Dynamic list editor", exact: true });
    await expect(editor.getByRole("button", { name: "Grid", exact: true })).toHaveAttribute("aria-pressed", "true");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(browseUrl);
    await page.getByRole("button", { name: "Grid view", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("view") === "grid");
    await expect(page.getByRole("table")).toHaveCount(0);

    await (await listAction(page, "Unpin from profile")).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByRole("heading", { name: "Unpin this list?", exact: true })).toBeVisible();
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(await listAction(page, "Unpin from profile")).toBeEnabled();
    await (await listAction(page, "Unpin from profile")).click();
    await confirmation.getByRole("button", { name: "Unpin", exact: true }).click();
    await expect(confirmation).toHaveCount(0);
    await expect(await listAction(page, "Pin to profile")).toBeEnabled();
    await expect(page.getByRole("heading", { name: "Profile list 2", exact: true })).toBeVisible();
    await page.goto(`/profile/${users.owner.name}`);
    await expect(shortcuts.getByRole("heading", { level: 3 })).toHaveText(["Profile list 1"]);
});


test("browses within saved rules and resets temporary filters without editing the view", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts", "seed-filters", "seed-search"]);
    await signIn(page);
    await page.goto("/lists/dynamic/501");
    await page.setViewportSize({ width: 390, height: 844 });
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    const search = controls.getByRole("searchbox", { name: "Search this dynamic list", exact: true });
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
    await expect(filters.getByRole("searchbox", { name: "Tags", exact: true })).toHaveCount(0);
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    await filters.getByRole("searchbox", { name: "Tags", exact: true }).fill("Weekned");
    await filters.getByRole("button", { name: "Weekend", exact: true }).click();
    await filters.getByRole("button", { name: "Filters", exact: true }).click();
    await genres.getByRole("button", { name: "More", exact: true }).click();
    await expect(lastGenre).toBeChecked();
    await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page).toHaveURL(url => Boolean(url.searchParams.get("tags")?.includes("Weekend")));
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
    await expect(page).toHaveURL(url => !url.searchParams.has("genres") && !url.searchParams.has("tags"));
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
    await (await listAction(page, "Edit dynamic list")).click();
    const editor = page.getByRole("form", { name: "Dynamic list editor", exact: true });
    await expect(editor.getByRole("combobox", { name: "Status", exact: true })).toContainText("Plan to watch, play or read");
    await expect(editor.getByRole("combobox", { name: "Sort by", exact: true })).toContainText("Date Added");
    await expect(editor.getByRole("button", { name: "Grid", exact: true })).toHaveAttribute("aria-pressed", "true");
    await editor.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(browseUrl);
    await page.getByRole("button", { name: "Reset filters", exact: true }).click();
    await expect(table.getByRole("link")).toHaveCount(2);
    await expect(controls.getByRole("combobox", { name: "Sort media", exact: true })).toContainText("Saved order");
});


test("shares list cards and tables, and refreshes dynamic list membership after owner edits", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts"]);
    await signIn(page);
    await page.setViewportSize({ width: 1536, height: 1000 });
    await page.goto("/lists/dynamic/501");
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
    await page.goto(`/lists/tracking/movies/${users.owner.name}?view=list`);
    await expect(page.getByRole("row").filter({ has: page.getByRole("link", { name: movies.private.name, exact: true }) })).toContainText("Completed");
});


test("filters hub dynamic lists by actual matches and opens the full mixed list", async ({ page, browser, baseURL }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts", "seed-tabs"]);
    await signIn(page);
    await page.goto(`/lists/${users.owner.name}?kind=dynamic&mediaType=movies`);
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}` && url.searchParams.get("mediaType") === "movies" && url.searchParams.get("kind") === "dynamic");
    await expect(page.getByRole("heading", { name: "Lists & collections", exact: true })).toBeVisible();
    const first = page.getByRole("article", { name: "Profile list 1", exact: true });
    await expect(first).toContainText("2 media");
    await expect(await listAction(page, "Pin to profile", first)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("article", { name: "Empty movie rules", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const type = page.getByRole("combobox", { name: "Filter by media type", exact: true });
    await type.click();
    await page.getByRole("option", { name: /^books$/i }).click();
    await first.getByRole("link", { name: "Profile list 1", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501" && !url.searchParams.has("mediaType"));
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(page.getByText("A long-awaited book", { exact: true })).toBeVisible();
    await expect(await listAction(page, "Edit dynamic list")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Lists & collections", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);

    for (const mediaType of ["manga", "series"]) {
        await page.goto(`/lists/${users.owner.name}?kind=dynamic&mediaType=${mediaType}`);
        await expect(page.getByText("No matching dynamic lists", { exact: true })).toBeVisible();
        await expect(page.getByRole("article")).toHaveCount(0);
    }

    const follower = await browser.newPage({ baseURL });
    try {
        await signIn(follower, "follower");
        await follower.goto(`/lists/${users.owner.name}?kind=dynamic&mediaType=books`);
        const visitorCard = follower.getByRole("article", { name: "Profile list 1", exact: true });
        await expect(visitorCard).toBeVisible();
        await expect(visitorCard.getByRole("button", { name: "Actions for Profile list 1", exact: true })).toHaveCount(0);
        await expect(follower.getByRole("link", { name: "Create dynamic list", exact: true })).toHaveCount(0);
        await visitorCard.getByRole("link", { name: "Profile list 1", exact: true }).click();
        await expect(follower).toHaveURL(url => url.pathname === "/lists/dynamic/501" && !url.searchParams.has("mediaType"));
        await expect(follower.getByText(movies.private.name, { exact: true })).toBeVisible();
        await expect(follower.getByText("A long-awaited book", { exact: true })).toBeVisible();
        await expect(await listAction(follower, "Edit dynamic list")).toHaveCount(0);
        await expect(follower.getByRole("button", { name: /^Edit / })).toHaveCount(0);
    }
    finally {
        await follower.context().close();
    }

    await page.goto(`/lists/tracking/manga/${users.owner.name}`);
    await page.getByRole("button", { name: "Edit Completed manga outside dynamic lists", exact: true }).click();
    const mediaEditor = page.getByRole("dialog", { name: "Completed manga outside dynamic lists", exact: true });
    await mediaEditor.getByRole("button", { name: "Add to favorites", exact: true }).click();
    await expect(mediaEditor.getByRole("button", { name: "Remove from favorites", exact: true })).toBeEnabled();
    await mediaEditor.getByRole("button", { name: "Close", exact: true }).click();
    await page.goto(`/lists/${users.owner.name}?kind=dynamic&mediaType=manga`);
    const mangaFavorites = page.getByRole("article", { name: "Manga favorites", exact: true });
    await expect(mangaFavorites).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(1);
    await (await listAction(page, "Delete dynamic list", mangaFavorites)).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete list", exact: true }).click();
    await expect(mangaFavorites).toHaveCount(0);
    await expect(page.getByText("No matching dynamic lists", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("No matching dynamic lists", { exact: true })).toBeVisible();
    await page.goto("/lists/dynamic/521");
    await expect(page.getByRole("heading", { name: "Empty movie rules", exact: true })).toBeVisible();
});
