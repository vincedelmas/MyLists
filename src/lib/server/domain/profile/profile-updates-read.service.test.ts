import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, SocialState, Status, UpdateType} from "@/lib/utils/enums";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { ProfileUpdatesReadService } = await import("./profile-updates-read.service");


describe("normalized profile updates", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values([
            user(1, "owner", PrivacyType.PUBLIC),
            user(2, "viewer", PrivacyType.PUBLIC),
            user(3, "private", PrivacyType.PRIVATE),
            user(4, "restricted", PrivacyType.RESTRICTED),
            user(5, "public", PrivacyType.PUBLIC),
        ]);
        await db.insert(schema.catalogItem).values([3, 4, 5].map((id) => ({
            id: 100 + id,
            kind: MediaType.SERIES,
            primaryProvider: "tmdb" as const,
            primaryExternalId: String(id),
            name: `Canonical ${id}`,
            imageCover: `${id}.jpg`,
        })));
        await db.insert(schema.profileMediaChannel).values([3, 4, 5].map((userId) => ({
            userId,
            kind: MediaType.SERIES,
            enabled: true,
        })));
        await db.insert(schema.libraryEntry).values([3, 4, 5].map((userId) => ({
            id: 300 + userId,
            userId,
            catalogItemId: 100 + userId,
            status: Status.COMPLETED,
        })));
        await db.insert(schema.libraryChange).values([
            {
                id: 403,
                libraryEntryId: 303,
                mediaNameSnapshot: "Private historical alias",
                updateType: UpdateType.STATUS,
                payload: { old_value: null, new_value: Status.COMPLETED } as any,
                occurredAt: "2026-03-03 00:00:00",
            },
            {
                id: 404,
                libraryEntryId: 304,
                mediaNameSnapshot: "Restricted historical alias",
                updateType: UpdateType.STATUS,
                payload: { oldValue: Status.WATCHING, newValue: Status.COMPLETED },
                occurredAt: "2026-03-02 00:00:00",
            },
            {
                id: 405,
                libraryEntryId: 305,
                mediaNameSnapshot: "Public historical alias",
                updateType: UpdateType.STATUS,
                payload: { oldValue: null, newValue: Status.COMPLETED },
                occurredAt: "2026-03-01 00:00:00",
            },
        ]);
        await db.insert(schema.followers).values([
            { followerId: 1, followedId: 3, status: SocialState.ACCEPTED },
            { followerId: 1, followedId: 4, status: SocialState.ACCEPTED },
            { followerId: 1, followedId: 5, status: SocialState.ACCEPTED },
            { followerId: 2, followedId: 3, status: SocialState.ACCEPTED },
        ]);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("searches the event-time name and projects both historical payload encodings", async () => {
        const reader = new ProfileUpdatesReadService();
        await expect(reader.getUserUpdatesPaginated({ search: "historical alias" }, 3)).resolves.toEqual({
            total: 1,
            items: [expect.objectContaining({
                id: 403,
                mediaName: "Private historical alias",
                payload: { old_value: null, new_value: Status.COMPLETED },
            })],
        });
        await expect(reader.getUserUpdates(4)).resolves.toEqual([
            expect.objectContaining({
                id: 404,
                payload: { old_value: Status.WATCHING, new_value: Status.COMPLETED },
            }),
        ]);
    });

    it("keeps anonymous, logged-in restricted, and accepted private follow-feed visibility distinct", async () => {
        const reader = new ProfileUpdatesReadService();
        expect((await reader.getFollowsUpdates(1)).map(({ userId }) => userId)).toEqual([5]);
        expect((await reader.getFollowsUpdates(1, 2)).map(({ userId }) => userId)).toEqual([3, 4, 5]);
    });
});


const user = (id: number, name: string, privacy: PrivacyType) => ({
    id,
    name,
    privacy,
    email: `${name}@example.com`,
    emailVerified: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
});
