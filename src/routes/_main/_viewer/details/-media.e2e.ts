import {movies, users} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("adds a movie and persists status and rating changes", async ({ page }) => {
    await signIn(page);

    await page.goto(`/details/movies/${movies.editable.id}`);
    await page.getByRole("button", { name: "Add to List", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remove from your list" })).toBeVisible();

    await page.getByRole("combobox").filter({ hasText: "Plan to Watch" }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeEnabled();

    const rating = page.getByText("Rating", { exact: true }).locator("..").getByRole("combobox");
    await rating.click();

    await page.getByRole("option", { name: "8.0", exact: true }).click();
    await expect(rating).toContainText("8.0");
    await expect(rating).toBeEnabled();

    await page.reload();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeVisible();
    await expect(rating).toContainText("8.0");

    await page.goto(`/list/movies/${users.owner.name}`);
    await expect(page.getByRole("link", { name: `View ${movies.editable.name}`, exact: true })).toBeVisible();
});


test("corrects book activity automatically and lets the reader review older months", async ({ page }) => {
    await runBun(["-e", `
        if (!process.env.MYLISTS_E2E_DIR) throw new Error("An isolated test database is required");
        const {db} = await import("./src/lib/server/database/db");
        const {books, bookEditions, userMediaSettings} = await import("./src/lib/server/database/schema");
        const {getContainer} = await import("./src/lib/server/core/container");
        const {MediaType, Status, UpdateType} = await import("./src/lib/utils/enums");
        const {and, eq} = await import("drizzle-orm");
        db.update(userMediaSettings).set({active: true}).where(and(eq(userMediaSettings.userId, 1), eq(userMediaSettings.mediaType, MediaType.BOOKS))).run();
        db.insert(books).values({id: 301, apiId: "correction-book", name: "Correction book", imageCover: "default.jpg"}).run();
        const {services: {mediaTracking}} = await getContainer();
        db.insert(bookEditions).values({id: 301, mediaId: 301, apiId: "correction-book", name: "Correction edition", pages: 500, imageCover: "default.jpg"}).run();
        const action = {userId: 1, mediaId: 301, mediaType: MediaType.BOOKS};
        mediaTracking.addMediaToList({...action, status: Status.READING});
        mediaTracking.updateUserMedia({...action, payload: {type: UpdateType.PAGE, actualPage: 200, loggedAt: "2025-07-20"}});
        mediaTracking.updateUserMedia({...action, payload: {type: UpdateType.PAGE, actualPage: 320, loggedAt: "2025-08-20"}});
    `]);
    await signIn(page);
    await page.goto("/details/books/301");
    const currentPage = page.getByLabel("Current page", { exact: true });
    await currentPage.fill("340");
    await Promise.all([
        page.waitForResponse(response => response.request().method() === "POST" && response.url().includes("/_serverFn/")),
        currentPage.press("Enter"),
    ]);
    await expect(currentPage).toBeEnabled();
    await currentPage.fill("330");
    await currentPage.press("Enter");
    await expect(page.getByText("Progress and activity corrected.", { exact: true })).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    await currentPage.fill("290");
    await currentPage.press("Enter");
    const correction = page.getByRole("alertdialog", { name: "Correct monthly activity" });
    await expect(correction).toBeVisible();
    await expect(correction.getByText("120 → 90 p.", { exact: true })).toBeVisible();
    await correction.getByRole("combobox", { name: "Correct activity starting in" }).click();
    await page.getByRole("option", { name: "July 2025", exact: true }).click();
    await correction.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(currentPage).toHaveValue("330");

    // Reopening without a reload must discard the cancelled month selection.
    await currentPage.fill("290");
    await currentPage.press("Enter");
    await expect(correction.getByText("120 → 90 p.", { exact: true })).toBeVisible();
    await correction.getByRole("combobox", { name: "Correct activity starting in" }).click();
    await page.getByRole("option", { name: "July 2025", exact: true }).click();
    await expect(correction.getByText("200 → 160 p.", { exact: true })).toBeVisible();
    await expect(correction.getByText("August 2025", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await correction.getByRole("button", { name: "Save correction", exact: true }).click();
    await expect(correction).toHaveCount(0);
    await expect(currentPage).toBeEnabled();
    await page.reload();
    await expect(currentPage).toHaveValue("290");
    await page.goto(`/list/books/${users.owner.name}/activity?year=2025&month=7`);
    const bookActivity = page.getByRole("article").filter({ has: page.getByRole("link", { name: "View Correction book", exact: true }) });
    await expect(bookActivity.getByText("160 p.", { exact: true })).toBeVisible();

    // The correction prompt must work over the list's edit dialog too.
    await page.getByRole("link", { name: "List", exact: true }).click();
    await page.getByRole("button", { name: "Edit Correction book", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Correction book", exact: true });
    await editor.getByLabel("Current page", { exact: true }).fill("240");
    await editor.getByLabel("Current page", { exact: true }).press("Enter");
    await expect(correction).toBeVisible();
    await correction.getByRole("checkbox", { name: "Keep activity unchanged", exact: true }).check();
    await correction.getByRole("button", { name: "Save correction", exact: true }).click();
    await expect(correction).toHaveCount(0);
    await expect(editor.getByLabel("Current page", { exact: true })).toHaveValue("240");
    await expect(editor.getByLabel("Current page", { exact: true })).toBeEnabled();
    await expect(page.getByText("Progress updated; activity unchanged.", { exact: true })).toBeVisible();
    await page.goto("/details/books/301");
    await expect(currentPage).toHaveValue("240");
    await page.goto(`/list/books/${users.owner.name}/activity?year=2025&month=8`);
    await expect(bookActivity.getByText("120 p.", { exact: true })).toBeVisible();
});
