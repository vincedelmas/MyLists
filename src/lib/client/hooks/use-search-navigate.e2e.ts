import {expect, signIn, test} from "../../../../scripts/e2e/fixtures";


test("debounces typing and cancels pending search when the input is cleared", async ({ page }) => {
    await signIn(page);
    await page.goto("/collections/discover?mediaType=movies&page=2");
    const input = page.getByRole("searchbox", { name: "Search community collections", exact: true });
    await input.fill("First");
    await input.fill("Final search");
    await expect(page).toHaveURL(/search=Final/);
    expect(new URL(page.url()).searchParams.get("search")).toBe("Final search");
    expect(new URL(page.url()).searchParams.get("mediaType")).toBe("movies");
    expect(new URL(page.url()).searchParams.get("page")).toBe("1");

    await input.fill("Pending text");
    await input.fill("");
    // Wait beyond the debounce to prove the cancelled text does not come back.
    await page.waitForTimeout(600);
    await expect(input).toHaveValue("");
    await expect(page).not.toHaveURL(/search=/);
});


test("preserves newer typing and clearing while an older search request is in flight", async ({ page, baseURL }) => {
    await signIn(page);
    await page.goto("/collections/discover");
    const input = page.getByRole("searchbox", { name: "Search community collections", exact: true });
    await expect(input).toBeVisible();
    const searchUrl = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/collections.ts";
        const { getCommunityCollections } = await import(modulePath);
        return getCommunityCollections.url as string;
    });

    for (const clear of [false, true]) {
        let release!: () => void;
        let started!: () => void;
        const blocked = new Promise<void>(resolve => { release = resolve; });
        const requested = new Promise<void>(resolve => { started = resolve; });
        await page.route(`${new URL(searchUrl, baseURL).href}**`, async route => {
            started();
            await blocked;
            await route.continue();
        }, { times: 1 });

        await input.fill(clear ? "Stale search" : "Earlier search");
        await requested;
        const latest = clear ? "" : "Latest search";
        await input.fill(latest);
        release();
        await expect(input).toHaveValue(latest);
        if (clear) {
            await expect(page).not.toHaveURL(/search=/);
        }
        else {
            await expect(page).toHaveURL(/search=Latest/);
        }
        await page.waitForTimeout(600);
        await expect(input).toHaveValue(latest);
        expect(new URL(page.url()).searchParams.get("search") ?? "").toBe(latest);
    }
});


test("resets both list paginations and restores search after browser back navigation", async ({ page }) => {
    await signIn(page);
    await page.goto("/lists/e2eowner?dynamicPage=3&page=2&mediaType=movies");
    const input = page.getByRole("searchbox", { name: "Search lists & collections", exact: true });
    await input.fill("My favorites");
    await expect(page).toHaveURL(/search=My/);
    const url = new URL(page.url());
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("dynamicPage")).toBe("1");
    expect(url.searchParams.get("mediaType")).toBe("movies");

    await page.getByRole("link", { name: "Feature voting", exact: true }).click();
    await expect(page).toHaveURL(/\/features-vote/);
    await page.goBack();
    await expect(input).toHaveValue("My favorites");
});
