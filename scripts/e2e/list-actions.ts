import type {Page} from "@playwright/test";
import {expect} from "./fixtures";


export async function listAction(page: Page, name: string) {
    if (await page.getByRole("menu").count()) await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await page.getByRole("button", {
        name: "Quick actions",
        exact: true,
    }).click();
    return page.getByRole("menuitem", { name, exact: true });
}
