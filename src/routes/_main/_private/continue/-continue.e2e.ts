import {password, users} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("starts a fresh Continue order when navigating between profiles", async ({ page }) => {
    await runBun(["src/routes/_main/_private/continue/-fixtures.ts", "--profile-order"]);
    await signIn(page);
    await page.goto(`/profile/${users.owner.name}`);

    const preview = page.getByRole("region", { name: "Continue", exact: true });
    const ownerTitles = ["Continue manga", "Continue game", "Continue book", "Continue series", "Older continue series"];
    await expect(preview.getByRole("heading", { level: 3 })).toHaveText(ownerTitles);

    // Navigate directly so React reuses the profile route across usernames.
    await page.locator(`a[href="/profile/${users.follower.name}"]`).first().click();
    await expect(page).toHaveURL(url => url.pathname === `/profile/${users.follower.name}`);
    const sharedPreview = page.getByRole("region", { name: "In progress", exact: true });
    await expect(sharedPreview.getByRole("heading", { level: 3 })).toHaveText(["Continue series", "Continue game"]);
    await expect(sharedPreview.getByRole("button")).toHaveCount(0);

    await page.goBack();
    await expect(preview.getByRole("heading", { level: 3 })).toHaveText(ownerTitles);
});


test("keeps finished progress secondary until the user marks it completed", async ({ page }) => {
    await runBun(["src/routes/_main/_private/continue/-fixtures.ts", "--finished-progress"]);
    await signIn(page);
    await page.goto(`/profile/${users.owner.name}`);

    const preview = page.getByRole("region", { name: "Continue", exact: true });
    await expect(preview.getByRole("article")).toHaveCount(2);
    await expect(preview.getByRole("article").getByRole("heading", { level: 3 })).toHaveText(["Continue game", "Continue series"]);
    await preview.getByRole("link", { name: "View all in-progress media" }).click();

    const active = page.getByRole("region", { name: "Continue media", exact: true });
    const finished = page.getByRole("region", { name: /Ready to mark completed/ });
    await expect(active.getByRole("article")).toHaveCount(2);
    await expect(finished.getByRole("article")).toHaveCount(3);
    await expect(finished.getByRole("button", { name: "Mark completed", exact: true })).toHaveCount(3);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 720 });

    // A tab with only finished progress must still offer its completion action.
    await page.getByRole("link", { name: "Books 1", exact: true }).click();
    await expect(active).toHaveCount(0);
    await expect(finished.getByRole("article")).toHaveCount(1);
    await expect(page.getByText("Nothing in progress here yet", { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "All 5", exact: true }).click();

    const series = finished.getByRole("article", { name: "Older continue series", exact: true });
    await series.getByRole("link", { name: "View Older continue series", exact: true }).click();
    await expect(page.getByRole("combobox").filter({ hasText: "Watching" })).toBeVisible();
    await page.goBack();
    await series.getByRole("button", { name: "Mark completed", exact: true }).click();
    await expect(series).toHaveCount(0);
    await expect(finished.getByRole("article")).toHaveCount(2);
    const completion = page.locator('[data-slot="toast"]').filter({ hasText: "Older continue series" });
    await completion.getByRole("button", { name: "View details", exact: true }).click();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeVisible();
});


test("persists profile Continue visibility for the owner and visitors without affecting the dashboard", async ({ page, browser, baseURL }) => {
    await runBun(["src/routes/_main/_private/continue/-fixtures.ts", "--finished-progress"]);
    await signIn(page);
    await page.goto("/settings/profile-customization");

    const visibility = page.getByRole("switch", { name: "Show Continue on my profile", exact: true });
    const save = page.getByRole("button", { name: "Save changes", exact: true });
    await expect(visibility).toBeChecked();
    await visibility.uncheck();
    await page.getByLabel("Section title", { exact: true }).fill("My favorites");
    await save.click();
    await expect(page.getByText("Customization updated", { exact: true })).toBeVisible();
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "E2", exact: true }).click();
    await page.getByRole("menuitem", { name: "Profile", exact: true }).click();
    await expect(page.getByRole("heading", { name: users.owner.name, exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Continue", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "MyMedia", exact: true }).click();
    await page.getByRole("menuitem", { name: "Continue", exact: true }).click();
    await expect(page.getByRole("region", { name: "Continue media", exact: true }).getByRole("article")).toHaveCount(2);

    const follower = await browser.newPage({ baseURL });
    try {
        await signIn(follower, "follower");
        await follower.goto(`/profile/${users.follower.name}`);
        await expect(follower.getByRole("region", { name: "Continue", exact: true }).getByRole("article")).toHaveCount(1);
        await follower.goto(`/profile/${users.owner.name}`);
        await expect(follower.getByRole("heading", { name: users.owner.name, exact: true })).toBeVisible();
        const sharedPreview = follower.getByRole("region", { name: "In progress", exact: true });
        await expect(sharedPreview).toHaveCount(0);

        await page.goto("/settings/profile-customization");
        await expect(visibility).not.toBeChecked();
        await expect(page.getByLabel("Section title", { exact: true })).toHaveValue("My favorites");
        await page.setViewportSize({ width: 390, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await visibility.check();
        await save.click();
        await expect(page.getByText("Customization updated", { exact: true })).toBeVisible();
        await expect(save).toBeDisabled();
        await page.goto(`/profile/${users.owner.name}`);
        await expect(page.getByRole("region", { name: "Continue", exact: true }).getByRole("article")).toHaveCount(2);
        await follower.reload();
        await expect(sharedPreview.getByRole("article")).toHaveCount(2);
        await expect(sharedPreview.getByRole("button")).toHaveCount(0);
    }
    finally {
        await follower.close();
    }
});


test("continues active media, saves progress, and finishes a title", async ({ page }) => {
    await runBun(["src/routes/_main/_private/continue/-fixtures.ts"]);
    await signIn(page);
    await page.goto(`/profile/${users.owner.name}`);

    const preview = page.getByRole("region", { name: "Continue", exact: true });
    await expect(preview.getByRole("article")).toHaveCount(5);
    await expect(preview.getByRole("article").first()).toHaveAccessibleName("Continue manga");
    await expect(preview.getByRole("article", { name: "Older continue series" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^Edit progress for / })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const previewBook = preview.getByRole("article", { name: "Continue book", exact: true });
    await expect(previewBook.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "95");

    // Larger changes use the existing details form, reached directly from the cover.
    await previewBook.getByRole("link", { name: "View Continue book", exact: true }).click();
    await expect(page).toHaveURL(/\/details\/books\/301/);
    await expect(page.getByLabel("Current page", { exact: true })).toHaveValue("95");
    await page.getByLabel("Current page", { exact: true }).fill("42");
    await page.getByLabel("Current page", { exact: true }).press("Enter");
    await expect(page.getByLabel("Current page", { exact: true })).toBeEnabled();
    await page.goBack();
    await expect(previewBook).toContainText("42 / 100 pages");

    const previewTitles = preview.getByRole("article").getByRole("heading", { level: 3 });
    const previewOrder = await previewTitles.allTextContents();
    const booksLevel = page.getByRole("progressbar", { name: "books level progress", exact: true });
    const initialBooksLevel = await booksLevel.getAttribute("aria-valuenow");
    await previewBook.getByRole("button", { name: "+ 10 pages", exact: true }).click();
    await expect(previewBook).toContainText("52 / 100 pages");
    await expect(booksLevel).toHaveAttribute("aria-valuenow", initialBooksLevel!);
    await expect(page.getByText("p. 52", { exact: true }).locator("..")).toContainText("p. 95");
    await expect(previewTitles).toHaveText(previewOrder);
    await previewBook.getByRole("button", { name: "+ 10 pages", exact: true }).click();
    await expect(previewBook).toContainText("62 / 100 pages");
    await expect(previewTitles).toHaveText(previewOrder);
    await expect(booksLevel).toHaveAttribute("aria-valuenow", initialBooksLevel!);

    // Secondary views fetch current progress on return, without refreshing after each click.
    await previewBook.getByRole("link", { name: "View Continue book", exact: true }).click();
    await expect(page.getByLabel("Current page", { exact: true })).toHaveValue("62");
    await page.goBack();
    await expect(previewBook).toContainText("62 / 100 pages");
    await expect(booksLevel).not.toHaveAttribute("aria-valuenow", initialBooksLevel!);
    await page.reload();
    await expect(previewBook).toContainText("62 / 100 pages");

    const previewManga = preview.getByRole("article", { name: "Continue manga", exact: true });
    await previewManga.getByRole("button", { name: "+ 1 chapter", exact: true }).click();
    await expect(previewManga).toContainText("8 / ? chapters");
    await expect(preview.getByRole("article").first()).toHaveAccessibleName("Continue book");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(preview.getByRole("article")).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 720 });
    await preview.getByRole("link", { name: "View all in-progress media" }).click();

    await expect(page.getByRole("heading", { name: "Continue", exact: true })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(5);
    await expect(page.getByText(/sentinel/)).toHaveCount(0);
    await expect(page.getByRole("article", { name: "Endless game", exact: true })).toHaveCount(0);
    await expect(page.getByRole("article", { name: "Multiplayer game", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Edit progress for / })).toHaveCount(0);

    const series = page.getByRole("article", { name: "Continue series", exact: true });
    const updated = series.getByRole("button", { name: /Jan 1, 2026/ });
    await expect(updated).toContainText(/^Updated /);
    await expect(updated).not.toContainText(/\b(?:wk|mo|yr)\./);
    await updated.click();
    await expect(page.getByText("Jan 1, 2026, 12:00", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(series).toContainText("S1/S3 · Eps. 2/2");
    await expect(page.getByRole("article").nth(3)).toHaveAccessibleName("Continue series");
    await series.getByRole("button", { name: "+ 1 episode", exact: true }).click();
    await expect(series).toContainText("S3/S3 · Eps. 1/3");
    await expect(page.getByRole("article").nth(3)).toHaveAccessibleName("Continue series");
    await series.getByRole("button", { name: "+ 1 episode", exact: true }).click();
    await expect(series).toContainText("S3/S3 · Eps. 2/3");
    await expect(page.getByRole("article").nth(3)).toHaveAccessibleName("Continue series");

    const game = page.getByRole("article", { name: "Continue game", exact: true });
    await game.getByRole("button", { name: "+ 60 min", exact: true }).click();
    await expect(game).toContainText("2h 30m played");
    await game.getByRole("button", { name: "+ 60 min", exact: true }).click();
    await expect(game).toContainText("3h 30m played");
    await expect(page.getByRole("article").nth(2)).toHaveAccessibleName("Continue game");

    const manga = page.getByRole("article", { name: "Continue manga", exact: true });
    await manga.getByRole("button", { name: "+ 1 chapter", exact: true }).click();
    await expect(manga).toContainText("9 / ? chapters");
    await page.getByRole("link", { name: "Books 1", exact: true }).click();
    await expect(page.getByRole("article")).toHaveCount(1);

    const book = page.getByRole("article", { name: "Continue book", exact: true });
    await book.getByRole("button", { name: "+ 10 pages", exact: true }).click();
    await expect(book).toContainText("72 / 100 pages");
    await page.reload();
    await expect(book).toContainText("72 / 100 pages");
    await book.getByRole("link", { name: "View Continue book", exact: true }).click();
    await page.getByLabel("Current page", { exact: true }).fill("98");
    await page.getByLabel("Current page", { exact: true }).press("Enter");
    await expect(page.getByLabel("Current page", { exact: true })).toBeEnabled();
    await page.goBack();
    await expect(book).toContainText("98 / 100 pages");
    await book.getByRole("button", { name: "+ 2 pages", exact: true }).click();
    await expect(book).toHaveCount(0);
    await expect(page.getByText("Nothing in progress here yet", { exact: true })).toBeVisible();
    const completion = page.locator('[data-slot="toast"]').filter({ hasText: "Continue book" });
    await expect(completion).toContainText("Marked completed");
    await completion.getByRole("button", { name: "View details", exact: true }).click();
    await expect(page).toHaveURL(/\/details\/books\/301/);
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeVisible();
    await page.goBack();
    await page.reload();
    await expect(book).toHaveCount(0);

    await page.goto("/settings/content-lists");
    await page.getByRole("switch", { name: "Anime List", exact: true }).check();
    await page.getByRole("button", { name: "Update Settings", exact: true }).click();
    await expect(page.getByText("Your list settings have been updated.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "MyMedia", exact: true }).click();
    await page.getByRole("menuitem", { name: "Continue", exact: true }).click();
    const anime = page.getByRole("article", { name: "Disabled anime sentinel", exact: true });
    await expect(anime).toBeVisible();
    await anime.getByRole("button", { name: "+ 1 episode", exact: true }).click();
    await expect(anime).toContainText("S1/S1 · Eps. 2/3");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("article")).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(series.getByRole("button", { name: "+ 1 episode", exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toBeInViewport({ ratio: 1 });
    await expect.poll(async () => (await firstCard.getByRole("button", { name: /^\+ / }).boundingBox())!.height).toBeGreaterThanOrEqual(44);

    await page.goto(`/profile/${users.owner.name}`);
    const previewAnime = preview.getByRole("article", { name: "Disabled anime sentinel", exact: true });
    await expect(previewAnime).toContainText("S1/S1 · Eps. 2/3");
    await previewAnime.getByRole("button", { name: "+ 1 episode", exact: true }).click();
    await expect(previewAnime).toHaveCount(0);
    await expect(page.getByText("S01.E03", { exact: true }).locator("..")).toContainText("S01.E01");
    await expect(page.getByText("Completed", { exact: true }).locator("..").filter({ hasText: "Watching" })).toBeVisible();
    await preview.getByRole("link", { name: "View all in-progress media" }).click();
    await expect(page.getByRole("article")).toHaveCount(4);
    await expect(anime).toHaveCount(0);
    await page.reload();
    await expect(anime).toHaveCount(0);

    // Games and unknown-length manga are completed manually on their details pages.
    await game.getByRole("link", { name: "View Continue game", exact: true }).click();
    await expect(page).toHaveURL(/\/details\/games\/401/);
    await expect(page.getByLabel("Playtime (hours)", { exact: true })).toHaveValue("3.5");
    await page.getByLabel("Playtime (hours)", { exact: true }).fill("4");
    await page.getByLabel("Playtime (hours)", { exact: true }).press("Enter");
    await expect(page.getByLabel("Playtime (hours)", { exact: true })).toBeEnabled();
    await page.getByRole("combobox").filter({ hasText: "Playing" }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeEnabled();
    await page.goBack();
    await expect(game).toHaveCount(0);

    await manga.getByRole("link", { name: "View Continue manga", exact: true }).click();
    await expect(page).toHaveURL(/\/details\/manga\/501/);
    await page.getByLabel("Current chapter", { exact: true }).fill("12");
    await page.getByLabel("Current chapter", { exact: true }).press("Enter");
    await expect(page.getByLabel("Current chapter", { exact: true })).toBeEnabled();
    await page.getByRole("combobox").filter({ hasText: "Reading" }).click();
    await page.getByRole("option", { name: "Completed", exact: true }).click();
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeEnabled();
    await page.goBack();
    await expect(manga).toHaveCount(0);

    await page.goto(`/profile/${users.owner.name}/history`);
    await expect(page.getByText("S03.E02", { exact: true }).locator("..")).toContainText("S01.E02");
});


test("counts quick increments from two stale Continue tabs without losing progress", async ({ page, context }) => {
    await runBun(["src/routes/_main/_private/continue/-fixtures.ts"]);
    await signIn(page);
    await page.goto("/continue");
    const otherTab = await context.newPage();
    await otherTab.goto("/continue");

    const manga = page.getByRole("article", { name: "Continue manga", exact: true });
    const otherManga = otherTab.getByRole("article", { name: "Continue manga", exact: true });
    await expect(manga).toContainText("7 / ? chapters");
    await expect(otherManga).toContainText("7 / ? chapters");
    await Promise.all([
        manga.getByRole("button", { name: "+ 1 chapter", exact: true }).click(),
        otherManga.getByRole("button", { name: "+ 1 chapter", exact: true }).click(),
    ]);
    await expect(manga).toContainText(/(?:8|9) \/ \? chapters/);
    await expect(otherManga).toContainText(/(?:8|9) \/ \? chapters/);
    await page.reload();
    await expect(manga).toContainText("9 / ? chapters");

    const game = page.getByRole("article", { name: "Continue game", exact: true });
    const otherGame = otherTab.getByRole("article", { name: "Continue game", exact: true });
    await expect(game).toContainText("1h 30m played");
    await expect(otherGame).toContainText("1h 30m played");
    await Promise.all([
        game.getByRole("button", { name: "+ 60 min", exact: true }).click(),
        otherGame.getByRole("button", { name: "+ 60 min", exact: true }).click(),
    ]);
    await expect(game).toContainText(/(?:2|3)h 30m played/);
    await expect(otherGame).toContainText(/(?:2|3)h 30m played/);
    await page.reload();
    await expect(game).toContainText("3h 30m played");

    const book = page.getByRole("article", { name: "Continue book", exact: true });
    const otherBook = otherTab.getByRole("article", { name: "Continue book", exact: true });
    await Promise.all([
        book.getByRole("button", { name: "+ 5 pages", exact: true }).click(),
        otherBook.getByRole("button", { name: "+ 5 pages", exact: true }).click(),
    ]);
    await expect(book).toHaveCount(0);
    await expect(otherBook).toHaveCount(0);
    await otherTab.close();

    await page.goto(`/profile/${users.owner.name}/history`);
    await expect(page.getByText("ch. 9", { exact: true }).locator("..")).toContainText("ch. 7");
    await page.goto("/details/books/301");
    await expect(page.getByLabel("Current page", { exact: true })).toHaveValue("100");
    await expect(page.getByRole("combobox").filter({ hasText: "Completed" })).toBeVisible();
});


test("keeps Continue personal and respects profile visibility for read-only progress", async ({ page, browser, baseURL }) => {
    await runBun(["src/routes/_main/_private/continue/-fixtures.ts"]);

    for (const account of ["owner", "restricted"] as const) {
        const response = await page.goto(`/profile/${users[account].name}`);
        await expect(page.getByText(`This content is ${users[account].privacy}`, { exact: true })).toBeVisible();
        await expect(page.getByRole("region", { name: "In progress", exact: true })).toHaveCount(0);
        expect(await response!.text()).not.toContain("Continue book");
    }
    await page.goto(`/profile/${users.follower.name}`);
    const publicPreview = page.getByRole("region", { name: "In progress", exact: true });
    await expect(publicPreview.getByRole("article")).toHaveCount(1);
    await expect(publicPreview).toContainText("0h 30m played");
    await expect(publicPreview.getByRole("button")).toHaveCount(0);
    await expect(publicPreview.getByRole("link", { name: "View Continue game", exact: true })).toBeVisible();

    await page.goto("/continue");
    await expect(page).toHaveURL(/\/login\?/);
    expect(new URL(new URL(page.url()).searchParams.get("redirect")!, page.url()).pathname).toBe("/continue");
    await page.getByLabel("Email", { exact: true }).fill(users.stranger.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Login", exact: true }).click();
    await expect(page).toHaveURL(/\/continue(?:\?|$)/);
    await expect(page.getByText("Nothing in progress here yet", { exact: true })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByText("Another reader sentinel", { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("article")).toHaveCount(0);

    await page.goto(`/profile/${users.owner.name}`);
    await expect(page.getByText("This content is private", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "In progress", exact: true })).toHaveCount(0);
    await page.goto(`/profile/${users.restricted.name}`);
    const restrictedPreview = page.getByRole("region", { name: "In progress", exact: true });
    await expect(restrictedPreview).toContainText("25 / 100 pages");
    await expect(restrictedPreview.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
    await expect(restrictedPreview.getByRole("button")).toHaveCount(0);

    const follower = await browser.newPage({ baseURL });
    try {
        await signIn(follower, "follower");
        await follower.goto(`/profile/${users.owner.name}`);
        await expect(follower.getByRole("heading", { name: users.owner.name, exact: true })).toBeVisible();
        await expect(follower.getByRole("region", { name: "Continue", exact: true })).toHaveCount(0);
        await expect(follower.getByRole("link", { name: "View all in-progress media" })).toHaveCount(0);
        const sharedPreview = follower.getByRole("region", { name: "In progress", exact: true });
        await expect(sharedPreview.getByRole("article")).toHaveCount(5);
        await expect(sharedPreview.getByRole("article").first()).toHaveAccessibleName("Continue manga");
        await expect(sharedPreview).toContainText("1h 30m played");
        await expect(sharedPreview).toContainText("95 / 100 pages");
        await expect(sharedPreview.getByRole("article", { name: "Continue book", exact: true }).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "95");
        await expect(sharedPreview.getByRole("button")).toHaveCount(0);
        await expect(sharedPreview.getByText(/sentinel|Endless game|Multiplayer game/)).toHaveCount(0);
        await follower.setViewportSize({ width: 390, height: 844 });
        await expect(sharedPreview.getByRole("article")).toHaveCount(2);
        expect(await follower.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    finally {
        await follower.close();
    }
});
