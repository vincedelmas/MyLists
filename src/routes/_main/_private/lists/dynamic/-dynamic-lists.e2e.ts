import {expect, runBun, signIn, test} from "../../../../../../scripts/e2e/fixtures";
import {listAction} from "../../../../../../scripts/e2e/list-actions";
import {movies, users} from "../../../../../../scripts/e2e/data";


test("creates, automatically counts, edits and deletes an owner dynamic list", async ({ page, baseURL }) => {
    await runBun(["src/routes/_main/_private/lists/dynamic/-fixtures.ts"]);
    await signIn(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/lists/${users.owner.name}?kind=dynamic`);
    await expect(page.getByRole("heading", { name: "Lists & collections", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("link", { name: "Create dynamic list", exact: true }).click();
    const editor = page.getByRole("form", { name: "Dynamic list editor", exact: true });
    await expect(page).toHaveURL(/\/lists\/dynamic\/create$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(editor.getByRole("button", { name: "Create dynamic list", exact: true })).toBeVisible();
    const startingPoint = page.getByRole("combobox", { name: "List starting point", exact: true });
    await editor.getByLabel("List name", { exact: true }).fill("Keep my draft");
    await startingPoint.click();
    await page.getByRole("option", { name: "Plans older than six months", exact: true }).click();
    const discard = page.getByRole("alertdialog", { name: "Discard your changes?", exact: true });
    await discard.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(editor.getByLabel("List name", { exact: true })).toHaveValue("Keep my draft");
    await expect(startingPoint).toContainText("Blank list");
    await startingPoint.click();
    await page.getByRole("option", { name: "Plans older than six months", exact: true }).click();
    await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(editor.getByLabel("List name", { exact: true })).toHaveValue("Plans older than six months");
    await expect(editor.getByRole("complementary", { name: "Preview dynamic list", exact: true }).getByText("2 media", { exact: true })).toBeVisible();
    await startingPoint.click();
    await page.getByRole("option", { name: "Blank list", exact: true }).click();
    await expect(editor.getByLabel("List name", { exact: true })).toHaveValue("My list");
    await editor.getByLabel("List name", { exact: true }).fill("My weekend plans");
    const summary = editor.getByRole("complementary", { name: "Preview dynamic list", exact: true });
    await expect(summary.getByText("3 media", { exact: true })).toBeVisible();
    await editor.getByLabel("Added more than … months ago").fill("6");
    await expect(summary.getByText("2 media", { exact: true })).toBeVisible();
    await expect(summary.getByText("Added over 6 months ago", { exact: true })).toBeVisible();
    await expect(editor.getByRole("button", { name: "Preview matches", exact: true })).toHaveCount(0);
    await expect(summary.locator("img")).toHaveCount(0);
    await expect(summary.getByRole("list")).toHaveCount(0);
    await editor.getByLabel("Title contains", { exact: true }).fill("Does not match any title");
    await expect(summary.getByText("0 media", { exact: true })).toBeVisible();
    await editor.getByLabel("Title contains", { exact: true }).fill("");
    await expect(summary.getByText("2 media", { exact: true })).toBeVisible();
    await editor.getByRole("button", { name: "Create dynamic list", exact: true }).click();
    await expect(page.getByRole("heading", { name: "My weekend plans", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const viewUrl = page.url();
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(page.getByText("A long-awaited book", { exact: true })).toBeVisible();
    await expect(page.getByText(movies.editable.name, { exact: true })).toHaveCount(0);

    await (await listAction(page, "Edit dynamic list")).click();
    await editor.getByLabel("List name", { exact: true }).fill("Old movie plans");
    await editor.getByRole("button", { name: "Movies", exact: true }).click();
    await editor.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Old movie plans", exact: true })).toBeVisible();
    await expect(page.getByText(movies.private.name, { exact: true })).toBeVisible();
    await expect(page.getByText("A long-awaited book", { exact: true })).toHaveCount(0);

    const strangerPage = await page.context().browser()!.newPage({ baseURL });
    try {
        await signIn(strangerPage, "stranger");
        await strangerPage.goto(viewUrl);
        await expect(strangerPage.getByText("This content is private", { exact: true })).toBeVisible();
        await expect(strangerPage.getByText("Old movie plans", { exact: true })).toHaveCount(0);
        await expect(strangerPage.getByText(movies.private.name, { exact: true })).toHaveCount(0);
    }
    finally {
        await strangerPage.context().close();
    }

    await (await listAction(page, "Delete dynamic list")).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete list", exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === `/lists/${users.owner.name}`);
    await expect(page.getByText("Old movie plans", { exact: true })).toHaveCount(0);
});
