import {privateCollection, users} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";


test.beforeEach(async () => {
    await runBun(["--eval", `
        if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use isolated e2e fixtures.");
        const {db} = await import("./src/lib/server/database/db");
        const {dynamicLists} = await import("./src/lib/server/database/schema");
        db.insert(dynamicLists).values({id: 501, userId: 1, spec: {
            version: 1, title: "Pending list", mediaTypes: ["movies"], filters: {},
            sort: {field: "addedAt", direction: "desc"}, display: "grid"
        }}).run();
    `]);
});

for (const kind of ["dynamic", "collection"] as const) {
    test(`waits for pins and keeps pending feedback while pinning and deleting a ${kind}`, async ({page, baseURL}) => {
        await signIn(page);
        await page.goto(`/lists/${users.owner.name}?kind=${kind === "dynamic" ? "dynamic" : "collections"}`);
        const title = kind === "dynamic" ? "Pending list" : privateCollection.title;
        const urls = await page.evaluate(async () => {
            const pinsPath = "/src/lib/server/functions/profile-pins.ts";
            const listsPath = "/src/lib/server/functions/lists.ts";
            const dynamicPath = "/src/lib/server/functions/dynamic-lists.ts";
            const collectionsPath = "/src/lib/server/functions/collections.ts";
            const pins = await import(pinsPath);
            const lists = await import(listsPath);
            return {
                pin: pins.postSetProfilePin.url as string,
                deleteDynamic: (await import(dynamicPath)).postDeleteDynamicList.url as string,
                deleteCollection: (await import(collectionsPath)).postDeleteCollection.url as string,
                reads: [pins.getOwnProfilePins.url, pins.getProfilePins.url, lists.getUserListViews.url, lists.getListsCollections.url] as string[],
            };
        });
        const reads: string[] = [];
        page.on("request", request => {
            if (request.method() === "GET" && urls.reads.some(url => request.url().startsWith(new URL(url, baseURL).href))) reads.push(request.url());
        });
        const eligibility = Promise.withResolvers<void>();
        await page.route(`${new URL(urls.reads[0], baseURL).href}**`, async route => {
            await eligibility.promise;
            await route.continue();
        });
        const hubUrl = new URL(urls.reads[kind === "dynamic" ? 2 : 3], baseURL).href;
        let gate = Promise.withResolvers<void>();
        await page.route(`${new URL(urls.pin, baseURL).href}**`, async route => {
            const response = await route.fetch();
            await gate.promise;
            await route.fulfill({response});
        });
        try {
            await page.getByRole("button", {name: `Actions for ${title}`, exact: true}).click();
            const pinItem = page.getByRole("menuitem").filter({hasText: "Pin to profile"});
            await expect(pinItem).toBeDisabled();
            await expect(pinItem.getByLabel("Loading profile pins")).toBeVisible();
            eligibility.resolve();
            await expect(pinItem).toBeEnabled();
            await expect(pinItem.locator('[data-slot="spinner"]')).toHaveCount(0);
            reads.length = 0;
            for (const [label, next] of [["Pin to profile", "Unpin from profile"], ["Unpin from profile", "Pin to profile"]]) {
                gate = Promise.withResolvers<void>();
                const item = page.getByRole("menuitem").filter({hasText: label});
                await expect(item).toBeEnabled();
                reads.length = 0;
                await item.click();
                await expect(page.getByRole("menu")).toBeVisible();
                await expect(item).toBeDisabled();
                await expect(item.locator('[data-slot="spinner"]')).toBeVisible();
                gate.resolve();
                await expect(page.getByRole("menuitem").filter({hasText: next})).toBeEnabled();
                expect(reads.some(url => url.startsWith(hubUrl))).toBe(true);
            }
            let fail = true;
            const deleteUrl = kind === "dynamic" ? urls.deleteDynamic : urls.deleteCollection;
            await page.route(`${new URL(deleteUrl, baseURL).href}**`, async route => {
                if (fail) { fail = false; await route.abort(); return; }
                const response = await route.fetch();
                await gate.promise;
                await route.fulfill({response});
            });
            await page.getByRole("menuitem", {name: kind === "dynamic" ? "Delete dynamic list" : "Delete collection", exact: true}).click();
            reads.length = 0;
            const dialog = page.getByRole("alertdialog");
            const confirm = dialog.getByRole("button", {name: kind === "dynamic" ? "Delete list" : "Delete collection", exact: true});
            await confirm.click();
            await expect(confirm).toBeEnabled();
            await expect(dialog).toBeVisible();
            gate = Promise.withResolvers<void>();
            await confirm.click();
            await expect(confirm).toBeDisabled();
            await expect(confirm.locator('[data-slot="spinner"]')).toBeVisible();
            gate.resolve();
            await expect(dialog).not.toBeVisible();
            await expect(page.getByRole("button", {name: `Actions for ${title}`, exact: true})).toHaveCount(0);
            expect(reads.some(url => url.startsWith(hubUrl))).toBe(true);
        }
        finally { eligibility.resolve(); gate.resolve(); }
    });
}
