import type {Locator, Page} from "@playwright/test";
import {expect} from "./fixtures";


export async function listAction(page: Page, name: string, card?: Locator) {
    if (await page.getByRole("menu").count()) await page.keyboard.press("Escape");
    await (card ?? page).getByRole("button", {
        name: card ? /^Actions for / : "Quick actions",
        exact: true,
    }).click();
    return page.getByRole("menuitem", { name, exact: true });
}


export async function expectListHeaderBack(page: Page, title: string, label = "Lists & collections") {
    const main = page.getByRole("main");
    const header = main.locator("header").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await expect(header.getByRole("link", { name: label, exact: true })).toBeVisible();
    await expect(main.getByRole("link", { name: label, exact: true })).toHaveCount(1);
}


export async function expectActionsBesideDisplay(page: Page) {
    const controls = page.getByRole("group", { name: "Media browsing controls", exact: true });
    const actions = controls.getByRole("button", { name: "Quick actions", exact: true });
    const table = controls.getByRole("button", { name: "Table view", exact: true });
    await expect(actions).toBeVisible();
    const actionsBox = (await actions.boundingBox())!;
    const tableBox = (await table.boundingBox())!;
    expect(Math.abs(actionsBox.y - tableBox.y)).toBeLessThan(8);
    expect(actionsBox.x).toBeGreaterThanOrEqual(tableBox.x + tableBox.width);
    expect(actionsBox.x - tableBox.x - tableBox.width).toBeLessThan(16);
    await expect(page.getByRole("main").getByRole("button", { name: "Quick actions", exact: true })).toHaveCount(1);
}
