import {movies} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("shows a loading state while returning to the Which Came First menu", async ({page, baseURL}) => {
    await runBun(["--eval", `
        if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use isolated fixtures.");
        const {db} = await import("./src/lib/server/database/db");
        const {eq} = await import("drizzle-orm");
        const {movies, whichCameFirstMedia} = await import("./src/lib/server/database/schema");
        db.update(movies).set({releaseDate: "2000-01-01"}).where(eq(movies.id, 103)).run();
        db.delete(whichCameFirstMedia).run();
        db.insert(whichCameFirstMedia).values([{mediaId: 101, mediaType: "movies", releaseDate: "2020-01-01"}, {mediaId: 103, mediaType: "movies", releaseDate: "2000-01-01"}]).run();
    `]);
    await signIn(page);
    await page.goto("/which-came-first");
    await page.getByRole("button", {name: "Clear", exact: true}).click();
    await page.getByRole("button", {name: "Add movies", exact: true}).click();
    await page.getByRole("button", {name: "Start the run", exact: true}).click();
    await page.getByRole("button", {name: new RegExp(movies.editable.name)}).click();
    const menu = page.getByRole("button", {name: "Main menu", exact: true});
    await expect(menu).toBeVisible();
    const path = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/which-came-first.ts";
        return (await import(modulePath)).getWhichCameFirstGame.url as string;
    });
    const gate = Promise.withResolvers<void>();
    let fail = true;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route(`${new URL(path, baseURL).href}**`, async route => {
        if (fail) { fail = false; await route.abort(); return; }
        await gate.promise;
        await route.continue();
    });
    try {
        await menu.click();
        await expect(page.getByRole("region", {name: "Notifications", exact: true})
            .getByText("Could not load the main menu. Please try again.", {exact: true})).toBeVisible();
        await expect(menu).toBeEnabled();
        await menu.click();
        await expect(menu).toBeDisabled();
        await expect(menu.locator('[data-slot="spinner"]')).toBeVisible();
        await expect(page.getByRole("button", {name: "Play again", exact: true})).toBeDisabled();
        gate.resolve();
        await expect(page.getByRole("button", {name: "Start the run", exact: true})).toBeVisible();
        expect(errors).toEqual([]);
    }
    finally { gate.resolve(); }
});
