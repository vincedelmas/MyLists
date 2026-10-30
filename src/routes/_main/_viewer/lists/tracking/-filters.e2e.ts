import {users} from "../../../../../../scripts/e2e/data";
import {expect, signIn, test} from "../../../../../../scripts/e2e/fixtures";


test("keeps the filter sheet open until its navigation finishes", async ({page, baseURL}) => {
    await signIn(page);
    await page.goto(`/lists/tracking/movies/${users.owner.name}?filtersTab=tags`);
    const sheet = page.getByRole("dialog", {name: "Additional Filters", exact: true});
    await sheet.getByRole("tab", {name: "Filters", exact: true}).click();
    await sheet.getByRole("checkbox", {name: "Favorites", exact: true}).click();
    const path = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/media-lists.ts";
        return (await import(modulePath)).getMediaListSF.url as string;
    });
    const gate = Promise.withResolvers<void>();
    await page.route(`${new URL(path, baseURL).href}**`, async route => {
        await gate.promise;
        await route.continue();
    });
    try {
        await sheet.getByRole("button", {name: "Apply Filters", exact: true}).click();
        const applying = sheet.getByRole("button", {name: "Apply Filters", exact: true});
        await expect(sheet).toBeVisible();
        await expect(applying).toBeDisabled();
        await expect(applying.locator('[data-slot="spinner"]')).toBeVisible();
        gate.resolve();
        await expect(sheet).not.toBeVisible();
        await expect(page).toHaveURL(/favorite=true/);
    }
    finally { gate.resolve(); }
});
