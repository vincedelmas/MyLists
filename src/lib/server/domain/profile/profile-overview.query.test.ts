import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, RatingSystemType, SocialState} from "@/lib/utils/enums";
import {eq} from "drizzle-orm";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { SocialGraphQuery } = await import("../social/social-graph.query");
const { ProfileOverviewQuery } = await import("./profile-overview.query");


describe("profile overview query", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;
    let service: InstanceType<typeof ProfileOverviewQuery>;

    const stats = {
        userPreComputedStatsSummary: vi.fn(async () => ({ total: "global" })),
        userPerMediaSummaryStats: vi.fn(async () => [{ mediaType: MediaType.SERIES, total: "series" }]),
    };
    const customization = {
        resolveHighlightedMedia: vi.fn(async () => ({ overview: { items: [] } })),
    };
    const updates = {
        getUserUpdates: vi.fn(async () => [{ id: "own-update" }]),
        getFollowsUpdates: vi.fn(async () => [{ id: "follow-update" }]),
    };
    const achievements = {
        getAchievementsDetails: vi.fn(async () => [{ id: "achievement" }]),
    };

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values([
            user(1, "owner", PrivacyType.PRIVATE),
            user(2, "viewer", PrivacyType.PUBLIC),
            user(3, "member", PrivacyType.RESTRICTED),
        ]);
        await db.insert(schema.profileMediaChannel).values([
            { userId: 1, kind: MediaType.MANGA, enabled: false },
            { userId: 1, kind: MediaType.SERIES, enabled: true },
        ]);
        await db.insert(schema.libraryStats).values([
            { userId: 1, kind: MediaType.SERIES, timeSpentMinutes: 120 },
            { userId: 1, kind: MediaType.MANGA, timeSpentMinutes: 45 },
        ]);
        await db.insert(schema.followers).values([
            { followerId: 2, followedId: 1, status: SocialState.ACCEPTED },
            { followerId: 1, followedId: 3, status: SocialState.ACCEPTED },
        ]);
        service = new ProfileOverviewQuery(
            stats as any,
            customization as any,
            updates as any,
            achievements as any,
            new SocialGraphQuery(),
        );
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
        vi.clearAllMocks();
    });

    it("returns the intentionally public identity shell from normalized channels", async () => {
        await expect(service.getPublicHeader(owner, 2)).resolves.toEqual({
            userData: {
                id: 1,
                name: "owner",
                image: null,
                privacy: PrivacyType.PRIVATE,
                createdAt: "2026-01-01 00:00:00",
                backgroundImage: "default.jpg",
                userMediaSettings: [
                    { active: false, timeSpent: 45 },
                    { active: true, timeSpent: 120 },
                ],
            },
            social: {
                followersCount: 1,
                followsCount: 1,
                followId: 1,
                followStatus: { followerId: 2, followedId: 1, status: SocialState.ACCEPTED },
            },
        });
    });

    it.each([
        PrivacyType.PUBLIC,
        PrivacyType.RESTRICTED,
        PrivacyType.PRIVATE,
    ])("keeps the %s profile header anonymous-safe", async (privacy) => {
        await db.update(schema.user).set({ privacy }).where(eq(schema.user.id, owner.id));

        await expect(service.getPublicHeader({ ...owner, privacy }, undefined)).resolves.toMatchObject({
            social: {
                followId: owner.id,
                followStatus: undefined,
                followersCount: 1,
                followsCount: 1,
            },
            userData: {
                id: owner.id,
                name: owner.name,
                privacy,
                userMediaSettings: [
                    { active: false, timeSpent: 45 },
                    { active: true, timeSpent: 120 },
                ],
            },
        });
    });

    it("composes the protected overview only with a matching library scope", async () => {
        await expect(service.getOverview(owner, 2, { ownerId: 1, actorId: 2, reason: "follower" }))
            .resolves.toMatchObject({
                followsCount: 1,
                userUpdates: [{ id: "own-update" }],
                followsUpdates: [{ id: "follow-update" }],
                achievements: [{ id: "achievement" }],
                mediaGlobalSummary: { total: "global" },
                perMediaSummary: [{ mediaType: MediaType.SERIES, total: "series" }],
                highlightedMedia: { overview: { items: [] } },
                userFollows: {
                    follows: [expect.objectContaining({ id: 3, username: "member", myFollowStatus: null })],
                },
                userData: {
                    id: 1,
                    userMediaSettings: [
                        { mediaType: MediaType.MANGA, active: false, timeSpent: 45 },
                        { mediaType: MediaType.SERIES, active: true, timeSpent: 120 },
                    ],
                },
            });

        await expect(service.getOverview(owner, 2, { ownerId: 3, actorId: 2, reason: "member" }))
            .rejects.toThrow("cannot read profile");
    });
});


const owner = {
    id: 1,
    name: "owner",
    image: null,
    privacy: PrivacyType.PRIVATE,
    createdAt: "2026-01-01 00:00:00",
    ratingSystem: RatingSystemType.SCORE,
    backgroundImage: "default.jpg",
};


const user = (id: number, name: string, privacy: PrivacyType) => ({
    id,
    name,
    privacy,
    email: `${name}@example.com`,
    emailVerified: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
});
