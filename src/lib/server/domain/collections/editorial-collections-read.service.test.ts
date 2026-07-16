import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {eq} from "drizzle-orm";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, RoleType, SocialState, Status} from "@/lib/utils/enums";
import {UnauthorizedError} from "@/lib/utils/error-classes";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { EditorialCollectionsReadService } = await import("./editorial-collections-read.service");


describe("editorial collections read service", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;
    let followingStatus: SocialState | undefined;
    let service: InstanceType<typeof EditorialCollectionsReadService>;

    beforeEach(async () => {
        followingStatus = undefined;
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values([
            user(10, "private-owner", PrivacyType.PRIVATE),
            user(20, "viewer", PrivacyType.PUBLIC),
        ]);
        await db.insert(schema.catalogItem).values([
            { id: 1000, kind: MediaType.MANGA, primaryProvider: "jikan", primaryExternalId: "700", name: "First", imageCover: "first.jpg", releaseDate: "2020-01-01" },
            { id: 1001, kind: MediaType.MANGA, primaryProvider: "jikan", primaryExternalId: "701", name: "Second", imageCover: "second.jpg", releaseDate: null },
        ]);
        await db.insert(schema.libraryEntry).values({ userId: 20, catalogItemId: 1000, status: Status.READING });
        await db.insert(schema.editorialCollection).values([
            { id: 1, ownerId: 10, title: "Public", kind: MediaType.MANGA, visibility: PrivacyType.PUBLIC, ordered: true, viewCount: 4 },
            { id: 2, ownerId: 10, title: "Profile", kind: MediaType.MANGA, visibility: PrivacyType.RESTRICTED },
            { id: 3, ownerId: 10, title: "Only me", kind: MediaType.MANGA, visibility: PrivacyType.PRIVATE },
        ]);
        await db.insert(schema.editorialCollectionItem).values([
            { collectionId: 1, catalogItemId: 1000, position: 1, annotation: "Best" },
            { collectionId: 1, catalogItemId: 1001, position: 3 },
            { collectionId: 2, catalogItemId: 1000, position: 1 },
            { collectionId: 3, catalogItemId: 1000, position: 1 },
        ]);
        await db.insert(schema.editorialCollectionLike).values({ collectionId: 1, userId: 20 });
        const userService = {
            getFollowingStatus: vi.fn(async () => followingStatus ? { status: followingStatus } : undefined),
        };
        service = new EditorialCollectionsReadService(userService as any);
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("reads a public collection from a private owner with exact route IDs, positions and viewer membership", async () => {
        const result = await service.getCollectionDetails(1, "read", 20, RoleType.USER);
        expect(result).toMatchObject({
            collection: { id: 1, mediaType: MediaType.MANGA, privacy: PrivacyType.PUBLIC, likeCount: 1, viewCount: 4 },
            isLiked: true,
            canManage: false,
            items: [
                { mediaId: 1000, mediaName: "First", orderIndex: 1, annotation: "Best", inUserList: true },
                { mediaId: 1001, mediaName: "Second", orderIndex: 3, annotation: null, inUserList: false },
            ],
        });
        expect((await db.select().from(schema.editorialCollection).where(eq(schema.editorialCollection.id, 1)).get())?.viewCount).toBe(5);
    });

    it("applies the private-owner audience only to profile-only collections", async () => {
        await expect(service.getCollectionDetails(2, "read", 20, RoleType.USER)).rejects.toBeInstanceOf(UnauthorizedError);
        followingStatus = SocialState.ACCEPTED;
        await expect(service.getCollectionDetails(2, "read", 20, RoleType.USER)).resolves.toBeDefined();
        await expect(service.getCollectionDetails(3, "read", 20, RoleType.USER)).rejects.toBeInstanceOf(UnauthorizedError);
        await expect(service.getCollectionDetails(3, "edit", 20, RoleType.MANAGER)).resolves.toMatchObject({ canManage: true });
    });

    it("discovers public collections independently from profile/list publication and derives previews and likes", async () => {
        const result = await service.getPublicCollections({ page: 1, mediaType: MediaType.MANGA });
        expect(result).toMatchObject({
            total: 1,
            items: [{
                id: 1,
                ownerName: "private-owner",
                likeCount: 1,
                previewItems: [1000, 1001],
                previews: [
                    expect.objectContaining({ mediaId: 1000, mediaName: "First" }),
                    expect.objectContaining({ mediaId: 1001, mediaName: "Second" }),
                ],
            }],
        });
        expect(await service.getUserCollectionMemberships(10, 1001, MediaType.MANGA)).toEqual([
            expect.objectContaining({ id: 3, hasMedia: false }),
            expect.objectContaining({ id: 2, hasMedia: false }),
            expect.objectContaining({ id: 1, hasMedia: true }),
        ]);
    });

    it("lists global public collections without profile access and applies owner audience only to profile collections", async () => {
        const filters = { page: 1, mediaType: MediaType.MANGA };
        await expect(service.getPaginatedUserCollections(10, PrivacyType.PRIVATE, filters))
            .resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: 1 })] });
        await expect(service.getPaginatedUserCollections(10, PrivacyType.PRIVATE, filters, 20, RoleType.USER))
            .resolves.toMatchObject({ total: 1, items: [expect.objectContaining({ id: 1 })] });

        followingStatus = SocialState.ACCEPTED;
        await expect(service.getPaginatedUserCollections(10, PrivacyType.PRIVATE, filters, 20, RoleType.USER))
            .resolves.toMatchObject({ total: 2, items: expect.arrayContaining([
                expect.objectContaining({ id: 1 }),
                expect.objectContaining({ id: 2 }),
            ]) });
        await expect(service.getPaginatedUserCollections(10, PrivacyType.PRIVATE, filters, 20, RoleType.MANAGER))
            .resolves.toMatchObject({ total: 3 });
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
