import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";

const seedBooks = async (separate: boolean) => runBun(["-e", `
    if (!process.env.MYLISTS_E2E_DIR) throw new Error("An isolated test database is required");
    const {db} = await import("./src/lib/server/database/db");
    const {books, bookEditions, booksList, user, userMediaSettings} = await import("./src/lib/server/database/schema");
    const {eq, and} = await import("drizzle-orm");
    db.update(userMediaSettings).set({active: true}).where(and(eq(userMediaSettings.userId, 1), eq(userMediaSettings.mediaType, "books"))).run();
    db.insert(books).values([
        {id: 401, apiId: "edition-en", name: "A shared story", imageCover: "default.jpg"},
        ...(${separate} ? [{id: 402, apiId: "edition-fr", name: "Une histoire", imageCover: "default.jpg"}] : []),
    ]).run();
    db.insert(bookEditions).values([
        {id: 411, mediaId: 401, apiId: "edition-en", name: "English edition", pages: 300, language: "en", publishers: "English Press", imageCover: "default.jpg"},
        {id: 412, mediaId: ${separate ? 402 : 401}, apiId: "edition-fr", name: "French edition", pages: 420, language: "fr", publishers: "French Press", imageCover: "default.jpg"},
    ]).run();
    if (${separate}) {
        db.update(user).set({role: "manager"}).where(eq(user.id, 1)).run();
        db.insert(booksList).values([
            {userId: 1, mediaId: 401, editionId: 411, editionName: "English edition", status: "Completed", pages: 300, actualPage: 300, total: 300, rating: 8, comment: "Original note"},
            {userId: 1, mediaId: 402, editionId: 412, editionName: "French edition", status: "Completed", pages: 420, actualPage: 420, total: 420, rating: 9},
        ]).run();
    }
`]);

test("selects an edition and preserves it through page tracking and reloads", async ({page}) => {
    await seedBooks(false);
    await signIn(page);
    await page.goto("/details/books/401");
    await page.getByRole("combobox", {name: "Your edition"}).click();
    await page.getByRole("option", {name: /French edition/}).click();
    await page.getByRole("button", {name: "Add to List", exact: true}).click();
    await expect(page.getByText("French Press · French · 420 pages", {exact: true})).toBeVisible();
    await page.getByRole("combobox").filter({hasText: "Plan to Read"}).click();
    await page.getByRole("option", {name: "Reading", exact: true}).click();
    const currentPage = page.getByLabel("Current page", {exact: true});
    await currentPage.fill("120");
    await currentPage.press("Enter");
    await expect(currentPage).toBeEnabled();
    await page.getByRole("button", {name: "Change edition"}).click();
    const dialog = page.getByRole("dialog", {name: "Your reading edition"});
    await dialog.getByRole("combobox", {name: "Your edition"}).click();
    await page.getByRole("option", {name: /English edition/}).click();
    await dialog.getByLabel("Pages in your copy").fill("310");
    await dialog.getByRole("button", {name: "Save edition"}).click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(currentPage).toHaveValue("120");
    await expect(page.getByText("English Press · English · 310 pages", {exact: true})).toBeVisible();
    await page.goto("/books/manage");
    await expect(page.getByRole("heading", {name: "Books & editions"})).toHaveCount(0);
});

test("requires overlap choices before merging, then allows a mistaken edition to be separated", async ({page}, testInfo) => {
    await seedBooks(true);
    await signIn(page);
    await page.goto("/books/manage?workId=401");
    await expect(page.getByText("1 edition · 1 reader", {exact: true})).toHaveCount(2);
    await page.getByRole("button", {name: "Compare", exact: true}).click();
    const merge = page.getByRole("button", {name: "Merge into surviving work"});
    await expect(merge).toBeDisabled();
    await page.getByRole("combobox", {name: "Active entry, rating and note"}).click();
    await page.getByRole("option", {name: "Keep source entry"}).click();
    await page.getByRole("combobox", {name: "Reading totals", exact: true}).click();
    await page.getByRole("option", {name: "Separate readings: combine totals"}).click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page.screenshot({path: testInfo.outputPath("book-manager.png"), fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await merge.click();
    await expect(page).toHaveURL(/workId=402/);
    await expect(page.getByText("2 editions attached to this work")).toBeVisible();
    await page.getByRole("row").filter({hasText: "English edition"}).getByRole("button", {name: "Separate", exact: true}).click();
    const dialog = page.getByRole("dialog", {name: "Give this edition its own work"});
    await dialog.getByLabel("Work title").fill("Separated story");
    await dialog.getByRole("button", {name: "Create separate work"}).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("link", {name: "View book page"}).click();
    await expect(page.getByRole("heading", {name: "Separated story", exact: true})).toBeVisible();
    await expect(page.getByLabel("Current page", {exact: true})).toHaveValue("300");
    await expect(page.getByText("English edition", {exact: true})).toBeVisible();
});
