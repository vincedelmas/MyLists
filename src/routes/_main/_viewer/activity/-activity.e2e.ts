import {users} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("browses sorted monthly and yearly activity in grid and table while preserving history and owner actions", async ({ page, browser, baseURL }) => {
    await runBun(["src/routes/_main/_viewer/activity/-fixtures.ts"]);
    await signIn(page);
    await page.goto(`/activity/${users.owner.name}?year=2026&month=6`);
    await expect(page.getByRole("article")).toHaveCount(2);
    await page.getByRole("button", { name: "Table view", exact: true }).click();
    const table = page.getByRole("table", { name: "Recorded activity" });
    await expect(table).toBeVisible();
    await expect(table.locator("img")).toHaveCount(0);
    await page.getByRole("combobox", { name: "Sort activity", exact: true }).click();
    await page.getByRole("option", { name: "Title A-Z", exact: true }).click();
    await expect(table.getByRole("link")).toHaveText(["Activity alpha book", "Activity beta movie"]);
    await page.getByRole("combobox", { name: "Sort activity", exact: true }).click();
    await page.getByRole("option", { name: "Most time", exact: true }).click();
    await expect(table.getByRole("link")).toHaveText(["Activity beta movie", "Activity alpha book"]);

    await table.getByRole("button", { name: "Edit Monthly Activity for Activity alpha book" }).click();
    await expect(page.getByRole("dialog", { name: "Edit Monthly Activity — Activity alpha book" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("searchbox", { name: "Search recorded activity" }).fill("alpha");
    await expect(table.getByRole("link")).toHaveText(["Activity alpha book"]);
    await expect(page.getByText(/Stats cover all visible media activity/)).toBeVisible();
    await page.getByRole("button", { name: "Reset filters", exact: true }).click();
    await expect(page.getByRole("searchbox", { name: "Search recorded activity" })).toHaveValue("");
    await expect(table.getByRole("link")).toHaveCount(2);
    await page.getByRole("combobox", { name: "Filter by activity kind", exact: true }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(table.getByRole("link")).toHaveText(["Activity beta movie"]);
    await page.getByRole("button", { name: "Remove activity kind filter", exact: true }).click();
    await expect(table.getByRole("link")).toHaveCount(2);

    await page.getByRole("navigation", { name: "Activity period", exact: true }).getByRole("button", { name: "2026", exact: true }).click();
    await expect(table.getByRole("link")).toHaveCount(2);
    await table.getByRole("button", { name: "View yearly activity for Activity alpha book" }).click();
    const history = page.getByRole("dialog", { name: "Activity alpha book activity" });
    await expect(history).toBeVisible();
    await history.getByRole("button", { name: /January 2026/ }).click();
    await expect(page).toHaveURL(url => JSON.parse(url.searchParams.get("month")!) === "1" && url.searchParams.get("display") === "table");
    await expect(table.getByRole("link")).toHaveText(["Activity alpha book"]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const visitor = await browser.newPage({ baseURL });
    try {
        await signIn(visitor, "follower");
        await visitor.goto(`/activity/${users.owner.name}?year=2026&month=6&display=table&sort=time_desc`);
        const publicTable = visitor.getByRole("table", { name: "Recorded activity" });
        await expect(publicTable.getByRole("link")).toHaveText(["Activity beta movie", "Activity alpha book"]);
        await expect(publicTable.getByRole("button", { name: /Edit Monthly Activity/ })).toHaveCount(0);
        await expect(visitor.getByRole("switch", { name: "Hidden only" })).toHaveCount(0);
    }
    finally {
        await visitor.close();
    }
});
