import {expect, signIn, test} from "../../../../../scripts/e2e/fixtures";
import {privateCollection, publicCollection} from "../../../../../scripts/e2e/data";


test("protects private collection payloads while keeping public collections accessible", async ({ page, browser, baseURL }) => {
    await signIn(page);
    await page.goto(`/collections/${privateCollection.id}`);

    await expect(page.getByRole("heading", { name: privateCollection.title, exact: true })).toBeVisible();
    await expect(page.getByText(privateCollection.description, { exact: true })).toBeVisible();

    const visitor = await browser.newPage({ baseURL });
    try {
        for (const account of ["anonymous", "stranger"] as const) {
            if (account === "stranger") {
                await signIn(visitor, account);
            }

            const response = await visitor.goto(`/collections/${privateCollection.id}`);

            await expect(visitor.getByText("This content is private", { exact: true })).toBeVisible();
            expect(await response!.text()).not.toContain(privateCollection.description);
            await expect(visitor.getByText(privateCollection.title, { exact: true })).toHaveCount(0);

            const outcome = await visitor.evaluate(async collectionId => {
                const modulePath = "/src/lib/server/functions/collections.ts";
                const { getReadCollectionDetails } = await import(modulePath);

                try {
                    return { data: await getReadCollectionDetails({ data: { collectionId } }) };
                }
                catch (error) {
                    return { error: { name: (error as Error).name, message: (error as Error).message } };
                }
            }, privateCollection.id);

            expect(outcome).toEqual({ error: { name: "UnauthorizedError", message: "private" } });

            await visitor.goto(`/collections/${publicCollection.id}`);
            await expect(visitor.getByRole("heading", { name: publicCollection.title, exact: true })).toBeVisible();
        }
    }
    finally {
        await visitor.close();
    }
});
