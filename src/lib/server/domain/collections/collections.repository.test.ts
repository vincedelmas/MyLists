import Database from "bun:sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {FormattedError} from "@/lib/utils/error-classes";
import {MediaType, PrivacyType, RoleType} from "@/lib/utils/enums";
import {AuthorizationService, toActor} from "@/lib/server/authorization";
import type {SocialService} from "@/lib/server/domain/social/social.service";
import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import type {MediaServiceRegistry} from "@/lib/server/domain/media/media.registries";
import {CollectionsService} from "@/lib/server/domain/collections/collections.service";
import {CollectionsRepository} from "@/lib/server/domain/collections/collections.repository";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));


vi.mock("@/lib/server/database/db", () => ({
    get db() { return dbContext.db; },
}));


describe("collection media references", () => {
    let sqlite: Database;
    let service: CollectionsService;
    const actor = toActor({ id: 1, role: RoleType.USER });
    const collectionData = {
        ownerId: 1,
        title: "Favorites",
        description: "My favorite movies",
        ordered: true,
        privacy: PrivacyType.PUBLIC,
        mediaType: MediaType.MOVIES,
    };

    const snapshot = () => ({
        collections: dbContext.db.select().from(schema.collections).all(),
        items: dbContext.db.select().from(schema.collectionItems).all(),
    });

    beforeEach(() => {
        sqlite = new Database(":memory:");
        const db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");

        db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `collection-user-${id}`, email: `collection-${id}@example.com`, emailVerified: true,
            privacy: PrivacyType.PUBLIC, createdAt: "2026-01-01 00:00:00", updatedAt: "2026-01-01 00:00:00",
        }))).run();
        const media = { id: 1, apiId: 101, name: "Known media", imageCover: "cover.jpg" };
        db.insert(schema.movies).values([1, 2, 3].map(id => ({
            ...media, id, apiId: 100 + id, name: `Movie ${id}`, duration: 90,
        }))).run();
        db.insert(schema.series).values({ ...media, duration: 30, totalSeasons: 1, totalEpisodes: 10 }).run();
        db.insert(schema.anime).values({ ...media, duration: 24, totalSeasons: 1, totalEpisodes: 12 }).run();
        db.insert(schema.books).values({ ...media, apiId: "book-101", pages: 200 }).run();
        db.insert(schema.manga).values({ ...media, chapters: 10 }).run();
        db.insert(schema.games).values([media, { ...media, id: 77, apiId: 177 }]).run();

        const mediaRegistry = {
            get: (mediaType: MediaType) => createMediaQueries(getServerMediaDefinition(mediaType)),
        } as unknown as MediaServiceRegistry;
        service = new CollectionsService(
            new AuthorizationService({} as SocialService),
            CollectionsRepository,
            mediaRegistry,
        );
    });

    afterEach(() => sqlite.close());

    it.each(Object.values(MediaType))("accepts existing %s IDs and rejects unknown IDs without creating a partial collection", async mediaType => {
        const collectionId = service.createCollection({ ...collectionData, mediaType, items: [{ mediaId: 1 }] });
        const before = snapshot();

        expect(() => service.createCollection({
            ...collectionData, mediaType, items: [{ mediaId: 1 }, { mediaId: 999 }],
        })).toThrow(FormattedError);
        expect(snapshot()).toEqual(before);

        const result = await service.getCollectionDetails(collectionId, "read", actor);
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toMatchObject({ mediaId: 1, orderIndex: 1 });
    });

    it("rejects an ID that exists only in a different media type", () => {
        expect(() => service.createCollection({
            ...collectionData, items: [{ mediaId: 77 }],
        })).toThrow(FormattedError);

        expect(snapshot()).toEqual({ collections: [], items: [] });
    });

    it("preserves collection details, order, and annotations when an edit contains an unknown ID", () => {
        const collectionId = service.createCollection({
            ...collectionData, items: [{ mediaId: 1, annotation: "Keep me" }, { mediaId: 2 }],
        });
        const before = snapshot();

        expect(() => service.updateCollection({
            actor, collectionId, title: "Changed title", description: "Changed description",
            ordered: false, privacy: PrivacyType.PRIVATE,
            items: [{ mediaId: 2, annotation: "Changed annotation" }, { mediaId: 999 }],
        })).toThrow(FormattedError);

        expect(snapshot()).toEqual(before);
    });

    it("rejects adding an unknown item to an existing collection", () => {
        const collectionId = service.createCollection({ ...collectionData, items: [{ mediaId: 1 }] });
        const before = snapshot();

        expect(() => service.addMediaToCollection({
            actor, collectionId, mediaType: MediaType.MOVIES, mediaId: 999,
        })).toThrow(FormattedError);

        expect(snapshot()).toEqual(before);
    });

    it("rejects copying legacy invalid references without creating a copy or incrementing its counter", () => {
        const collectionId = service.createCollection({ ...collectionData, items: [{ mediaId: 1 }] });
        dbContext.db.insert(schema.collectionItems).values({
            collectionId, mediaId: 999, mediaType: MediaType.MOVIES, orderIndex: 2,
        }).run();
        const before = snapshot();

        expect(() => service.copyCollection(collectionId, toActor({ id: 2, role: RoleType.USER }))).toThrow(FormattedError);

        expect(snapshot()).toEqual(before);
    });

    it("keeps valid items readable and editable while preserving deduplication, ordering, and annotations", async () => {
        const collectionId = service.createCollection({
            ...collectionData,
            items: [{ mediaId: 2, annotation: "Second first" }, { mediaId: 1 }, { mediaId: 2, annotation: "Duplicate" }],
        });
        expect(CollectionsRepository.getCollectionItems(collectionId)).toMatchObject([
            { mediaId: 2, orderIndex: 1, annotation: "Second first" },
            { mediaId: 1, orderIndex: 2, annotation: null },
        ]);

        service.updateCollection({
            actor, collectionId, title: "Updated favorites", ordered: true, privacy: PrivacyType.PUBLIC,
            items: [{ mediaId: 1, annotation: "First now" }, { mediaId: 2 }, { mediaId: 1 }],
        });
        service.addMediaToCollection({ actor, collectionId, mediaType: MediaType.MOVIES, mediaId: 1 });
        service.addMediaToCollection({ actor, collectionId, mediaType: MediaType.MOVIES, mediaId: 3 });

        for (const mode of ["read", "edit"] as const) {
            const result = await service.getCollectionDetails(collectionId, mode, actor);
            expect(result.items).toMatchObject([
                { mediaId: 1, mediaName: "Movie 1", orderIndex: 1, annotation: "First now" },
                { mediaId: 2, mediaName: "Movie 2", orderIndex: 2, annotation: null },
                { mediaId: 3, mediaName: "Movie 3", orderIndex: 3, annotation: null },
            ]);
        }

        const copy = service.copyCollection(collectionId, toActor({ id: 2, role: RoleType.USER }));
        expect(CollectionsRepository.getCollectionById(copy.id)).toMatchObject({ ownerId: 2, privacy: PrivacyType.PRIVATE });
        expect(CollectionsRepository.getCollectionItems(copy.id)).toMatchObject([
            { mediaId: 1, orderIndex: 1, annotation: "First now" },
            { mediaId: 2, orderIndex: 2, annotation: null },
            { mediaId: 3, orderIndex: 3, annotation: null },
        ]);
        expect(CollectionsRepository.getCollectionById(collectionId)?.copiedCount).toBe(1);
    });
});
