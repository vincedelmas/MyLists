import Database from "bun:sqlite";
import * as schema from "@/lib/server/database/schema";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {BunSQLiteDatabase, drizzle} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {anime, animeList, followers, user, userMediaSettings} from "@/lib/server/database/schema";
import {MediaType, PrivacyType, RoleType, SocialState, Status} from "@/lib/utils/enums";
import {toActor} from "@/lib/server/authorization";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));


vi.mock("@/lib/server/database/async-storage", () => ({
    getDbClient: () => dbContext.db,
}));


const { createTvRepository } = await import("@/lib/server/domain/media/tv/tv.repository");
const { animeServerDefinition } = await import("@/lib/media-definitions/tv/anime/anime.definition.server");


describe("media community activity visibility", () => {
    let sqlite: Database;
    let db: BunSQLiteDatabase<typeof schema>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;

        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        const timestamp = "2026-01-01 00:00:00";
        await db.insert(user).values([
            {
                id: 1,
                name: "viewer",
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                privacy: PrivacyType.PUBLIC,
                email: "viewer@example.com",
            },
            {
                id: 2,
                name: "public-user",
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                privacy: PrivacyType.PUBLIC,
                email: "public@example.com",
            },
            {
                id: 3,
                name: "restricted-user",
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                privacy: PrivacyType.RESTRICTED,
                email: "restricted@example.com",
            },
            {
                id: 4,
                name: "accepted-private-user",
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                privacy: PrivacyType.PRIVATE,
                email: "accepted-private@example.com",
            },
            {
                id: 5,
                name: "requested-private-user",
                emailVerified: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                privacy: PrivacyType.PRIVATE,
                email: "requested-private@example.com",
            },
        ]);
        await db.insert(followers).values([
            {
                followerId: 1,
                followedId: 4,
                status: SocialState.ACCEPTED,
            },
            {
                followerId: 1,
                followedId: 5,
                status: SocialState.REQUESTED,
            },
        ]);
        await db.insert(userMediaSettings).values([2, 3, 4, 5].map((userId) => ({
            userId,
            active: true,
            mediaType: MediaType.ANIME,
        })));
        await db.insert(anime).values({
            id: 100,
            apiId: 100,
            duration: 24,
            totalSeasons: 1,
            totalEpisodes: 12,
            name: "Community anime",
            imageCover: "anime.jpg",
        });
        await db.insert(animeList).values([2, 3, 4, 5].map((userId, index) => ({
            userId,
            mediaId: 100,
            id: userId,
            rating: 6 + index,
            currentSeason: 1,
            currentEpisode: 12,
            status: Status.COMPLETED,
        })));
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it.each([
        ["anonymous", toActor(), [2], 6],
        ["accepted follower", toActor({ id: 1, role: RoleType.USER }), [2, 3, 4], 7],
        ["manager follower", toActor({ id: 1, role: RoleType.MANAGER }), [2, 3, 4], 7],
        ["unrelated manager", toActor({ id: 99, role: RoleType.MANAGER }), [2, 3], 6.5],
        ["private owner", toActor({ id: 4, role: RoleType.USER }), [2, 3, 4], 7],
        ["admin", toActor({ id: 99, role: RoleType.ADMIN }), [2, 3, 4, 5], 7.5],
    ])("filters rows and aggregates for an %s actor", async (_label, actor, expectedIds, expectedAverage) => {
        const repository = createTvRepository(animeServerDefinition);
        const result = await repository.getMediaCommunityActivity(actor, 100, { perPage: 20 });

        expect(result.items.map(({ id }) => id)).toEqual(expectedIds);
        expect(result.total).toBe(expectedIds.length);
        expect(result.stats.total).toBe(expectedIds.length);
        expect(result.stats.averageRating).toBe(expectedAverage);
    });
});
