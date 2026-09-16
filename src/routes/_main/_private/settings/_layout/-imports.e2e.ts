import {movies, privateImport, users} from "../../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../../scripts/e2e/fixtures";


test("uploads a CSV, processes it, and preserves the selected import on reload", async ({ page }) => {
    await signIn(page);
    await page.goto("/settings/imports/mylists");

    await page
        .getByLabel("Click to choose a CSV file")
        .setInputFiles({
            name: "movies.csv",
            mimeType: "text/csv",
            buffer: Buffer.from([
                "formatVersion,mediaType,mediaName,releaseDate,externalApiSource,externalApiId,status,redo,total,rating,favorite,comment",
                `2,movies,${movies.imported.name},2020-01-01,tmdb,${movies.imported.id},Completed,0,1,8,true,Imported in the browser`,
                "2,movies,Invalid CSV row,2020-01-01,tmdb,999,Completed,0,1,99,false,Invalid rating",
            ].join("\n")),
        });

    await page.getByRole("button", { name: "Import File", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/imports\/mylists\?.*jobId=\d+/);

    const jobId = new URL(page.url()).searchParams.get("jobId");
    await expect(page.getByText(`Job #${jobId}`, { exact: true }).last()).toBeVisible();
    await expect(page.getByText("Next in queue. Waiting for processing to start.")).toBeVisible();

    await runBun(["src/cli/index.ts", "import-drain"]);

    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(page.getByText("Import finished.", { exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Invalid CSV row", exact: true })).toBeVisible();

    await page.reload();
    expect(new URL(page.url()).searchParams.get("jobId")).toBe(jobId);
    await expect(page.getByText("Import finished.", { exact: true })).toBeVisible();

    await page.goto(`/list/movies/${users.owner.name}`);
    await expect(page.getByRole("link", { name: `View ${movies.imported.name}`, exact: true })).toBeVisible();
});

test("denies another user access to import details, issues, and deletion", async ({ page, browser, baseURL }) => {
    await signIn(page);
    await page.goto(`/settings/imports/mylists?jobId=${privateImport.id}`);
    await expect(page.getByRole("cell", { name: privateImport.name, exact: true })).toBeVisible();

    const stranger = await browser.newPage({ baseURL });
    try {
        await signIn(stranger, "stranger");
        await stranger.goto(`/settings/imports/mylists?jobId=${privateImport.id}`);

        await expect(stranger.getByText("This import job could not be loaded.")).toBeVisible();
        await expect(stranger.getByText(privateImport.name, { exact: true })).toHaveCount(0);

        // Import Vite client stubs so requests cross server-function middleware
        const outcomes = await stranger.evaluate(async jobId => {
            const modulePath = "/src/lib/server/functions/imports.ts";
            const { getImportJob, getImportJobIssues, postDeleteImportJob } = await import(modulePath);

            const results = await Promise.allSettled([
                getImportJob({ data: { jobId } }),
                postDeleteImportJob({ data: { jobId } }),
                getImportJobIssues({ data: { jobId, page: 1 } }),
            ]);

            return results.map(result => result.status === "rejected" ? result.reason : result.value);
        }, privateImport.id);

        expect(outcomes).toEqual([
            expect.objectContaining({ isNotFound: true }),
            expect.objectContaining({ isNotFound: true }),
            expect.objectContaining({ isNotFound: true }),
        ]);

        await page.reload();
        await expect(page.getByRole("cell", { name: privateImport.name, exact: true })).toBeVisible();
    }
    finally {
        await stranger.close();
    }
});
