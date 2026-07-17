import Database from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import * as schema from "@/lib/server/database/schema";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";
import {getImageUrl} from "@/lib/utils/image-url";
import {createDefaultHighlightedMediaSettings} from "@/lib/types/profile-custom.types";


const dbContext = vi.hoisted(() => ({ db: undefined as any }));
vi.mock("@/lib/server/database/async-storage", () => ({ getDbClient: () => dbContext.db }));

const { ProfileHighlightsQuery } = await import("./profile-highlights.query");


describe("normalized profile highlights", () => {
    let sqlite: Database;
    let db: ReturnType<typeof drizzle<typeof schema>>;

    beforeEach(async () => {
        sqlite = new Database(":memory:");
        db = drizzle(sqlite, { schema, casing: "snake_case" });
        dbContext.db = db;
        migrate(db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        await db.insert(schema.user).values({
            id: 1,
            name: "owner",
            privacy: PrivacyType.PUBLIC,
            email: "owner@example.com",
            emailVerified: true,
            createdAt: "2026-01-01 00:00:00",
            updatedAt: "2026-01-01 00:00:00",
        });
        await db.insert(schema.catalogItem).values([
            catalog(10, MediaType.SERIES, "Series favorite", "series.jpg"),
            catalog(11, MediaType.MOVIES, "Movie favorite", "movie.jpg"),
        ]);
        await db.insert(schema.profileMediaChannel).values([
            { userId: 1, kind: MediaType.SERIES, enabled: true },
            { userId: 1, kind: MediaType.MOVIES, enabled: false },
        ]);
        await db.insert(schema.libraryEntry).values([
            { userId: 1, catalogItemId: 10, status: Status.COMPLETED, favorite: true, customCover: "custom.jpg" },
            { userId: 1, catalogItemId: 11, status: Status.COMPLETED, favorite: true },
        ]);
        const settings = createDefaultHighlightedMediaSettings();
        for (const tab of Object.keys(settings) as Array<keyof typeof settings>) settings[tab].mode = "disabled";
        settings.overview = {
            title: "Overview picks",
            mode: "curated",
            items: [
                { mediaType: MediaType.SERIES, mediaId: 10 },
                { mediaType: MediaType.MOVIES, mediaId: 11 },
            ],
        };
        settings.series = {
            title: "Series picks",
            mode: "curated",
            items: [{ mediaType: MediaType.SERIES, mediaId: 10 }],
        };
        settings.movies = {
            title: "Movie picks",
            mode: "curated",
            items: [{ mediaType: MediaType.MOVIES, mediaId: 11 }],
        };
        await db.insert(schema.profileCustom).values({ userId: 1, key: "highlightedMedia", value: settings });
    });

    afterEach(() => {
        sqlite.close();
        dbContext.db = undefined;
    });

    it("hides disabled-family highlights while preserving curated order and custom covers", async () => {
        const result = await new ProfileHighlightsQuery().resolveHighlightedMedia(1);
        expect(result.series.items).toEqual([{
            mediaId: 10,
            mediaName: "Series favorite",
            mediaType: MediaType.SERIES,
            mediaCover: getImageUrl("series-covers", "custom.jpg"),
        }]);
        expect(result.movies.items).toEqual([]);
        expect(result.overview.items).toEqual(result.series.items);
    });

    it("allows the owner customization search to find a stored disabled-list entry", async () => {
        await expect(new ProfileHighlightsQuery().searchHighlightedMedia(1, "overview", "Movie"))
            .resolves.toEqual([{
                mediaId: 11,
                mediaName: "Movie favorite",
                mediaType: MediaType.MOVIES,
                mediaCover: getImageUrl("movies-covers", "movie.jpg"),
                customCover: null,
            }]);
    });
});


const catalog = (id: number, kind: MediaType, name: string, imageCover: string) => ({
    id,
    kind,
    name,
    imageCover,
    primaryProvider: "tmdb" as const,
    primaryExternalId: String(id),
});
