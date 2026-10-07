import {publicCollection} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";
import {browseGem, browseMovies, browseNote} from "./-browse.data";
import {mixedCollection, mixedMedia} from "./-mixed.data";


test("browses a ranked collection with shared sorting, preserves notes and tailors guest and viewer controls", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/collections/-browse.fixtures.ts"]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/collections/${publicCollection.id}`);
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
    await page.goto(`/collections/${publicCollection.id}`);
    await expect(results.getByText("30 titles", { exact: true })).toBeVisible();
    await expect(controls.getByRole("combobox", { name: "Filter by status", exact: true })).toHaveCount(0);
    await expect(controls.getByRole("button", { name: "Filters", exact: true })).toHaveCount(0);
    const library = controls.getByRole("combobox", { name: "Filter by library", exact: true });
    await library.click();
    await page.getByRole("option", { name: "In my list", exact: true }).click();
    await expect(results.getByText("2 titles", { exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Table view", exact: true }).click();
    await expect(table.getByText(browseGem, { exact: true })).toBeVisible();
    await expect(table.getByText("#30", { exact: true })).toBeVisible();
    await table.getByRole("button", { name: "View comment", exact: true }).click();
    await expect(page.getByText(browseNote, { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await sort.click();
    await expect(page.getByRole("option", { name: /^(Rating [+-]|Recently |Added First|Added Oldest|Modified First|Re-[Ww]atched|Redo|Playtime|Your rating|Date added)/ })).toHaveCount(0);
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
});


test("creates, ranks, annotates and copies a collection across every media type with same-ID titles", async ({ page, baseURL }) => {
    await runBun(["src/routes/_main/_viewer/collections/-mixed.fixtures.ts"]);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/collections/create");
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
    await expect(page).toHaveURL(/\/collections\/\d+$/);
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
    await expect(page).toHaveURL(/\/collections\/\d+\/edit$/);
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
    await page.goto(`/collections/${copiedId}`);
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
    await page.goto(`/collections/${copiedId}`);
    await expect(page.getByRole("link", { name: `View ${movie.name}`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `View ${book.name}`, exact: true })).toHaveCount(0);
    await page.goto(`/collections/${collectionId}`);
    await expect(page.getByRole("link", { name: `View ${book.name}`, exact: true })).toBeVisible();
});


test("browses mixed types with scoped sorting, clears type-specific sorts and joins viewer membership by type", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/collections/-mixed.fixtures.ts"]);
    await page.goto(`/collections/${mixedCollection.id}`);
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
    await page.goto(`/collections/${mixedCollection.id}`);
    const library = controls.getByRole("combobox", { name: "Filter by library", exact: true });
    await library.click();
    await page.getByRole("option", { name: "In my list", exact: true }).click();
    await expect(results.getByText("1 title", { exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Table view", exact: true }).click();
    const table = page.getByRole("table", { name: "Media results", exact: true });
    await expect(table.getByText("Mixed books sentinel", { exact: true })).toBeVisible();
    await expect(table.getByText("Mixed movies sentinel", { exact: true })).toHaveCount(0);
    await expect(table.getByRole("row").nth(1)).toContainText("9");
    await library.click();
    await page.getByRole("option", { name: "Not in my list", exact: true }).click();
    await expect(results.getByText("5 titles", { exact: true })).toBeVisible();
    await expect(table.getByText("Mixed movies sentinel", { exact: true })).toBeVisible();
    await expect(table.getByText("Mixed books sentinel", { exact: true })).toHaveCount(0);
});
