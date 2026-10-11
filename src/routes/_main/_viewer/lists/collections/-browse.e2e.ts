import {expect, runBun, signIn, test} from "../../../../../../scripts/e2e/fixtures";
import {mixedMedia} from "./-mixed.data";


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
    const annotation = form.getByRole("textbox", { name: `Annotation for ${mixedMedia[1].name}`, exact: true });
    await annotation.fill("x".repeat(501));
    await form.getByRole("button", { name: "Create collection", exact: true }).click();
    await expect(annotation).toHaveAttribute("aria-invalid", "true");
    await expect(annotation.locator("..").getByText(/500/)).toBeVisible();
    await annotation.fill(note);
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
