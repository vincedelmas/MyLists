import {expect, runBun, signIn, test} from "../../../../../../scripts/e2e/fixtures";


test("bounds Continue cards, loads another page, and keeps the profile preview at five", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/continue/-pagination.fixtures.ts"]);
    await signIn(page);
    await page.goto("/lists/continue/e2eowner");
    const cards = page.locator('main article[data-slot="media-card"]');
    await expect(cards).toHaveCount(12);
    await expect(page.getByText("25 titles", { exact: true })).toBeVisible();
    await expect(cards.first()).toContainText("Page game 01");
    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(cards).toHaveCount(12);
    await expect(cards.first()).toContainText("Page game 13");
    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("Page game 25");
    await page.locator('main a[href*="activeTab=games"]').click();
    await expect(page).toHaveURL(/page=1/);
    await expect(cards).toHaveCount(12);
    await expect(cards.first()).toContainText("Page game 01");
    await cards.first().getByRole("button", { name: "+ 60 min", exact: true }).click();
    await expect(cards.first()).toContainText("3h 0m played");
    await page.goto("/profile/e2eowner");
    await expect(page.getByRole("region", { name: "Continue", exact: true }).locator('article[data-slot="media-card"]')).toHaveCount(5);
});


test("paginates followers and follows instead of mounting every account", async ({ page }) => {
    await runBun(["src/routes/_main/_viewer/lists/continue/-pagination.fixtures.ts"]);
    await signIn(page);
    await page.goto("/profile/e2eowner/follows");
    const people = page.locator('main a[href^="/profile/pageperson"]');
    await expect(people).toHaveCount(24);
    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(people).toHaveCount(1);
    await expect(people.first()).toHaveText("pageperson25");
    await page.goto("/profile/e2eowner/followers");
    // The default fixture also contains one accepted follower.
    await expect(people).toHaveCount(23);
    await page.getByRole("button", { name: "Go to next page" }).click();
    await expect(people).toHaveCount(2);
});
