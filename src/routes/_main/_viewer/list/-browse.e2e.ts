import {users} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";
import {browseFilterGenres, browseGem} from "../collections/-browse.data";


test("keeps normal list search, status, sorting and advanced filters with the shared toolbar", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/collections/-browse.fixtures.ts", "seed-filters"]);
    await signIn(page);
    await page.goto(`/list/movies/${users.owner.name}`);
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    const results = page.getByRole("group", { name: "Browsing results and filters", exact: true });
    const search = page.getByRole("searchbox", { name: "Search this media list", exact: true });
    await controls.getByRole("combobox", { name: "Filter by status", exact: true }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await controls.getByRole("combobox", { name: "Sort media list", exact: true }).click();
    await page.getByRole("option", { name: "Title Z-A", exact: true }).click();
    await search.fill(browseGem);
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Table view", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("table").getByText(browseGem, { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.searchParams.get("view") === "list" && url.searchParams.get("search") === browseGem && url.searchParams.get("sorting") === "Title Z-A");
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    const filters = page.getByRole("dialog", { name: "Additional Filters", exact: true });
    const genres = filters.getByRole("group", { name: "Genres", exact: true });
    const lastGenre = genres.getByRole("checkbox", { name: browseFilterGenres.at(-1)!, exact: true });
    await expect(genres.getByRole("checkbox")).toHaveCount(14);
    await expect(lastGenre).toHaveCount(0);
    await genres.getByRole("checkbox", { name: browseFilterGenres[0], exact: true }).check();
    await genres.getByRole("button", { name: "More", exact: true }).click();
    await lastGenre.check();
    await genres.getByRole("button", { name: "Less", exact: true }).click();
    await expect(lastGenre).toHaveCount(0);
    await genres.getByRole("button", { name: "More", exact: true }).click();
    await expect(lastGenre).toBeChecked();
    await filters.getByRole("checkbox", { name: "Favorites", exact: true }).check();
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(filters).toHaveCount(0);
    await expect(page.getByRole("table").getByText(browseGem, { exact: true })).toBeVisible();
    await results.getByRole("button", { name: `Remove ${browseFilterGenres[0]} filter`, exact: true }).click();
    await expect(page).toHaveURL(url => !url.searchParams.get("genres")?.includes(browseFilterGenres[0])
        && Boolean(url.searchParams.get("genres")?.includes(browseFilterGenres.at(-1)!))
        && url.searchParams.has("favorite") && url.searchParams.get("search") === browseGem);
    await expect(controls.getByRole("combobox", { name: "Filter by status", exact: true })).toContainText("Completed");
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    await genres.getByRole("button", { name: "More", exact: true }).click();
    await expect(lastGenre).toBeChecked();
    await lastGenre.uncheck();
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(page).toHaveURL(url => !url.searchParams.has("genres") && url.searchParams.has("favorite")
        && url.searchParams.get("search") === browseGem && url.searchParams.get("sorting") === "Title Z-A"
        && url.searchParams.get("view") === "list");
    await expect(page.getByRole("table").getByText(browseGem, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear all", exact: true }).click();
    await expect(search).toHaveValue("");
    await controls.getByRole("button", { name: "Grid view", exact: true }).click();
    await search.fill(browseGem);
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
