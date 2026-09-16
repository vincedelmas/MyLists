import {promisify} from "node:util";
import {password, users} from "./data";
import {execFile} from "node:child_process";
import {expect, type Page, test as base} from "@playwright/test";


const execFileAsync = promisify(execFile);


export const runBun = (args: string[]) => {
    return execFileAsync("bun", ["--no-env-file", ...args]);
}


export const test = base.extend<{ resetDatabase: void }>({
    resetDatabase: [async ({}, use) => {
        await runBun(["scripts/e2e/database.ts"]);
        await use();
    }, { auto: true }],
});


export {expect};


export async function signIn(page: Page, account: keyof typeof users = "owner") {
    await page.goto("/login");

    await page.getByLabel("Email", { exact: true }).fill(users[account].email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Login", exact: true }).click();

    await expect(page).not.toHaveURL(/\/login/);
}
