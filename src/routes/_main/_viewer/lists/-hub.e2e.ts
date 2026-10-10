import {expectListHeaderBack, listAction} from "../../../../../scripts/e2e/list-actions";
import {movies, privateCollection, users} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("keeps creation beside each section heading even when filters return no results", async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/lists/${users.owner.name}`);
    const dynamic = page.getByRole("region", { name: "Dynamic lists", exact: true });
    const collections = page.getByRole("region", { name: "Collections", exact: true });
    await expect(dynamic.getByText("No dynamic lists yet", { exact: true })).toBeVisible();
    await expect(dynamic.getByRole("link", { name: "Create dynamic list", exact: true })).toBeVisible();
    await expect(collections.getByRole("link", { name: "Create collection", exact: true })).toBeVisible();
    const title = await dynamic.getByRole("heading", { name: "Dynamic lists", exact: true }).boundingBox();
    const action = await dynamic.getByRole("link", { name: "Create dynamic list", exact: true }).boundingBox();
    expect(Math.abs(title!.y - action!.y)).toBeLessThan(16);
    await page.getByRole("searchbox", { name: "Search lists & collections", exact: true }).fill("No results for this name");
    await expect(dynamic.getByText("No matching dynamic lists", { exact: true })).toBeVisible();
    await expect(collections.getByText("No matching collections", { exact: true })).toBeVisible();
    await expect(dynamic.getByRole("link", { name: "Create dynamic list", exact: true })).toBeVisible();
    await expect(collections.getByRole("link", { name: "Create collection", exact: true })).toBeVisible();
    await expect(page.getByText("Nothing here yet", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("combobox", { name: "Filter by kind", exact: true }).click();
    await page.getByRole("option", { name: "Dynamic lists", exact: true }).click();
    await expect(collections).toHaveCount(0);
    await dynamic.getByRole("link", { name: "Create dynamic list", exact: true }).click();
    await expect(page).toHaveURL(/\/lists\/dynamic\/create$/);
    await expect(page.getByRole("form", { name: "Dynamic list editor", exact: true })).toBeVisible();
});


test("paginates dynamic lists independently and keeps help and filtering tied to active media types", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts"]);
    await runBun(["src/routes/_main/_viewer/lists/-fixtures.ts", "seed-dynamic-pagination"]);
    await signIn(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/lists/${users.owner.name}?search=Hub`);

    const dynamic = page.getByRole("region", { name: "Dynamic lists", exact: true });
    const collections = page.getByRole("region", { name: "Collections", exact: true });
    const dynamicCards = dynamic.getByRole("article");
    await expect(dynamicCards).toHaveCount(8);
    await expect(collections.getByRole("article")).toHaveCount(12);
    await expect(dynamic.getByRole("article", { name: "Hub dynamic 01", exact: true })).toHaveCount(0);
    const firstCard = await dynamicCards.nth(0).boundingBox();
    const secondCard = await dynamicCards.nth(1).boundingBox();
    expect(Math.abs(firstCard!.y - secondCard!.y)).toBeLessThan(1);
    expect(secondCard!.x).toBeGreaterThan(firstCard!.x + firstCard!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await dynamic.getByRole("button", { name: "About dynamic lists", exact: true }).click();
    await expect(page.getByText("What is a dynamic list?", { exact: true })).toBeVisible();
    await expect(page.getByText(/A dynamic list is a saved view of the media you track/)).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("combobox", { name: "Filter by media type", exact: true }).click();
    await expect(page.getByRole("option", { name: /^books$/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /^manga$/i })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await dynamic.getByRole("button", { name: "Go to page 2", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("dynamicPage") === "2" && url.searchParams.get("page") !== "2");
    await expect(dynamicCards).toHaveCount(2);
    await expect(dynamic.getByRole("article", { name: "Hub dynamic 01", exact: true })).toBeVisible();
    await expect(collections.getByRole("article")).toHaveCount(12);
    await collections.getByRole("button", { name: "Go to page 2", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("page") === "2" && url.searchParams.get("dynamicPage") === "2");
    await expect(collections.getByRole("article")).toHaveCount(2);
    await expect(dynamicCards).toHaveCount(2);
    await dynamic.getByRole("button", { name: "Go to page 1", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("page") === "2" && url.searchParams.get("dynamicPage") !== "2");
    await expect(dynamicCards).toHaveCount(8);
    await expect(collections.getByRole("article")).toHaveCount(2);
    await dynamic.getByRole("button", { name: "Go to page 2", exact: true }).click();

    await page.getByRole("combobox", { name: "Filter by media type", exact: true }).click();
    await page.getByRole("option", { name: /^books$/i }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("mediaType") === "books"
        && url.searchParams.get("page") !== "2" && url.searchParams.get("dynamicPage") !== "2");
    await expect(dynamicCards).toHaveCount(8);
    await expect(collections.getByRole("article")).toHaveCount(1);
    await dynamic.getByRole("button", { name: "Go to page 2", exact: true }).click();
    await page.getByRole("searchbox", { name: "Search lists & collections", exact: true }).fill("Hub dynamic 01");
    await expect(page).toHaveURL(url => url.searchParams.get("search") === "Hub dynamic 01"
        && url.searchParams.get("dynamicPage") !== "2" && url.searchParams.get("page") !== "2");
    await expect(dynamicCards).toHaveCount(1);
    await expect(dynamic.getByRole("article", { name: "Hub dynamic 01", exact: true })).toBeVisible();
    await expect(dynamic.getByRole("navigation", { name: "Pagination navigation", exact: true })).toHaveCount(0);

    await page.goto(`/lists/${users.owner.name}?search=Hub%20dynamic&dynamicPage=99`);
    await expect(dynamicCards).toHaveCount(2);
    await expect(dynamic.getByRole("button", { name: "Go to page 2", exact: true })).toHaveAttribute("aria-current", "page");
    for (const title of ["Hub dynamic 01", "Hub dynamic 02"]) {
        await (await listAction(page, "Delete dynamic list", dynamic.getByRole("article", { name: title, exact: true }))).click();
        await page.getByRole("alertdialog").getByRole("button", { name: "Delete list", exact: true }).click();
        await expect(dynamic.getByRole("article", { name: title, exact: true })).toHaveCount(0);
    }
    await expect(dynamicCards).toHaveCount(8);
    await expect(dynamic.getByRole("navigation", { name: "Pagination navigation", exact: true })).toHaveCount(0);
    await page.getByRole("searchbox", { name: "Search lists & collections", exact: true }).fill("");
    await expect(page).toHaveURL(url => !url.searchParams.has("search") && url.searchParams.get("dynamicPage") !== "99");
    await expect(dynamicCards).toHaveCount(8);
});


test("navigates from the profile hub to each list kind and paginates collections", async ({ page }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts"]);
    await runBun(["src/routes/_main/_viewer/lists/-fixtures.ts"]);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/profile/${users.owner.name}`);
    const portals = page.getByRole("navigation", { name: `Explore ${users.owner.name}'s profile`, exact: true });
    const hub = portals.getByRole("link", { name: /^Lists & collections/ });
    await expect(portals.getByRole("link")).toHaveCount(3);
    expect((await hub.boundingBox())!.y).toBeLessThan((await portals.getByRole("link", { name: /^Activity/ }).boundingBox())!.y);
    await hub.click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await expect(page.getByRole("heading", { name: "Lists & collections", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Movies list", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Series list", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Books list", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Manga list", exact: true })).toHaveCount(0);
    await expect(page.getByRole("article", { name: "Profile list 5", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.getByRole("link", { name: "Continue list", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/continue/${users.owner.name}`);
    await expect(page.getByRole("heading", { name: "Continue", exact: true })).toBeVisible();
    await expectListHeaderBack(page, "Continue");
    await page.getByRole("main").getByRole("link", { name: "Lists & collections", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await page.getByRole("link", { name: "Movies list", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/tracking/movies/${users.owner.name}`);
    await expect(page.getByRole("heading", { name: "Your Movies", exact: true })).toBeVisible();
    await expectListHeaderBack(page, "Your Movies");
    await expect(page.getByRole("main").getByRole("link", { name: "Dynamic lists", exact: true })).toHaveCount(0);
    await page.getByRole("group", { name: "Media browsing controls", exact: true }).getByRole("button", { name: "Filters", exact: true }).click();
    const filters = page.getByRole("dialog", { name: "Additional Filters", exact: true });
    await filters.getByRole("button", { name: "Tags", exact: true }).click();
    await expect(filters.getByRole("searchbox", { name: "Search tags", exact: true })).toBeVisible();
    await filters.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await page.getByRole("main").getByRole("link", { name: "Lists & collections", exact: true }).click();
    await page.getByRole("article", { name: "Profile list 1", exact: true }).getByRole("link", { name: "Profile list 1", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501");
    await expect(page.getByRole("heading", { name: "Profile list 1", exact: true })).toBeVisible();
    await expectListHeaderBack(page, "Profile list 1");
    await (await listAction(page, "Edit dynamic list")).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501/edit");
    await expectListHeaderBack(page, "Edit dynamic list");
    await page.getByRole("form", { name: "Dynamic list editor", exact: true }).getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/501");
    await page.getByRole("main").getByRole("link", { name: "Lists & collections", exact: true }).click();
    await page.getByRole("link", { name: "Create dynamic list", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/dynamic/create");
    await expectListHeaderBack(page, "Create a dynamic list");
    await expect(page.getByRole("form", { name: "Dynamic list editor", exact: true })).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Lists & collections", exact: true }).click();
    await page.getByRole("link", { name: "Create collection", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/collections/create");
    await expect(page.getByRole("heading", { name: "Create a collection", exact: true })).toBeVisible();
    await expectListHeaderBack(page, "Create a collection");
    await expect(page.getByRole("combobox", { name: "Search media type", exact: true })).toBeVisible();

    await page.getByRole("main").getByRole("link", { name: "Lists & collections", exact: true }).click();
    await page.getByRole("combobox", { name: "Filter by kind", exact: true }).click();
    await page.getByRole("option", { name: "Collections", exact: true }).click();
    await page.getByRole("searchbox", { name: "Search lists & collections", exact: true }).fill("Hub collection");
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}` && url.searchParams.get("kind") === "collections" && url.searchParams.get("search") === "Hub collection");
    const collections = page.getByRole("region", { name: "Collections", exact: true });
    await expect(collections.getByText("13 collections", { exact: true })).toBeVisible();
    await expect(collections.getByRole("link", { name: /^Open Hub collection/ })).toHaveCount(12);
    await expect(page.getByRole("link", { name: "Open Hub collection 13", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Go to page 2", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("page") === "2" && url.searchParams.get("search") === "Hub collection");
    await expect(page.getByRole("link", { name: "Open Hub collection 13", exact: true })).toBeVisible();
    const type = page.getByRole("combobox", { name: "Filter by media type", exact: true });
    await type.click();
    await page.getByRole("option", { name: /^books$/i }).click();
    await expect(collections.getByText("1 collections", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.searchParams.get("mediaType") === "books" && url.searchParams.get("page") !== "2");
    const mixed = collections.getByRole("article").filter({ has: page.getByRole("link", { name: "Open Hub collection 01", exact: true }) });
    await expect(mixed.getByText("2 media", { exact: true })).toBeVisible();
    await mixed.getByRole("link", { name: "Open Hub collection 01", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === "/lists/collections/701");
    await expect(page.getByRole("link", { name: `View ${movies.editable.name}`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View A long-awaited book", exact: true })).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Lists & collections", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await page.getByRole("searchbox", { name: "Search lists & collections", exact: true }).fill("Hub collection 01");
    await expect(page).toHaveURL(url => url.searchParams.get("search") === "Hub collection 01");
    await expect(mixed).toBeVisible();
    const deleteCollection = await listAction(page, "Delete collection", mixed);
    await expect(page).toHaveURL(url => url.searchParams.get("search") === "Hub collection 01");
    await deleteCollection.click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete collection", exact: true }).click();
    await expect(mixed).toHaveCount(0);
    await expect(page).toHaveURL(url => url.searchParams.get("search") === "Hub collection 01");
    await expect(page.getByText("No matching collections", { exact: true })).toBeVisible();
    await page.getByRole("searchbox", { name: "Search lists & collections", exact: true }).fill("Hub collection");
    await expect(collections.getByText("12 collections", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Go to page 2", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test("keeps public collections available while protecting hub tracking data and Continue", async ({ browser, baseURL }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts", "seed-shortcuts"]);
    await runBun(["src/routes/_main/_viewer/lists/-fixtures.ts"]);
    await runBun(["src/routes/_main/_viewer/lists/continue/-fixtures.ts"]);

    for (const account of [null, "stranger", "follower"] as const) {
        const visitor = await browser.newPage({ baseURL });
        try {
            if (account) await signIn(visitor, account);
            const response = await visitor.goto(`/lists/${users.owner.name}`);
            await expect(visitor.getByRole("heading", { name: "Lists & collections", exact: true })).toBeVisible();
            await expect(visitor.getByRole("link", { name: "Open Hub collection 01", exact: true })).toBeVisible();
            await expect(visitor.getByRole("link", { name: "Open Hub private collection", exact: true })).toHaveCount(0);
            await expect(visitor.getByRole("link", { name: `Open ${privateCollection.title}`, exact: true })).toHaveCount(0);
            await expect(visitor.getByRole("button", { name: /^Actions for Hub collection/ })).toHaveCount(0);
            await expect(visitor.getByRole("link", { name: "Create dynamic list", exact: true })).toHaveCount(0);
            await expect(visitor.getByRole("link", { name: "Create collection", exact: true })).toHaveCount(0);
            if (account === "follower") {
                await expect(visitor.getByRole("link", { name: "Movies list", exact: true })).toBeVisible();
                await expect(visitor.getByRole("article", { name: "Profile list 5", exact: true })).toBeVisible();
                await visitor.getByRole("link", { name: "Continue list", exact: true }).click();
                await expect(visitor.getByRole("heading", { name: "Continue", exact: true })).toBeVisible();
                await expect(visitor.getByRole("link", { name: "View Continue book", exact: true })).toBeVisible();
                await expect(visitor.getByRole("button", { name: /^\+ / })).toHaveCount(0);
                await expect(visitor.getByRole("button", { name: "Mark completed", exact: true })).toHaveCount(0);
            }
            else {
                await expect(visitor.getByText("Tracking lists are private", { exact: true })).toBeVisible();
                await expect(visitor.getByRole("link", { name: "Movies list", exact: true })).toHaveCount(0);
                await expect(visitor.getByRole("article", { name: "Profile list 5", exact: true })).toHaveCount(0);
                expect(await response!.text()).not.toContain("Profile list 5");
                expect(await response!.text()).not.toContain(movies.private.name);
                await visitor.goto(`/lists/continue/${users.owner.name}`);
                await expect(visitor.getByText("This content is private", { exact: true })).toBeVisible();
                await expect(visitor.getByRole("link", { name: "View Continue book", exact: true })).toHaveCount(0);
            }
            const restrictedResponse = await visitor.goto(`/lists/continue/${users.restricted.name}`);
            if (account) {
                await expect(visitor.getByRole("link", { name: "View Continue book", exact: true })).toBeVisible();
                await expect(visitor.getByRole("button", { name: /^\+ / })).toHaveCount(0);
            }
            else {
                await expect(visitor.getByText("This content is restricted", { exact: true })).toBeVisible();
                expect(await restrictedResponse!.text()).not.toContain("Continue book");
            }
        }
        finally {
            await visitor.context().close();
        }
    }
});
