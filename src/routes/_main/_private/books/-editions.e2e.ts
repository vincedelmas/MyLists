import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";

const seedBooks = async (separate: boolean) => runBun(["-e", `
    if (!process.env.MYLISTS_E2E_DIR) throw new Error("An isolated test database is required");
    const {db} = await import("./src/lib/server/database/db");
    const {books, bookEditions, booksList, user, userMediaSettings} = await import("./src/lib/server/database/schema");
    const {eq, and} = await import("drizzle-orm");
    db.update(userMediaSettings).set({active: true}).where(and(eq(userMediaSettings.userId, 1), eq(userMediaSettings.mediaType, "books"))).run();
    db.insert(books).values([
        {id: 401, apiId: "edition-en", name: "A shared story", imageCover: "default.jpg", releaseDate: "1960-01-01"},
        ...(${separate} ? [
            {id: 402, apiId: "edition-fr", name: "Une histoire", imageCover: "default.jpg", releaseDate: "2000-01-01"},
            {id: 403, apiId: "edition-de", name: "Eine Geschichte", imageCover: "default.jpg", releaseDate: "1990-01-01"},
        ] : []),
    ]).run();
    db.insert(bookEditions).values([
        {id: 411, mediaId: 401, apiId: "edition-en", name: "English edition", pages: 300, language: "en", publishers: "English Press", imageCover: "default.jpg", releaseDate: "1960-01-01"},
        {id: 412, mediaId: ${separate ? 402 : 401}, apiId: "edition-fr", name: "French edition", pages: 420, language: "fr", publishers: "French Press", imageCover: "default.jpg", releaseDate: "2000-01-01", isbns: ["9780140328721"], synopsis: "Une histoire racontée en français."},
        ...(${separate} ? [{id: 413, mediaId: 403, apiId: "edition-de", name: "German edition", pages: 350, language: "de", publishers: "German Press", imageCover: "default.jpg", releaseDate: "1990-01-01"}] : []),
    ]).run();
    if (${separate}) {
        db.update(user).set({role: "admin"}).where(eq(user.id, 1)).run();
        db.insert(booksList).values([
            {userId: 1, mediaId: 401, editionId: 411, editionName: "English edition", status: "Completed", pages: 300, actualPage: 300, total: 300, rating: 8, comment: "Original note"},
            {userId: 1, mediaId: 402, editionId: 412, editionName: "French edition", status: "Completed", pages: 420, actualPage: 420, total: 420, rating: 9},
            {userId: 1, mediaId: 403, editionId: 413, editionName: "German edition", status: "Completed", pages: 350, actualPage: 350, total: 350},
            {userId: 2, mediaId: 402, editionId: 412, editionName: "French edition", status: "Reading", pages: 420, actualPage: 50, total: 50},
        ]).run();
    }
`]);

test("selects an edition and preserves it through page tracking and reloads", async ({page}) => {
    await seedBooks(false);
    await signIn(page);
    await page.goto("/details/books/401");
    await page.getByRole("combobox", {name: "Your edition"}).click();
    await page.getByRole("option", {name: /French edition/}).click();
    await expect(page.getByRole("heading", {name: "French edition", exact: true})).toBeVisible();
    await expect(page.getByText("Une histoire racontée en français.", {exact: true})).toBeVisible();
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
    await expect(page.getByRole("heading", {name: "English edition", exact: true})).toBeVisible();
    await page.goto("/books/manage");
    await expect(page.getByRole("heading", {name: "Books & editions"})).toHaveCount(0);
});

test("preselects the most-read work, merges three works with overlap choices, and separates an edition", async ({page}, testInfo) => {
    await seedBooks(true);
    await signIn(page);
    await page.goto("/books/manage?workId=401");
    await page.getByRole("checkbox", {name: /^Une histoire/}).check();
    await page.getByRole("checkbox", {name: /^Eine Geschichte/}).check();
    await expect(page.getByRole("radio", {name: /^Une histoire/})).toBeChecked();
    await page.getByRole("radio", {name: /^A shared story/}).check();
    await expect(page.getByRole("radio", {name: /^A shared story/})).toBeChecked();
    await page.getByRole("radio", {name: /^Une histoire/}).check();
    const merge = page.getByRole("button", {name: "Merge 3 works"});
    await expect(merge).toBeDisabled();
    await expect(page.getByText("First published: 1960 · oldest edition")).toBeVisible();
    expect((await merge.boundingBox())!.y + (await merge.boundingBox())!.height).toBeLessThan(page.viewportSize()!.height);
    await page.screenshot({path: testInfo.outputPath("book-manager-desktop.png"), fullPage: true});
    await page.getByRole("button", {name: "Resolve 1 overlap", exact: true}).click();
    await expect(page.getByText("1 reader has overlapping entries", {exact: true})).toBeInViewport();
    await page.getByRole("combobox", {name: "Active entry, rating and note"}).click();
    await page.getByRole("option", {name: "A shared story · #401", exact: true}).click();
    await page.getByRole("combobox", {name: "Reading totals", exact: true}).click();
    await page.getByRole("option", {name: "Separate readings: combine all totals"}).click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page.setViewportSize({width: 390, height: 844});
    await page.getByRole("button", {name: "Review selection"}).click();
    await expect(merge).toBeInViewport({ratio: 1});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({path: testInfo.outputPath("book-manager-mobile.png"), fullPage: true});
    await merge.click();
    await expect(page).toHaveURL(/\/books\/manage$/);
    await expect(page.getByText("One book. All its editions.", {exact: true})).toBeVisible();
    await page.getByRole("checkbox", {name: /^Une histoire/}).check();
    await page.getByRole("button", {name: "Editions & suggested matches"}).click();
    await expect(page.getByText("3 editions attached to this work")).toBeVisible();
    await expect(page.getByText("First published: Jan 1, 1960", {exact: false})).toBeVisible();
    await page.getByRole("region", {name: "Edition English edition", exact: true}).getByRole("button", {name: "Separate", exact: true}).click();
    const dialog = page.getByRole("dialog", {name: "Give this edition its own work"});
    await dialog.getByLabel("Work title").fill("Separated story");
    await dialog.getByRole("button", {name: "Create separate work"}).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole("link", {name: "View book page"}).click();
    await expect(page.getByRole("heading", {name: "English edition", exact: true})).toBeVisible();
    await expect(page.getByLabel("Current page", {exact: true})).toHaveValue("300");
    await expect(page.getByTestId("book-edition-presentation")).toContainText("Shared book: Separated story");
});

test("keeps comparison controls visible and selections across catalogue searches and pages", async ({page}, testInfo) => {
    await seedBooks(true);
    await runBun(["-e", `
        const {db} = await import("./src/lib/server/database/db");
        const {books, bookEditions, booksAuthors} = await import("./src/lib/server/database/schema");
        const works = Array.from({length: 34}, (_, index) => ({id: 500 + index, apiId: "volume-" + index, name: "Catalogue " + String(index).padStart(2, "0"), imageCover: "default.jpg"}));
        db.insert(books).values(works).run();
        db.insert(bookEditions).values(works.map(work => ({mediaId: work.id, apiId: work.apiId, name: work.name, imageCover: work.imageCover}))).run();
        db.insert(booksAuthors).values({mediaId: 501, name: "Distinct Author"}).run();
    `]);
    await signIn(page);
    await page.goto("/books/manage?workId=401");
    const search = page.getByRole("textbox", {name: "Search catalogue"});
    await search.fill("Distinct Author");
    await page.getByRole("checkbox", {name: /^Catalogue 01/}).check();
    await expect(page.getByText("Compare 2 works", {exact: true})).toBeVisible();
    await search.fill("Catalogue");
    await page.getByRole("button", {name: "Next", exact: true}).click();
    await page.getByRole("checkbox", {name: /^Catalogue 33/}).check();
    await expect(page.getByText("Compare 3 works", {exact: true})).toBeVisible();
    await page.getByRole("button", {name: "Previous", exact: true}).click();
    await expect(page.getByRole("checkbox", {name: /^Catalogue 01/})).toBeChecked();
    await page.getByRole("checkbox", {name: "Select this page", exact: true}).check();
    await expect(page.getByText("Compare 32 works", {exact: true})).toBeVisible();
    const merge = page.getByRole("button", {name: "Merge 32 works"});
    await expect(merge).toBeEnabled();
    const before = (await merge.boundingBox())!;
    expect(before.y + before.height).toBeLessThan(page.viewportSize()!.height);
    expect((await page.getByTestId("book-comparison").boundingBox())!.y).toBeLessThan(250);
    await page.getByRole("checkbox", {name: /^Catalogue 29/}).scrollIntoViewIfNeeded();
    expect((await merge.boundingBox())!.y).toBe(before.y);
    await page.screenshot({path: testInfo.outputPath("book-manager-bulk.png"), fullPage: true});
    await search.fill("no matches");
    await expect(page.getByText("No matching works", {exact: true})).toBeVisible();
    await expect(merge).toBeEnabled();
    await page.getByRole("button", {name: "Clear", exact: true}).click();
    await expect(page.getByText("One book. All its editions.", {exact: true})).toBeVisible();
});

test("moves an individual edition from the inspector and keeps the remaining editions on their work", async ({page}) => {
    await seedBooks(true);
    await runBun(["-e", `
        const {db} = await import("./src/lib/server/database/db");
        const {bookEditions} = await import("./src/lib/server/database/schema");
        db.insert(bookEditions).values({mediaId: 401, apiId: "other-edition", name: "Remaining edition", imageCover: "default.jpg", releaseDate: "1970-01-01"}).run();
    `]);
    await signIn(page);
    await page.goto("/books/manage?workId=401");
    await page.getByRole("checkbox", {name: /^Une histoire/}).check();
    await expect(page.getByText("Compare 2 works", {exact: true})).toBeVisible();
    await page.getByRole("button", {name: "Inspect A shared story", exact: true}).click();
    await page.getByRole("region", {name: "Edition English edition", exact: true}).getByRole("button", {name: "Move", exact: true}).click();
    const dialog = page.getByRole("dialog", {name: "Move edition", exact: true});
    await expect(dialog.getByRole("combobox", {name: "Destination work"})).toContainText("Une histoire");
    await expect(dialog.getByRole("button", {name: "Move edition", exact: true})).toBeDisabled();
    await dialog.getByRole("combobox", {name: "Active entry, rating and note"}).click();
    await page.getByRole("option", {name: "Une histoire · #402", exact: true}).click();
    await dialog.getByRole("combobox", {name: "Reading totals", exact: true}).click();
    await page.getByRole("option", {name: "Duplicates: keep chosen totals"}).click();
    await dialog.getByRole("button", {name: "Move edition", exact: true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/workId=402/);
    await page.getByRole("button", {name: "Inspect A shared story", exact: true}).click();
    await expect(page.getByRole("region", {name: "Edition Remaining edition", exact: true})).toBeVisible();
    await expect(page.getByRole("region", {name: "Edition English edition", exact: true})).toHaveCount(0);
    await expect(page.getByText("First published: Jan 1, 1970", {exact: false})).toBeVisible();
});

test("finds a stored ISBN from the edition dialog and keeps page corrections and progress", async ({page}) => {
    await seedBooks(false);
    await signIn(page);
    await page.goto("/details/books/401");
    await page.getByRole("button", {name: "Add to List", exact: true}).click();
    await page.getByRole("button", {name: "Change edition"}).click();
    const editor = page.getByRole("dialog", {name: "Your reading edition"});
    await editor.getByRole("button", {name: "Find edition by ISBN"}).click();
    const search = page.getByRole("dialog", {name: "Find your edition", exact: true});
    await search.getByRole("textbox", {name: "ISBN", exact: true}).fill("0-14-032872-6");
    await search.getByRole("button", {name: "Search", exact: true}).click();
    await expect(search.getByText("French edition", {exact: true})).toBeVisible();
    await search.getByRole("button", {name: "Use this edition"}).click();
    await expect(search).toHaveCount(0);
    await expect(editor.getByLabel("Pages in your copy")).toHaveValue("420");
    await editor.getByLabel("Pages in your copy").fill("430");
    await editor.getByRole("button", {name: "Save edition"}).click();
    await expect(editor).toHaveCount(0);
    await expect(page.getByRole("heading", {name: "French edition", exact: true})).toBeVisible();
    await page.reload();
    await expect(page.getByText("French Press · French · 430 pages", {exact: true})).toBeVisible();
});

test("scans a group of works for review and remembers keep-separate decisions", async ({page}, testInfo) => {
    await seedBooks(true);
    await runBun(["-e", `
        const {db} = await import("./src/lib/server/database/db");
        const {bookEditions, booksAuthors} = await import("./src/lib/server/database/schema");
        db.update(bookEditions).set({authors: ["An Author"], openLibraryWorkId: "/works/OL1W"}).run();
        db.insert(booksAuthors).values([401, 402, 403].map(mediaId => ({mediaId, name: "An Author"}))).run();
    `]);
    await signIn(page);
    await page.goto("/books/manage");
    await page.getByRole("button", {name: "Account menu"}).click();
    await expect(page.getByRole("menuitem", {name: "Books & editions"})).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", {name: "Review queue", exact: true}).click();
    await page.getByRole("button", {name: "Scan books", exact: true}).click();
    await expect(page.getByRole("button", {name: "Review 3 works"})).toBeVisible();
    await page.getByRole("button", {name: "Review next"}).click();
    await expect(page.getByRole("radio", {name: /^Une histoire/})).toBeChecked();
    await page.screenshot({path: testInfo.outputPath("book-review-queue.png"), fullPage: true});
    await page.getByRole("button", {name: "Keep separate", exact: true}).click();
    await expect(page.getByText("One book. All its editions.", {exact: true})).toBeVisible();
    await page.getByRole("button", {name: "Scan books", exact: true}).click();
    await expect(page.getByText("No pending matches", {exact: true})).toBeVisible();
});

test("keeps books management out of the manager account menu and rejects its route", async ({page}) => {
    await seedBooks(false);
    await runBun(["-e", `
        const {db} = await import("./src/lib/server/database/db");
        const {user} = await import("./src/lib/server/database/schema");
        const {eq} = await import("drizzle-orm");
        db.update(user).set({role: "manager"}).where(eq(user.id, 1)).run();
    `]);
    await signIn(page);
    await page.goto("/details/books/401");
    await page.getByRole("button", {name: "Account menu"}).click();
    await expect(page.getByRole("menuitem", {name: "Books & editions"})).toHaveCount(0);
    await expect(page.getByRole("menuitem", {name: "Admin Panel"})).toHaveCount(0);
    await page.goto("/books/manage");
    await expect(page.getByRole("heading", {name: "Books & editions"})).toHaveCount(0);
});
