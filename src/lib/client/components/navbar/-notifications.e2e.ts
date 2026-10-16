import {movies, users} from "../../../../../scripts/e2e/data";
import {expect, runBun, signIn, test} from "../../../../../scripts/e2e/fixtures";


test("activates notification categories explicitly and safely switches cached panels", async ({ page }) => {
    await runBun(["--eval", `
        if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use notification fixtures only with bun run test:e2e.");

        const { db } = await import("./src/lib/server/database/db");
        const { MediaType, SocialNotifType } = await import("./src/lib/utils/enums");
        const { mediaNotifications, socialNotifications } = await import("./src/lib/server/database/schema");
        const { movies, users } = await import("./scripts/e2e/data");

        db.insert(mediaNotifications).values({
            userId: users.owner.id,
            mediaId: movies.editable.id,
            mediaType: MediaType.MOVIES,
            name: movies.editable.name,
            releaseDate: "2026-09-01",
        }).run();

        db.insert(socialNotifications).values({
            userId: users.owner.id,
            actorId: users.follower.id,
            type: SocialNotifType.NEW_FOLLOWER,
        }).run();
    `]);
    await signIn(page);
    await page.goto(`/details/movies/${movies.editable.id}`);
    await page.getByRole("button", { name: "Notifications", exact: true }).click();

    const tabs = page.getByRole("tablist", { name: "Notification categories", exact: true });
    const media = tabs.getByRole("tab", { name: /^Media/ });
    const social = tabs.getByRole("tab", { name: /^Social/ });
    const mediaPanel = page.getByRole("tabpanel", { name: /^Media/ });
    const socialPanel = page.getByRole("tabpanel", { name: /^Social/ });

    await expect(mediaPanel.getByRole("link", { name: movies.editable.name, exact: true })).toBeVisible();
    await media.focus();
    await media.press("ArrowRight");
    await expect(social).toBeFocused();
    await expect(media).toHaveAttribute("aria-selected", "true");
    await expect(media.getByText("1", { exact: true })).toBeVisible();

    await social.press("Enter");
    await expect(socialPanel.getByRole("link", { name: users.follower.name, exact: true })).toBeVisible();
    await expect(media.getByText("1", { exact: true })).toHaveCount(0);

    await social.press("ArrowLeft");
    await media.press("Enter");
    await expect(mediaPanel.getByRole("link", { name: movies.editable.name, exact: true })).toBeVisible();
    await expect(social.getByText("1", { exact: true })).toHaveCount(0);

    await media.press("ArrowRight");
    await social.press("Space");
    await expect(socialPanel.getByRole("link", { name: users.follower.name, exact: true })).toBeVisible();
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
});
