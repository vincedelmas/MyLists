import {movies, users} from "../../../../../scripts/e2e/data";
import {expect, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("enforces profile privacy for anonymous visitors, strangers, owners, and followers", async ({ page, browser, baseURL }) => {
    await page.goto(`/profile/${users.owner.name}`);

    // Headers are intentionally public, but list contents are protected
    await expect(page.getByRole("heading", { name: users.owner.name, exact: true })).toBeVisible();
    const privateResponse = await page.goto(`/list/movies/${users.owner.name}`);
    await expect(page.getByText("This content is private", { exact: true })).toBeVisible();

    expect(await privateResponse!.text()).not.toContain(movies.private.name);
    await expect(page.getByRole("link", { name: `View ${movies.private.name}` })).toHaveCount(0);

    const restrictedResponse = await page.goto(`/list/movies/${users.restricted.name}`);
    await expect(page.getByText("This content is restricted", { exact: true })).toBeVisible();

    expect(await restrictedResponse!.text()).not.toContain(movies.private.name);

    for (const account of ["stranger", "owner", "follower"] as const) {
        const visitor = await browser.newPage({ baseURL });
        try {
            await signIn(visitor, account);

            const response = await visitor.goto(`/list/movies/${users.owner.name}`);
            const privateMovie = visitor.getByRole("link", { name: `View ${movies.private.name}`, exact: true });

            if (account === "stranger") {
                await expect(visitor.getByText("This content is private", { exact: true })).toBeVisible();
                await expect(privateMovie).toHaveCount(0);
                expect(await response!.text()).not.toContain(movies.private.name);
            }
            else {
                await expect(privateMovie).toBeVisible();
            }

            await visitor.goto(`/list/movies/${users.restricted.name}`);
            await expect(visitor.getByRole("link", { name: `View ${movies.private.name}`, exact: true })).toBeVisible();
        }
        finally {
            await visitor.close();
        }
    }
});
