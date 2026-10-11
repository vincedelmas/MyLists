import {users} from "../../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../../scripts/e2e/fixtures";
import {browseFilterGenres, browseGem} from "../collections/-browse.data";


test("opens tag management from a list deep link and creates the first empty tag", async ({ page }) => {
    await signIn(page);
    await page.goto(`/lists/tracking/movies/${users.owner.name}?filtersTab=tags`);
    const filters = page.getByRole("dialog", { name: "Additional Filters", exact: true });
    await expect(filters.getByRole("button", { name: "Tags", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(filters.getByText("No tags created yet.", { exact: true })).toBeVisible();
    await filters.getByRole("searchbox", { name: "Search tags", exact: true }).fill("First tag");
    await filters.getByRole("button", { name: "Create tag", exact: true }).click();
    await expect(filters.getByRole("button", { name: "First tag", exact: true })).toBeVisible();
    await expect(filters.getByRole("button", { name: "First tag", exact: true })).toHaveAttribute("title", "0 media");
    await expect(filters.locator("img")).toHaveCount(0);
    await filters.getByRole("button", { name: "Close", exact: true }).click();
    await expect(filters).toHaveCount(0);
    await expect(page).toHaveURL(url => !url.searchParams.has("filtersTab") && !url.searchParams.has("search"));

    await runBun(["src/routes/_main/_viewer/lists/collections/-browse.fixtures.ts", "seed-filters"]);
    await runBun(["src/routes/_main/_viewer/lists/tracking/-tags.fixtures.ts"]);
    const search = new URLSearchParams({
        filtersTab: "tags",
        search: browseGem,
        status: JSON.stringify(["Completed"]),
        favorite: "true",
        genres: JSON.stringify([browseFilterGenres[0]]),
    });
    await page.goto(`/lists/tracking/movies/${users.owner.name}?${search}`);
    await expect(filters.getByRole("button", { name: "Tags", exact: true })).toHaveAttribute("aria-pressed", "true");
    await filters.getByRole("button", { name: "rewatch", exact: true }).click();
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(filters).toHaveCount(0);
    await expect(page).toHaveURL(url => !url.searchParams.has("filtersTab")
        && url.searchParams.get("search") === browseGem
        && Boolean(url.searchParams.get("status")?.includes("Completed"))
        && url.searchParams.has("favorite")
        && Boolean(url.searchParams.get("genres")?.includes(browseFilterGenres[0]))
        && Boolean(url.searchParams.get("tags")?.includes("rewatch")));
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
});


test("keeps filter drafts across the Filters and Tags tabs without changing title search", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/collections/-browse.fixtures.ts", "seed-filters"]);
    await runBun(["src/routes/_main/_viewer/lists/tracking/-tags.fixtures.ts"]);
    await signIn(page);
    await page.goto(`/lists/tracking/movies/${users.owner.name}`);
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    const titleSearch = page.getByRole("searchbox", { name: "Search this media list", exact: true, includeHidden: true });
    await titleSearch.fill(browseGem);
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    const filters = page.getByRole("dialog", { name: "Additional Filters", exact: true });
    await expect(filters.getByRole("button", { name: "Filters", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(filters.getByRole("group", { name: "Tags", exact: true })).toHaveCount(0);
    await filters.getByRole("group", { name: "Genres", exact: true })
        .getByRole("checkbox", { name: browseFilterGenres[0], exact: true }).check();
    await filters.getByRole("checkbox", { name: "Favorites", exact: true }).check();
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    await filters.getByRole("button", { name: "rewatch", exact: true }).click();
    const tagSearch = filters.getByRole("searchbox", { name: "Search tags", exact: true });
    await tagSearch.fill("shelf");
    await filters.getByRole("button", { name: "shelf", exact: true }).click();
    await expect(filters.getByRole("button", { name: "rewatch", exact: true })).toHaveCount(0);
    await expect(titleSearch).toHaveValue(browseGem);
    await expect(page).toHaveURL(url => url.searchParams.get("search") === browseGem && !url.searchParams.has("tags"));
    await tagSearch.fill("");
    await filters.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(filters.getByRole("checkbox", { name: "Favorites", exact: true })).toBeChecked();
    await expect(filters.getByRole("group", { name: "Genres", exact: true })
        .getByRole("checkbox", { name: browseFilterGenres[0], exact: true })).toBeChecked();
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    await expect(filters.getByRole("button", { name: "rewatch", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(filters.getByRole("button", { name: "shelf", exact: true })).toHaveAttribute("aria-pressed", "true");
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(filters).toHaveCount(0);
    await expect(page).toHaveURL(url => url.searchParams.get("search") === browseGem
        && Boolean(url.searchParams.get("genres")?.includes(browseFilterGenres[0]))
        && url.searchParams.has("favorite")
        && Boolean(url.searchParams.get("tags")?.includes("rewatch"))
        && Boolean(url.searchParams.get("tags")?.includes("shelf")));
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
    const appliedUrl = page.url();
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    await expect(filters.getByRole("button", { name: "rewatch", exact: true })).toHaveAttribute("aria-pressed", "true");
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(filters).toHaveCount(0);
    await expect(page).toHaveURL(appliedUrl);
});


test("creates empty tags and renames or deletes an applied tag inside the filter sheet", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/collections/-browse.fixtures.ts", "seed-filters"]);
    await runBun(["src/routes/_main/_viewer/lists/tracking/-tags.fixtures.ts"]);
    await signIn(page);
    await page.goto(`/lists/tracking/movies/${users.owner.name}`);
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    const titleSearch = page.getByRole("searchbox", { name: "Search this media list", exact: true });
    await titleSearch.fill(browseGem);
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    const filters = page.getByRole("dialog", { name: "Additional Filters", exact: true });
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    const tagSearch = filters.getByRole("searchbox", { name: "Search tags", exact: true });
    await tagSearch.fill("   ");
    await expect(filters.getByRole("button", { name: "Create tag", exact: true })).toHaveCount(0);
    await tagSearch.fill("Browser empty tag");
    await filters.getByRole("button", { name: "Create tag", exact: true }).click();
    await expect(filters.getByRole("button", { name: "Browser empty tag", exact: true })).toBeVisible();
    await expect(filters.getByRole("button", { name: "Browser empty tag", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(filters.getByRole("button", { name: "Browser empty tag", exact: true })).toHaveAttribute("title", "0 media");
    await expect(filters.getByRole("button", { name: "Actions for Browser empty tag", exact: true })).toBeVisible();
    await tagSearch.fill("");
    await expect(filters.getByRole("button", { name: "rewatch", exact: true })).toHaveAttribute("title", "1 media");
    await filters.getByRole("button", { name: "rewatch", exact: true }).click();
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    const results = page.getByRole("group", { name: "Browsing results and filters", exact: true });
    await expect(results.getByRole("button", { name: "Remove rewatch filter", exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    await filters.getByRole("button", { name: "Actions for rewatch", exact: true }).click();
    await page.getByRole("menuitem", { name: "Rename rewatch", exact: true }).click();
    await filters.getByRole("textbox", { name: "New tag name", exact: true }).fill("rewatched");
    await filters.getByRole("button", { name: "Save tag name", exact: true }).click();
    await expect(filters.getByRole("button", { name: "rewatched", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(filters.getByRole("button", { name: "rewatch", exact: true })).toHaveCount(0);
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(results.getByRole("button", { name: "Remove rewatched filter", exact: true })).toBeVisible();
    await expect(results.getByRole("button", { name: "Remove rewatch filter", exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(url => url.searchParams.get("search") === browseGem
        && Boolean(url.searchParams.get("tags")?.includes("rewatched")));
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    await filters.getByRole("button", { name: "Actions for rewatched", exact: true }).click();
    await page.getByRole("menuitem", { name: "Delete rewatched", exact: true }).click();
    const confirm = page.getByRole("alertdialog", { name: 'Delete "rewatched"?', exact: true });
    await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(filters.getByRole("button", { name: "rewatched", exact: true })).toHaveAttribute("aria-pressed", "true");
    await filters.getByRole("button", { name: "Actions for rewatched", exact: true }).click();
    await page.getByRole("menuitem", { name: "Delete rewatched", exact: true }).click();
    await confirm.getByRole("button", { name: "Delete tag", exact: true }).click();
    await expect(filters.getByRole("button", { name: "rewatched", exact: true })).toHaveCount(0);
    await expect(filters).toBeVisible();
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("search") === browseGem && !url.searchParams.has("tags"));
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
    await page.reload();
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    await expect(filters.getByRole("button", { name: "Browser empty tag", exact: true })).toBeVisible();
    await expect(filters.getByRole("button", { name: "rewatched", exact: true })).toHaveCount(0);
});


test("profile visitors can search and filter tags without owner management controls", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/collections/-browse.fixtures.ts", "seed-filters"]);
    await runBun(["src/routes/_main/_viewer/lists/tracking/-tags.fixtures.ts", "public-owner"]);
    await signIn(page, "stranger");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/lists/tracking/movies/${users.owner.name}`);
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    await controls.getByRole("button", { name: "Filters", exact: true }).click();
    const filters = page.getByRole("dialog", { name: "Additional Filters", exact: true });
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    const tagSearch = filters.getByRole("searchbox", { name: "Search tags", exact: true });
    await tagSearch.fill("visitor cannot create");
    await expect(filters.getByRole("button", { name: "Create tag", exact: true })).toHaveCount(0);
    await tagSearch.fill("rewatch");
    await expect(filters.getByRole("button", { name: "rewatch", exact: true })).toBeVisible();
    await expect(filters.getByRole("button", { name: /^Rename / })).toHaveCount(0);
    await expect(filters.getByRole("button", { name: /^Delete / })).toHaveCount(0);
    await filters.getByRole("button", { name: "rewatch", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(page).toHaveURL(url => Boolean(url.searchParams.get("tags")?.includes("rewatch")));
    await expect(page.getByRole("link", { name: `View ${browseGem}`, exact: true })).toBeVisible();
});


test("browses over 100 tags without pagination and keeps selections visible during search", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/collections/-browse.fixtures.ts", "seed-filters"]);
    await runBun(["src/routes/_main/_viewer/lists/tracking/-tags.fixtures.ts", "many-tags"]);
    await signIn(page);
    await page.goto(`/lists/tracking/movies/${users.owner.name}?filtersTab=tags`);
    const filters = page.getByRole("dialog", { name: "Additional Filters", exact: true });
    const directory = filters.getByRole("region", { name: "Tags directory", exact: true });
    await expect(directory.getByRole("button", { name: "Shelf 100", exact: true })).toHaveCount(1);
    expect(await directory.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    await directory.getByRole("button", { name: "Shelf 100", exact: true }).click();
    const search = filters.getByRole("searchbox", { name: "Search tags", exact: true });
    await search.fill("rewacth");
    await expect(directory.getByRole("button", { name: "rewatch", exact: true })).toBeVisible();
    await directory.getByRole("button", { name: "rewatch", exact: true }).click();
    await expect(filters.getByRole("button", { name: "Remove Shelf 100 filter", exact: true })).toBeVisible();
    await filters.getByRole("button", { name: "Remove Shelf 100 filter", exact: true }).click();
    await search.fill("");
    await expect(directory.getByRole("button", { name: "Shelf 100", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await filters.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(page).toHaveURL(url => Boolean(url.searchParams.get("tags")?.includes("rewatch")) && !Boolean(url.searchParams.get("tags")?.includes("Shelf 100")));
});
