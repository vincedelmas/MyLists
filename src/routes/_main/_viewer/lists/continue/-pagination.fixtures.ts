import {eq, and} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {MediaType, Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";

if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use pagination fixtures only with bun run test:e2e.");

db.transaction(() => {
    db.update(schema.userMediaSettings).set({ active: true }).where(and(
        eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.GAMES),
    )).run();
    db.insert(schema.games).values(Array.from({ length: 25 }, (_, i) => ({
        id: 500 + i, apiId: 500 + i, name: `Page game ${String(i + 1).padStart(2, "0")}`, imageCover: "default.jpg", lockStatus: true,
    }))).run();
    db.insert(schema.gamesList).values(Array.from({ length: 25 }, (_, i) => ({
        userId: 1, mediaId: 500 + i, status: Status.PLAYING, playtime: 120,
    }))).run();
    db.insert(schema.user).values(Array.from({ length: 25 }, (_, i) => ({
        id: 500 + i, name: `pageperson${String(i + 1).padStart(2, "0")}`, email: `person${i}@example.invalid`,
        emailVerified: true, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    }))).run();
    db.insert(schema.followers).values(Array.from({ length: 25 }, (_, i) => [
        { followerId: 1, followedId: 500 + i }, { followerId: 500 + i, followedId: 1 },
    ]).flat()).run();
});
