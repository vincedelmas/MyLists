import {expectActionsBesideDisplay, expectListHeaderBack, listAction} from "../../../../../../scripts/e2e/list-actions";
import {publicCollection, users} from "../../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../../scripts/e2e/fixtures";
import {browseActor, browseDirector, browseGem, browseMovies, browseNote, communityNavigationCollections} from "./-browse.data";
import {mixedCollection, mixedMedia} from "./-mixed.data";


test("preserves community collection filters through cards and editing while keeping hub navigation separate", async ({ page, browser, baseURL }) => {
    await runBun(["src/routes/_main/_viewer/lists/collections/-browse.fixtures.ts", "seed-community"]);
    await signIn(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/collections/discover");
    const search = page.getByRole("searchbox", { name: "Search community collections", exact: true });
    await search.fill("Community navigation");
    await expect(page).toHaveURL(url => url.searchParams.get("search") === "Community navigation");
    await page.getByRole("combobox", { name: "Filter by media type", exact: true }).click();
    await page.getByRole("option", { name: /^movies$/i }).click();
    await page.getByRole("button", { name: "Go to page 2", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/collections/discover" && url.searchParams.get("page") === "2");
    const fromCommunity = { page: 2, search: "Community navigation", mediaType: "movies" };
    const collection = communityNavigationCollections.at(-1)!;
    const communityUrl = page.url();
    const card = page.getByRole("article", { name: collection.title, exact: true });
    await expect(card).toBeVisible();
    await expect(card.getByText("1 media", { exact: true })).toBeVisible();

    const searchLayout = await search.evaluate(input => {
        const group = input.closest('[data-slot="input-group"]')!;
        const allocatedWidth = parseFloat(getComputedStyle(group.parentElement!).gridTemplateColumns);
        return { allocatedWidth, width: group.getBoundingClientRect().width };
    });
    expect(searchLayout.width).toBeCloseTo(searchLayout.allocatedWidth, 0);
    await (await listAction(page, "Pin to profile", card)).click();
    await expect(await listAction(page, "Unpin from profile", card)).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(communityUrl);
    await (await listAction(page, "Delete collection", card)).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByRole("heading", { name: "Delete this collection?", exact: true })).toBeVisible();
    await expect(page).toHaveURL(communityUrl);
    await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();

    await (await listAction(page, "Edit collection", card)).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/collections/${collection.id}/edit`);
    expect(JSON.parse(new URL(page.url()).searchParams.get("fromCommunity")!)).toEqual(fromCommunity);
    await expectListHeaderBack(page, `Edit ${collection.title}`, "View collection");
    await expect(page.locator("form").getByRole("textbox", { name: "Title", exact: true })).toHaveValue(collection.title);
    await page.getByRole("link", { name: "View collection", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/collections/${collection.id}`);
    expect(JSON.parse(new URL(page.url()).searchParams.get("fromCommunity")!)).toEqual(fromCommunity);
    await expectListHeaderBack(page, collection.title, "Community collections");
    await expectActionsBesideDisplay(page);
    await page.getByRole("searchbox", { name: "Search this collection", exact: true }).fill(browseMovies[0].name);
    await expect(page).toHaveURL(url => url.searchParams.get("search") === browseMovies[0].name);
    expect(JSON.parse(new URL(page.url()).searchParams.get("fromCommunity")!)).toEqual(fromCommunity);
    await page.getByRole("main").getByRole("link", { name: "Community collections", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/collections/discover"
        && url.searchParams.get("page") === "2"
        && url.searchParams.get("search") === fromCommunity.search
        && url.searchParams.get("mediaType") === fromCommunity.mediaType);
    await expect(search).toHaveValue(fromCommunity.search);
    await expect(card).toBeVisible();

    await page.goto(`/lists/${users.owner.name}?kind=collections&search=${encodeURIComponent(collection.title)}`);
    await card.getByRole("link", { name: `Open ${collection.title}`, exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/collections/${collection.id}` && !url.searchParams.has("fromCommunity"));
    await expectListHeaderBack(page, collection.title);
    await expect(page.getByRole("main").getByRole("link", { name: "Community collections", exact: true })).toHaveCount(0);

    const visitor = await browser.newPage({ baseURL });
    try {
        await signIn(visitor, "stranger");
        await visitor.goto(communityUrl);
        const visitorCard = visitor.getByRole("article", { name: collection.title, exact: true });
        await expect(visitorCard).toBeVisible();
        await expect(visitorCard.getByRole("button", { name: `Actions for ${collection.title}`, exact: true })).toHaveCount(0);
        await visitorCard.getByRole("link", { name: `Open ${collection.title}`, exact: true }).click();
        await expect(visitor.getByRole("main").getByRole("link", { name: "Community collections", exact: true })).toBeVisible();
        await expect(await listAction(visitor, "Pin to profile")).toHaveCount(0);
        await expect(visitor.getByRole("menuitem", { name: "Unpin from profile", exact: true })).toHaveCount(0);
        await expect(visitor.getByRole("menuitem", { name: "Edit collection", exact: true })).toHaveCount(0);
        await expect(visitor.getByRole("menuitem", { name: "Delete collection", exact: true })).toHaveCount(0);
        await visitor.keyboard.press("Escape");
        await visitor.getByRole("button", { name: "Like", exact: true }).click();
        await expect(visitor.getByRole("button", { name: "Liked", exact: true })).toBeVisible();
        await visitor.getByRole("button", { name: "Copy", exact: true }).click();
        await expect(visitor).toHaveURL(/\/lists\/collections\/\d+\/edit$/);
        await expect(visitor.locator("form").getByRole("textbox", { name: "Title", exact: true })).toHaveValue(`Copy of ${collection.title}`);
    }
    finally {
        await visitor.context().close();
    }
    await page.goto(communityUrl);
    await card.getByRole("link", { name: `Open ${collection.title}`, exact: true }).click();
    await (await listAction(page, "Delete collection")).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete collection", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/collections/discover"
        && url.searchParams.get("page") === "2"
        && url.searchParams.get("search") === fromCommunity.search
        && url.searchParams.get("mediaType") === fromCommunity.mediaType);
    await expect(card).toHaveCount(0);
});


test("browses a ranked collection with shared sorting, preserves notes and tailors guest and viewer controls", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/collections/-browse.fixtures.ts"]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/lists/collections/${publicCollection.id}`);
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    const results = page.locator('[aria-label="Browsing results and filters"]');
    const search = page.getByRole("searchbox", { name: "Search this collection", exact: true });
    await expect(results.getByText("30 titles", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `View ${browseMovies[0].name}`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toHaveCount(0);
    await expect(controls.getByRole("combobox", { name: "Filter by library", exact: true })).toHaveCount(0);
    await expect(controls.getByRole("combobox", { name: "Filter by status", exact: true })).toHaveCount(0);
    await expect(controls.getByRole("button", { name: "Filters", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await search.fill(browseGem);
    await expect(results.getByText("1 title", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
    await expect(page.getByRole("article").filter({ has: page.getByRole("link", { name: `View ${browseGem}`, exact: true }) })).toContainText("#30");
    await page.getByRole("button", { name: "View comment", exact: true }).click();
    await expect(page.getByText(browseNote, { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await controls.getByRole("button", { name: "Table view", exact: true }).click();
    const table = page.getByRole("table", { name: "Media results", exact: true });
    await expect(table).toBeVisible();
    await expect(table.locator("img")).toHaveCount(0);
    await expect(table.getByRole("columnheader", { name: "Rank", exact: true })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Status", exact: true })).toHaveCount(0);
    await expect(table.getByText("#30", { exact: true })).toBeVisible();
    await table.getByRole("button", { name: "View comment", exact: true }).click();
    await expect(page.getByText(browseNote, { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await results.getByRole("button", { name: "Reset filters", exact: true }).click();
    await expect(search).toHaveValue("");
    await expect(results.getByText("30 titles", { exact: true })).toBeVisible();

    await search.fill(browseGem);
    await expect(results.getByText("1 title", { exact: true })).toBeVisible();
    await results.getByRole("button", { name: `Remove Search: ${browseGem}`, exact: true }).click();
    await expect(search).toHaveValue("");
    const sort = controls.getByRole("combobox", { name: "Sort collection titles", exact: true });
    await sort.click();
    await expect(page.getByRole("option", { name: "Collection order", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "Release Date +", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "TMDB Rating +", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: /^(Rating [+-]|Recently |Added First|Added Oldest|Modified First|Re-[Ww]atched|Redo|Playtime|Your rating|Date added)/ })).toHaveCount(0);
    await page.getByRole("option", { name: "Title Z-A", exact: true }).click();
    await expect(table.getByRole("row").nth(1)).toContainText(browseGem);
    await expect(table.getByRole("row").nth(1)).toContainText("#30");

    await signIn(page, "stranger");
    await page.goto(`/lists/collections/${publicCollection.id}`);
    await expect(results.getByText("30 titles", { exact: true })).toBeVisible();
    await expect(controls.getByRole("combobox", { name: "Filter by status", exact: true })).toHaveCount(0);
    await expect(controls.getByRole("button", { name: "Filters", exact: true })).toHaveCount(0);
    const library = controls.getByRole("combobox", { name: "Filter by library", exact: true });
    await library.click();
    await page.getByRole("option", { name: "In my list", exact: true }).click();
    await expect(results.getByText("2 titles", { exact: true })).toBeVisible();
    await expect(controls.getByRole("combobox", { name: "Filter by status", exact: true })).toBeVisible();
    await expect(controls.getByRole("button", { name: "Filters", exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    const filters = page.getByRole("dialog", { name: "Additional filters", exact: true });
    const movieFilters = filters.getByRole("group", { name: "Movies", exact: true });
    await movieFilters.getByRole("searchbox", { name: "Actors", exact: true }).fill("Shared browse actr");
    await movieFilters.getByRole("button", { name: browseActor, exact: true }).click();
    await movieFilters.getByRole("searchbox", { name: "Directors", exact: true }).fill(browseDirector);
    await movieFilters.getByRole("button", { name: browseDirector, exact: true }).click();
    await expect(movieFilters.getByRole("searchbox", { name: "Authors", exact: true })).toHaveCount(0);
    await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
    await expect(results.getByText("2 titles", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.searchParams.get("mediaFilters")?.includes(browseActor) === true
        && url.searchParams.get("mediaFilters")?.includes(browseDirector) === true);
    await page.reload();
    await expect(results.getByText("2 titles", { exact: true })).toBeVisible();
    await results.getByRole("button", { name: `Remove Movies · Actors: ${browseActor}`, exact: true }).click();
    await results.getByRole("button", { name: `Remove Movies · Directors: ${browseDirector}`, exact: true }).click();
    await expect(page).toHaveURL(url => !url.searchParams.get("mediaFilters")?.includes(browseActor)
        && !url.searchParams.get("mediaFilters")?.includes(browseDirector));
    await expect(results.getByRole("button", { name: /^Remove Movies · (Actors|Directors):/ })).toHaveCount(0);
    await controls.getByRole("button", { name: "Table view", exact: true }).click();
    await expect(table.getByText(browseGem, { exact: true })).toBeVisible();
    await expect(table.getByText("#30", { exact: true })).toBeVisible();
    await table.getByRole("button", { name: "View comment", exact: true }).click();
    await expect(page.getByText(browseNote, { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await sort.click();
    await expect(page.getByRole("option", { name: "Rating +", exact: true })).toBeVisible();
    await page.getByRole("option", { name: "Title Z-A", exact: true }).click();
    await expect(table.getByRole("row").nth(1)).toContainText(browseGem);
    await expect(table.getByRole("row").nth(1)).toContainText("9");
    await library.click();
    await page.getByRole("option", { name: "Not in my list", exact: true }).click();
    await expect(results.getByText("28 titles", { exact: true })).toBeVisible();
    await expect(table.getByText(browseGem, { exact: true })).toHaveCount(0);
    await expect(table.getByRole("row").nth(1)).toContainText(browseMovies[27].name);
    await search.fill("Catalogue");
    await expect(results.getByText("28 titles", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.searchParams.get("search") === "Catalogue");
    await page.getByRole("button", { name: "Go to page 2", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("page") === "2" && url.searchParams.get("library") === "out" && url.searchParams.get("search") === "Catalogue" && url.searchParams.get("sorting") === "title_desc" && url.searchParams.get("display") === "table");
    await expect(table.getByRole("row").nth(1)).toContainText(browseMovies[3].name);
    await results.getByRole("button", { name: "Reset filters", exact: true }).click();
    await expect(search).toHaveValue("");
    await expect(results.getByText("30 titles", { exact: true })).toBeVisible();
    await expect(library).toContainText("All titles");
    await expect(sort).toContainText("Collection order");
    await expect(table.getByRole("row").nth(1)).toContainText(browseMovies[0].name);
    await expect(table.getByRole("row").nth(1)).toContainText("#1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await library.click();
    await page.getByRole("option", { name: "In my list", exact: true }).click();
    await sort.click();
    await page.getByRole("option", { name: "Rating +", exact: true }).click();
    await expect(table.getByRole("row").nth(1)).toContainText(browseGem);
    await library.click();
    await page.getByRole("option", { name: "Not in my list", exact: true }).click();
    await expect(sort).toContainText("Collection order");
    await expect(page).toHaveURL(url => !url.searchParams.has("sorting"));
    await expect(controls.getByRole("combobox", { name: "Filter by status", exact: true })).toHaveCount(0);
    await expect(controls.getByRole("button", { name: "Filters", exact: true })).toHaveCount(0);
});


test("creates, ranks, annotates and copies a collection across every media type with same-ID titles", async ({ page, baseURL }) => {
    await runBun(["src/routes/_main/_viewer/lists/collections/-mixed.fixtures.ts"]);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/lists/collections/create");
    await expect(page.getByRole("heading", { name: "Create a collection", exact: true })).toBeVisible();
    const form = page.locator("form");
    const type = form.getByRole("combobox", { name: "Search media type", exact: true });
    await expect(type).toBeVisible();
    await expect(form.getByRole("textbox", { name: "Title", exact: true })).toBeVisible();

    // Stub external search results only. Resolution and collection writes use the real seeded database.
    const searchUrl = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/search.ts";
        const { getSearchResults } = await import(modulePath);
        return getSearchResults.url as string;
    });
    await page.route(`${new URL(searchUrl, baseURL).href}**`, route => route.fulfill({
        json: {
            context: {},
            result: {
                hasNextPage: false,
                data: mixedMedia.map(item => ({
                    id: item.apiId, name: item.name, itemType: item.mediaType,
                    image: `/static/${item.mediaType}-covers/default.jpg`, date: "2020-01-01",
                })),
            },
        },
    }));

    for (const item of mixedMedia) {
        await type.click();
        await page.getByRole("option", { name: new RegExp(`^${item.mediaType}$`, "i") }).click();
        await form.getByRole("searchbox", { name: `Search ${item.mediaType} to add`, exact: true }).fill("Mixed");
        await expect(page.getByRole("button", { name: /^Add Mixed/ })).toHaveCount(1);
        await page.getByRole("button", { name: `Add ${item.name}`, exact: true }).click();
        await expect(form.getByRole("button", { name: `Remove ${item.name}`, exact: true })).toBeVisible();
    }
    await expect(form.getByText("6 media", { exact: true })).toBeVisible();
    const duplicate = mixedMedia.at(-1)!;
    await form.getByRole("searchbox", { name: `Search ${duplicate.mediaType} to add`, exact: true }).fill("Mixed");
    await page.getByRole("button", { name: `Add ${duplicate.name}`, exact: true }).click();
    await expect(page.getByText("That media is already in your collection.", { exact: true })).toBeVisible();
    await expect(form.getByText("6 media", { exact: true })).toBeVisible();

    const title = "Every medium together";
    const note = "The adaptation belongs beside its source.";
    await form.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await form.getByRole("radio", { name: "Public", exact: true }).check();
    await form.getByRole("switch", { name: "Ranked list", exact: true }).check();
    await form.getByRole("textbox", { name: `Annotation for ${mixedMedia[1].name}`, exact: true }).fill(note);
    await form.getByRole("button", { name: `Move ${mixedMedia[1].name} up`, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await form.getByRole("button", { name: "Create collection", exact: true }).click();
    await expect(page).toHaveURL(/\/lists\/collections\/\d+$/);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    const collectionId = Number(new URL(page.url()).pathname.split("/").at(-1));
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    await controls.getByRole("button", { name: "Table view", exact: true }).click();
    const table = page.getByRole("table", { name: "Media results", exact: true });
    await expect(table.locator("img")).toHaveCount(0);
    await expect(table.getByRole("row").nth(1)).toContainText(mixedMedia[1].name);
    await expect(table.getByRole("row").nth(1)).toContainText("#1");
    const saved = await page.evaluate(async collectionId => {
        const modulePath = "/src/lib/server/functions/collections.ts";
        const { getReadCollectionDetails } = await import(modulePath);
        return getReadCollectionDetails({ data: { collectionId } });
    }, collectionId);
    expect(saved.total).toBe(6);
    expect(saved.items.map((item: { mediaType: string; mediaId: number }) => [item.mediaType, item.mediaId])).toEqual([
        [mixedMedia[1].mediaType, 501], [mixedMedia[0].mediaType, 501],
        ...mixedMedia.slice(2).map(item => [item.mediaType, 501]),
    ]);
    expect(saved.items[0].annotation).toBe(note);

    await page.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(page).toHaveURL(/\/lists\/collections\/\d+\/edit$/);
    await expect(form.getByRole("textbox", { name: "Title", exact: true })).toHaveValue(`Copy of ${title}`);
    await expect(form.getByRole("radio", { name: "Only Me", exact: true })).toBeChecked();
    await expect(form.getByRole("textbox", { name: `Annotation for ${mixedMedia[1].name}`, exact: true })).toHaveValue(note);
    const book = mixedMedia.find(item => item.mediaType === "books")!;
    const movie = mixedMedia.find(item => item.mediaType === "movies")!;
    await form.getByRole("button", { name: `Remove ${book.name}`, exact: true }).click();
    await expect(form.getByRole("button", { name: `Remove ${mixedMedia[0].name}`, exact: true })).toBeVisible();
    const copiedId = Number(new URL(page.url()).pathname.split("/").at(-2));
    await form.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByText("Collection updated successfully!", { exact: true })).toBeVisible();
    await page.goto(`/lists/collections/${copiedId}`);
    await expect(page.getByRole("link", { name: `View ${mixedMedia[0].name}`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `View ${book.name}`, exact: true })).toHaveCount(0);

    await page.goto(`/details/books/${book.id}`);
    await expect(page.getByRole("heading", { name: book.name, exact: true })).toBeVisible();
    const copyLink = page.getByRole("link", { name: new RegExp(`^Copy of ${title}`) });
    await expect(copyLink).toHaveCount(0);
    await page.getByRole("button", { name: "Manage", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Manage Collections", exact: true });
    const checkbox = dialog.getByRole("checkbox", { name: new RegExp(`^Copy of ${title}`) });
    await expect(checkbox).not.toBeChecked();
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(copyLink).toBeVisible();
    await page.getByRole("button", { name: "Manage", exact: true }).click();
    await expect(checkbox).toBeChecked();
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(copyLink).toHaveCount(0);
    await page.goto(`/lists/collections/${copiedId}`);
    await expect(page.getByRole("link", { name: `View ${movie.name}`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `View ${book.name}`, exact: true })).toHaveCount(0);
    await page.goto(`/lists/collections/${collectionId}`);
    await expect(page.getByRole("link", { name: `View ${book.name}`, exact: true })).toBeVisible();
});


test("browses mixed types with scoped sorting, clears type-specific sorts and joins viewer membership by type", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/collections/-mixed.fixtures.ts"]);
    await page.goto(`/lists/collections/${mixedCollection.id}`);
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    const results = page.getByRole("group", { name: "Browsing results and filters", exact: true });
    const type = controls.getByRole("combobox", { name: "Filter by media type", exact: true });
    const sort = controls.getByRole("combobox", { name: "Sort collection titles", exact: true });
    await expect(results.getByText("6 titles", { exact: true })).toBeVisible();
    await type.click();
    for (const item of mixedMedia) {
        await expect(page.getByRole("option", { name: new RegExp(`^${item.mediaType}$`, "i") })).toBeVisible();
    }
    await page.getByRole("option", { name: /^books$/i }).click();
    await expect(results.getByText("1 title", { exact: true })).toBeVisible();
    await sort.click();
    await expect(page.getByRole("option", { name: "Pages +", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "TMDB Rating +", exact: true })).toHaveCount(0);
    await page.getByRole("option", { name: "Pages +", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("sorting") === "pages_highest");
    await results.getByRole("button", { name: "Remove books", exact: true }).click();
    await expect(results.getByText("6 titles", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => !url.searchParams.has("mediaType") && !url.searchParams.has("sorting"));
    await sort.click();
    await expect(page.getByRole("option", { name: "Collection order", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "Pages +", exact: true })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "TMDB Rating +", exact: true })).toHaveCount(0);
    await page.getByRole("option", { name: "Collection order", exact: true }).click();
    await type.click();
    await page.getByRole("option", { name: /^movies$/i }).click();
    await sort.click();
    await page.getByRole("option", { name: "TMDB Rating +", exact: true }).click();
    await expect(results.getByText("1 title", { exact: true })).toBeVisible();
    await type.click();
    await page.getByRole("option", { name: "All types", exact: true }).click();
    await expect(sort).toContainText("Collection order");

    await signIn(page, "stranger");
    await page.goto(`/lists/collections/${mixedCollection.id}`);
    const library = controls.getByRole("combobox", { name: "Filter by library", exact: true });
    await library.click();
    await page.getByRole("option", { name: "In my list", exact: true }).click();
    await expect(results.getByText("1 title", { exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Table view", exact: true }).click();
    const table = page.getByRole("table", { name: "Media results", exact: true });
    await expect(table.getByText("Mixed books sentinel", { exact: true })).toBeVisible();
    await expect(table.getByText("Mixed movies sentinel", { exact: true })).toHaveCount(0);
    await expect(table.getByRole("row").nth(1)).toContainText("9");
    await expect(table.locator("img")).toHaveCount(0);
    await table.getByRole("button", { name: "Edit Mixed books sentinel", exact: true }).click();
    const bookEditor = page.getByRole("dialog", { name: "Mixed books sentinel", exact: true });
    await bookEditor.getByRole("button", { name: "Add to favorites", exact: true }).click();
    await expect(bookEditor.getByRole("button", { name: "Remove from favorites", exact: true })).toBeEnabled();
    await bookEditor.getByRole("button", { name: "Close", exact: true }).click();
    await expect(table.getByRole("row").nth(1)).toContainText("Completed");
    await library.click();
    await page.getByRole("option", { name: "Not in my list", exact: true }).click();
    await expect(results.getByText("5 titles", { exact: true })).toBeVisible();
    await expect(table.getByText("Mixed movies sentinel", { exact: true })).toBeVisible();
    await expect(table.getByText("Mixed books sentinel", { exact: true })).toHaveCount(0);
    const movieRow = table.getByRole("row").filter({ has: page.getByRole("link", { name: "Mixed movies sentinel", exact: true }) });
    await expect(movieRow).toContainText("Not in list");
    await movieRow.getByRole("button", { name: "Add media to list", exact: true }).click();
    await page.getByRole("button", { name: "Plan to Watch", exact: true }).click();
    await expect(results.getByText("4 titles", { exact: true })).toBeVisible();
    await expect(movieRow).toHaveCount(0);
    await page.keyboard.press("Escape");
    await library.click();
    await page.getByRole("option", { name: "In my list", exact: true }).click();
    await expect(results.getByText("2 titles", { exact: true })).toBeVisible();
    await expect(table.getByRole("row").filter({ has: page.getByRole("link", { name: "Mixed books sentinel", exact: true }) })).toContainText("9");
    await expect(movieRow).toContainText("Plan to Watch");
    await expect(movieRow.getByRole("button", { name: "Edit Mixed movies sentinel", exact: true })).toBeVisible();
    await table.getByRole("button", { name: "Edit Mixed books sentinel", exact: true }).click();
    await expect(bookEditor.getByRole("button", { name: "Remove from favorites", exact: true })).toBeVisible();
    await bookEditor.getByRole("button", { name: "Close", exact: true }).click();
    await library.click();
    await page.getByRole("option", { name: "All titles", exact: true }).click();
    await controls.getByRole("button", { name: "Grid view", exact: true }).click();
    await page.setViewportSize({ width: 1366, height: 900 });
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(6);
    const columns = await cards.first().evaluate(card => getComputedStyle(card.parentElement!).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(5);
    const movieCard = cards.filter({ has: page.getByRole("link", { name: "View Mixed movies sentinel", exact: true }) });
    const bookCard = cards.filter({ has: page.getByRole("link", { name: "View Mixed books sentinel", exact: true }) });
    await expect(movieCard.getByRole("button", { name: "Edit Mixed movies sentinel", exact: true })).toBeVisible();
    await expect(bookCard.getByRole("button", { name: "Edit Mixed books sentinel", exact: true })).toBeVisible();
    await expect(cards.filter({ has: page.getByRole("link", { name: "View Mixed series sentinel", exact: true }) }).getByRole("button", { name: "Add media to list", exact: true })).toBeVisible();
});
