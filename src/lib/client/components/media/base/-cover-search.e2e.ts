import {readFileSync} from "node:fs";
import {expect, runBun, signIn, test} from "../../../../../../scripts/e2e/fixtures";


async function seedBook() {
    await runBun(["-e", `
        import Database from 'bun:sqlite';
        import {drizzle} from 'drizzle-orm/bun-sqlite';
        import {books, booksAuthors} from './src/lib/server/database/schema';
        const sqlite = new Database(process.env.DATABASE_URL);
        const db = drizzle(sqlite, {casing: 'snake_case'});
        db.insert(books).values({id: 501, name: 'Dune', apiId: 'cover-dune', pages: 400, imageCover: 'default.jpg'}).run();
        db.insert(booksAuthors).values({mediaId: 501, name: 'Frank Herbert'}).run();
        sqlite.close();
    `]);
}


test("opens a prepared Google search from a missing book cover without the extension", async ({ page }) => {
    await seedBook();
    await signIn(page);
    await page.context().route("https://www.google.com/**", route => route.fulfill({ body: "Image search" }));
    await page.goto("/details/books/501");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const opened = page.context().waitForEvent("page");
    await page.getByRole("button", { name: "Search Google Images" }).click();
    const search = await opened;
    await expect(search).toHaveURL(/google\.com\/search/);
    expect(new URL(search.url()).searchParams.get("q")).toBe("Dune Frank Herbert book cover");
    await search.close();
});


test("routes extension results to the open book dialog and edit form without reusing a closed dialog's search", async ({ page }) => {
    await seedBook();
    await signIn(page);
    await page.addInitScript(() => {
        const bridge = window as any;
        bridge.chrome = { runtime: {
            sendMessage: async (message: unknown) => {
                bridge.pickerSearch = message;
                return { ok: true };
            },
            onMessage: { addListener: (listener: unknown) => { bridge.receiveCover = listener; } },
        } };
    });
    await page.addInitScript({ content: readFileSync("extensions/cover-picker/content.js", "utf8") });
    await page.route("https://covers.openlibrary.org/**", route => route.abort());
    await page.goto("/details/books/501");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Update this book cover" });
    await expect(dialog.getByText("Cover picker connected.", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Search Google Images" }).click();
    await expect.poll(() => page.evaluate(() => (window as any).pickerSearch?.query)).toBe("Dune Frank Herbert book cover");
    const selected = await page.evaluate(() => (window as any).pickerSearch);
    await dialog.getByRole("button", { name: "Upload image", exact: true }).click();
    const result = await page.evaluate(search => new Promise(resolve => {
        (window as any).receiveCover({ ...search, type: "cover", imageUrl: "https://covers.example/dune.jpg" }, {}, resolve);
    }), selected);
    expect(result).toMatchObject({ ok: true });
    await expect(dialog.getByLabel("Image URL", { exact: true })).toHaveValue("https://covers.example/dune.jpg");

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const stale = await page.evaluate(search => new Promise(resolve => {
        (window as any).receiveCover({ ...search, type: "cover", imageUrl: "https://covers.example/stale.jpg" }, {}, resolve);
    }), selected);
    expect(stale).toMatchObject({ ok: false });
    await expect(dialog.getByLabel("Image URL", { exact: true })).toHaveValue("https://covers.example/dune.jpg");

    // Existing server permissions still reject full metadata editing for this normal user.
    await page.goto("/details/edit/books/501");
    await expect(page.getByLabel("Image Cover URL", { exact: true })).toHaveCount(0);
    await runBun(["-e", `
        import Database from 'bun:sqlite';
        const db = new Database(process.env.DATABASE_URL);
        db.run("UPDATE user SET role = 'manager' WHERE id = 1");
        db.close();
    `]);
    await page.goto("/details/edit/books/501");
    await expect(page.getByText("Cover picker connected.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Search Google Images" }).click();
    await expect.poll(() => page.evaluate(() => (window as any).pickerSearch?.query)).toBe("Dune Frank Herbert book cover");
    const edited = await page.evaluate(() => (window as any).pickerSearch);
    const accepted = await page.evaluate(search => new Promise(resolve => {
        (window as any).receiveCover({ ...search, type: "cover", imageUrl: "https://covers.example/edited.jpg" }, {}, resolve);
    }), edited);
    expect(accepted).toMatchObject({ ok: true });
    await expect(page.getByLabel("Image Cover URL", { exact: true })).toHaveValue("https://covers.example/edited.jpg");
});


test("native extension keeps the current page after client navigation", async ({ baseURL }) => {
    const {chromium} = await import("@playwright/test");
    const {resolve} = await import("node:path");
    const extension = resolve("extensions/cover-picker");
    const context = await chromium.launchPersistentContext("", {
        channel: "chromium", headless: true, baseURL,
        args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    try {
        await context.route(`${baseURL}/details/**`, route => route.fulfill({ contentType:"text/html", body:"<h1>Cover form</h1>" }));
        await context.route("https://www.google.com/**", route => route.fulfill({body:"Google Images"}));
        const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
        const page = await context.newPage();
        await page.goto("/details/books/501");
        await page.evaluate(() => new Promise<void>(resolve => {
            const ready = (event: MessageEvent) => {
                if (event.data?.source !== "mylists-cover-picker-extension" || event.data.type !== "ready") return;
                window.removeEventListener("message", ready);
                resolve();
            };
            window.addEventListener("message", ready);
            window.postMessage({ source: "mylists-cover-picker-app", type: "ping" }, location.origin);
        }));
        for (const bookId of [501, 502]) {
            await page.evaluate(id => { history.pushState({}, "", `/details/books/${id}`); }, bookId);
            const opened = context.waitForEvent("page");
            await page.evaluate(id => window.postMessage({
                source: "mylists-cover-picker-app", type: "search", requestId: `spa-${id}`,
                mediaKey: `books:${id}`, query: "Book cover",
            }, location.origin), bookId);
            await opened;
            await expect.poll(() => worker.evaluate(async id => {
                const entries = await (globalThis as any).chrome.storage.session.get(null);
                return Object.values(entries).find((entry: any) => entry.requestId === `spa-${id}`);
            }, bookId)).toMatchObject({ sourceUrl: `${baseURL}/details/books/${bookId}`, mediaKey: `books:${bookId}` });
        }
    } finally {await context.close();}
});
