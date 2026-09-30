import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";
import {formatDate, shiftDateInputValue, toDateInputValue} from "@/lib/utils/formatting/date";


test("browses dated releases by month and week, preserving filters and supporting mobile day details", async ({ page }, testInfo) => {
    await runBun(["src/routes/_main/_private/release-calendar/-fixtures.ts"]);
    await signIn(page);
    await page.goto("/release-calendar");
    await expect(page.getByRole("heading", { name: "Release Calendar", exact: true })).toBeVisible();
    const month = page.getByRole("table", { name: "Monthly release calendar" });
    await expect(month).toBeVisible();
    await expect(month.getByRole("link", { name: "Calendar series, S01 · E02", exact: true })).toBeVisible();
    await expect(month.getByRole("link", { name: /Undated|Dropped|Another user's|Past episode sentinel/ })).toHaveCount(0);

    await page.getByRole("button", { name: "About the release calendar" }).click();
    await expect(page.getByText("Series and anime show only the next known episode", { exact: false })).toBeVisible();
    await page.keyboard.press("Escape");

    const today = toDateInputValue(new Date(), { timeZone: "utc" });
    await month.getByRole("button", { name: `View releases for ${formatDate(today)}`, exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("link")).toHaveCount(6);
    await expect(dialog.getByRole("link", { name: "Calendar game, Game release", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "View this week" }).click();
    const week = page.getByRole("table", { name: "Weekly release calendar" });
    await expect(week).toBeVisible();
    await expect(week.getByRole("cell")).toHaveCount(7);
    await expect(page).toHaveURL(url => url.searchParams.get("view") === "week");
    await page.getByRole("button", { name: "Month view", exact: true }).click();
    await expect(month).toBeVisible();

    await page.getByRole("combobox", { name: "Filter by media type" }).click();
    await page.getByRole("option", { name: "games", exact: true }).click();
    await expect(page).toHaveURL(url => url.searchParams.get("mediaType") === "games");
    await expect(month.getByRole("link", { name: "Calendar game, Game release", exact: true })).toBeVisible();
    await expect(month.getByRole("link", { name: /Calendar series|Calendar movie/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Previous month", exact: true }).click();
    await expect(month.getByRole("link", { name: "Past calendar game, Game release", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Filter by media type" })).toContainText("games");
    await expect(month.getByRole("link", { name: "Past calendar game, Game release", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    await expect(month.getByRole("link", { name: "Calendar game, Game release", exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: "Filter by media type" }).click();
    await page.getByRole("option", { name: "All media", exact: true }).click();
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    await expect(month.getByRole("link", { name: "Future calendar movie, Movie release", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await expect(month.getByRole("link", { name: "Calendar series, S01 · E02", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Choose month", exact: true }).click();
    const previousMonth = shiftDateInputValue(`${today.slice(0, 7)}-01`, { months: -1 }).slice(0, 7);
    const monthInput = page.getByLabel("Jump to a month");
    await monthInput.focus();
    await monthInput.press("ArrowRight");
    await monthInput.press("Backspace");
    await monthInput.pressSequentially(previousMonth.slice(0, 4));
    await expect(monthInput).toBeVisible();
    await expect(monthInput).toHaveValue(`${previousMonth.slice(0, 4)}-${today.slice(5, 7)}`);
    await page.getByLabel("Jump to a month").fill(previousMonth);
    await page.getByRole("button", { name: "Go to month", exact: true }).click();
    await expect(month.getByRole("link", { name: "Past calendar movie, Movie release", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath("month-desktop.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("month-mobile.png"), fullPage: true });
    await month.getByRole("button", { name: `6 releases on ${formatDate(today)}`, exact: true }).click();
    await expect(dialog.getByRole("link")).toHaveCount(6);
    await dialog.getByRole("button", { name: "View this week" }).click();
    await expect(week).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("week-mobile.png"), fullPage: true });
});


test("restores a bookmarked calendar period, view and media filter", async ({ page }) => {
    await runBun(["src/routes/_main/_private/release-calendar/-fixtures.ts"]);
    await signIn(page);
    const today = toDateInputValue(new Date(), { timeZone: "utc" });
    const date = shiftDateInputValue(`${today.slice(0, 7)}-01`, { months: -1, days: 14 });
    await page.goto(`/release-calendar?date=${date}&view=week&mediaType=movies`);
    const week = page.getByRole("table", { name: "Weekly release calendar" });
    await expect(week.getByRole("link", { name: "Past calendar movie, Movie release", exact: true })).toBeVisible();
    await expect(week.getByRole("link", { name: /Past calendar game|Calendar series|Calendar anime/ })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Filter by media type" })).toContainText("movies");
    await page.reload();
    await expect(week.getByRole("link", { name: "Past calendar movie, Movie release", exact: true })).toBeVisible();
    await expect(page).toHaveURL(url => url.searchParams.get("date") === date
        && url.searchParams.get("view") === "week" && url.searchParams.get("mediaType") === "movies");
});
