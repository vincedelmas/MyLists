import {movies} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("shows pending feedback for Skip and Submit guess", async ({page, baseURL}) => {
    await runBun(["--eval", `
        if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use isolated fixtures.");
        const {mkdir} = await import("node:fs/promises");
        const {join} = await import("node:path");
        const {eq} = await import("drizzle-orm");
        const {db} = await import("./src/lib/server/database/db");
        const {dailyMediadle, movies} = await import("./src/lib/server/database/schema");
        const {serverEnv} = await import("./src/env/server");
        const dir = join(process.env.BASE_UPLOADS_LOCATION, "movies-covers");
        await mkdir(dir, {recursive: true});
        await Bun.write(join(dir, "poster.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"));
        db.update(movies).set({imageCover: process.env.VITE_BASE_URL + "/" + serverEnv.UPLOADS_DIR_NAME + "/movies-covers/poster.png"}).where(eq(movies.id, 101)).run();
        db.delete(dailyMediadle).run();
        db.insert(dailyMediadle).values({id: 1, mediaType: "movies", mediaId: 101, date: new Date().toISOString().slice(0, 10)}).run();
    `]);
    await signIn(page);
    await page.goto("/moviedle");
    const path = await page.evaluate(async () => {
        const modulePath = "/src/lib/server/functions/moviedle.ts";
        return (await import(modulePath)).postAddMediadleGuess.url as string;
    });
    let gate = Promise.withResolvers<void>();
    await page.route(`${new URL(path, baseURL).href}**`, async route => {
        const response = await route.fetch();
        await gate.promise;
        await route.fulfill({response});
    });
    try {
        const skip = page.getByRole("button", {name: "Skip", exact: true});
        const submit = page.getByRole("button", {name: "Submit guess", exact: true});
        await skip.click();
        await expect(skip).toBeDisabled();
        await expect(skip.locator('[data-slot="spinner"]')).toBeVisible();
        await expect(submit.locator('[data-slot="spinner"]')).toHaveCount(0);
        gate.resolve();
        await expect(skip).toBeEnabled();
        await page.getByRole("combobox", {name: "Search for a film", exact: true}).fill(movies.editable.name);
        await page.getByRole("option", {name: movies.editable.name, exact: true}).click();
        gate = Promise.withResolvers<void>();
        await submit.click();
        await expect(submit).toBeDisabled();
        await expect(submit.locator('[data-slot="spinner"]')).toBeVisible();
        await expect(skip.locator('[data-slot="spinner"]')).toHaveCount(0);
        gate.resolve();
        await expect(page.getByRole("heading", {name: "That's a wrap!", exact: true})).toBeVisible();
    }
    finally { gate.resolve(); }
});
