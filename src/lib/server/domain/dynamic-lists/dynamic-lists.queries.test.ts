import Database from "bun:sqlite";
import {and, eq} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {GamesPlatformsEnum, MediaType, RatingSystemType, Status} from "@/lib/utils/enums";
import type {ScopedMediaFilters} from "@/lib/schemas/media-filters.schema";
import * as schema from "@/lib/server/database/schema";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";
import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {createMediaListQueries} from "@/lib/server/domain/media/base/media-list.queries";
import {createMediaBrowseQueryParts} from "@/lib/server/domain/media/base/media-browse.queries";
import {getDynamicListEditorFilterOptions, getDynamicListResults, getDynamicListSummary} from "./dynamic-lists.queries";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));

const spec: DynamicListSpec = {
    version: 1, title: "My dynamic list", mediaTypes: "all", filters: {},
    sort: { field: "addedAt", direction: "asc" }, display: "grid",
};


describe("dynamic list live queries", () => {
    let sqlite: Database;

    beforeEach(() => {
        sqlite = new Database(":memory:");
        dbContext.db = drizzle(sqlite, { schema, casing: "snake_case" });
        migrate(dbContext.db, { migrationsFolder: "./drizzle" });
        sqlite.run("PRAGMA foreign_keys = ON");
        dbContext.db.insert(schema.user).values([1, 2].map(id => ({
            id, name: `user${id}`, email: `user${id}@example.invalid`, emailVerified: true,
            createdAt: "2026-01-01", updatedAt: "2026-01-01",
        }))).run();
        dbContext.db.insert(schema.userMediaSettings).values([1, 2].flatMap(userId =>
            ALL_MEDIA_TYPES.map(mediaType => ({ userId, mediaType, active: true })))).run();
    });

    afterEach(() => sqlite.close());

    function addEntry(mediaType: MediaType, mediaId: number, options: Partial<{
        userId: number; title: string; status: Status; addedAt: string | null; lastUpdated: string | null;
        rating: number | null; favorite: boolean | null; customCover: string | null; releaseDate: string | null; comment: string | null;
    }> = {}) {
        const commonMedia = { id: mediaId, apiId: mediaId, name: options.title ?? `Media ${mediaId}`, imageCover: `${mediaId}.jpg`, releaseDate: options.releaseDate };
        switch (mediaType) {
            case MediaType.MOVIES: dbContext.db.insert(schema.movies).values({ ...commonMedia, duration: 100 }).onConflictDoNothing().run(); break;
            case MediaType.BOOKS: dbContext.db.insert(schema.books).values({ ...commonMedia, apiId: String(mediaId), pages: 100 }).onConflictDoNothing().run(); break;
            case MediaType.GAMES: dbContext.db.insert(schema.games).values(commonMedia).onConflictDoNothing().run(); break;
            case MediaType.ANIME: dbContext.db.insert(schema.anime).values({ ...commonMedia, duration: 24, totalSeasons: 1, totalEpisodes: 12 }).onConflictDoNothing().run(); break;
            case MediaType.SERIES: dbContext.db.insert(schema.series).values({ ...commonMedia, duration: 40, totalSeasons: 1, totalEpisodes: 12 }).onConflictDoNothing().run(); break;
            case MediaType.MANGA: dbContext.db.insert(schema.manga).values(commonMedia).onConflictDoNothing().run(); break;
        }
        const listData = {
            userId: options.userId ?? 1, mediaId, status: options.status ?? Status.COMPLETED,
            addedAt: options.addedAt === undefined ? "2026-01-01 00:00:00" : options.addedAt,
            lastUpdated: options.lastUpdated, rating: options.rating, favorite: options.favorite, customCover: options.customCover, comment: options.comment,
        };
        const { listTable } = getServerMediaDefinition(mediaType).repository.tables;
        dbContext.db.insert(listTable).values({ ...listData, currentSeason: 1, currentEpisode: 0, currentChapter: 0 }).run();
    }

    it("restricts results to the owner's active lists, including explicit type requests", () => {
        addEntry(MediaType.MOVIES, 1);
        addEntry(MediaType.BOOKS, 2);
        addEntry(MediaType.GAMES, 3, { userId: 2 });
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.BOOKS))).run();
        expect(getDynamicListResults(1, spec).items.map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, { ...spec, mediaTypes: [MediaType.BOOKS] }).total).toBe(0);
        dbContext.db.update(schema.userMediaSettings).set({ active: true }).where(eq(schema.userMediaSettings.userId, 1)).run();
        expect(getDynamicListResults(1, spec).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getDynamicListResults(2, spec).items.map(item => item.mediaId)).toEqual([3]);
    });

    it("offers editor genres and tags from selected owner active lists only", () => {
        addEntry(MediaType.MOVIES, 1);
        addEntry(MediaType.BOOKS, 2);
        addEntry(MediaType.MANGA, 3);
        addEntry(MediaType.MOVIES, 4, { userId: 2 });
        dbContext.db.insert(schema.moviesGenre).values([
            { mediaId: 1, name: "Drama" }, { mediaId: 1, name: "Comedy" }, { mediaId: 4, name: "Foreign genre" },
        ]).run();
        dbContext.db.insert(schema.booksGenre).values({ mediaId: 2, name: "Drama" }).run();
        dbContext.db.insert(schema.mangaGenre).values({ mediaId: 3, name: "Inactive genre" }).run();
        dbContext.db.insert(schema.moviesTags).values([
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 2, mediaId: 1, name: "Visitor tag" },
            { userId: 1, name: "Unused tag" }, { userId: 2, mediaId: 4, name: "Foreign tag" },
        ]).run();
        dbContext.db.insert(schema.booksTags).values({ userId: 1, mediaId: 2, name: "learning" }).run();
        dbContext.db.insert(schema.mangaTags).values({ userId: 1, mediaId: 3, name: "Inactive tag" }).run();
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.MANGA))).run();
        expect(getDynamicListEditorFilterOptions(1, "all")).toMatchObject({ genres: ["Comedy", "Drama"], tags: ["cozy", "learning"] });
        expect(getDynamicListEditorFilterOptions(1, [MediaType.BOOKS])).toMatchObject({ genres: ["Drama"], tags: ["learning"] });
        expect(getDynamicListEditorFilterOptions(1, [MediaType.MANGA])).toMatchObject({ genres: [], tags: [] });
        expect(getDynamicListEditorFilterOptions(2, [MediaType.MOVIES])).toMatchObject({ genres: ["Foreign genre"], tags: ["Foreign tag"] });
    });

    it("returns only four owner cover previews while counting all saved matches", () => {
        for (let id = 1; id <= 6; id++) addEntry(MediaType.MOVIES, id, { rating: 8, comment: "Private detail", customCover: id === 1 ? "custom.jpg" : null });
        addEntry(MediaType.MOVIES, 7, { userId: 2 });
        addEntry(MediaType.BOOKS, 8);
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.BOOKS))).run();
        const preview = getDynamicListSummary(1, spec);
        expect(preview.total).toBe(6);
        expect(preview.mediaTypes).toEqual([MediaType.MOVIES]);
        expect(preview.covers).toHaveLength(4);
        expect(preview.covers[0]).toEqual({
            mediaType: MediaType.MOVIES, mediaId: 1, title: "Media 1",
            imageCover: "https://mylists.example.invalid/static/movies-covers/custom.jpg",
        });
        expect(preview.covers.every(cover => Object.keys(cover).sort().join(",") === "imageCover,mediaId,mediaType,title")).toBe(true);
        expect(getDynamicListSummary(1, { ...spec, filters: { search: "missing" } })).toEqual({ total: 0, mediaTypes: [], covers: [] });
    });

    it("reports actual matching media types even when they are absent from the first four preview covers", () => {
        for (let id = 1; id <= 5; id++) addEntry(MediaType.MOVIES, id, { status: Status.COMPLETED, addedAt: "2025-01-01" });
        addEntry(MediaType.BOOKS, 10, { status: Status.COMPLETED, addedAt: "2026-01-01" });
        addEntry(MediaType.GAMES, 11, { status: Status.PLAN_TO_PLAY });
        addEntry(MediaType.MANGA, 12, { status: Status.COMPLETED });
        addEntry(MediaType.ANIME, 13, { status: Status.COMPLETED, userId: 2 });
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.MANGA))).run();

        const preview = getDynamicListSummary(1, { ...spec, filters: { statusGroup: "completed" } });

        expect(preview.total).toBe(6);
        expect(preview.mediaTypes).toEqual([MediaType.MOVIES, MediaType.BOOKS]);
        expect(preview.covers).toHaveLength(4);
        expect(preview.covers.every(cover => cover.mediaType === MediaType.MOVIES)).toBe(true);
        expect(Object.keys(preview).sort()).toEqual(["covers", "mediaTypes", "total"]);
    });

    it("resolves planned aliases across all six media types", () => {
        for (const [index, mediaType] of ALL_MEDIA_TYPES.entries()) {
            addEntry(mediaType, index + 1, { status: getServerMediaDefinition(mediaType).service.defaultStatus });
        }
        expect(getDynamicListResults(1, { ...spec, filters: { statusGroup: "planned" } }).total).toBe(6);
        expect(getDynamicListResults(1, { ...spec, filters: { statusGroup: "completed" } }).total).toBe(0);
    });

    it("offers only matching active media types before temporary filters and pagination", () => {
        for (let id = 1; id <= 25; id++) addEntry(MediaType.MOVIES, id);
        addEntry(MediaType.BOOKS, 50);
        addEntry(MediaType.MANGA, 51);
        addEntry(MediaType.GAMES, 52, { status: Status.PLAN_TO_PLAY });
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.MANGA))).run();
        const saved: DynamicListSpec = { ...spec, filters: { statusGroup: "completed" } };
        const result = getDynamicListResults(1, saved, { filters: { search: "Media 50" } });
        expect(result.mediaTypes).toEqual([MediaType.MOVIES, MediaType.BOOKS]);
        expect(result.items.map(item => item.mediaId)).toEqual([50]);
        expect(getDynamicListResults(1, saved, { page: 2, filters: { mediaType: MediaType.MOVIES } }).mediaTypes).toEqual(result.mediaTypes);
        expect(getDynamicListResults(1, saved, { filters: { search: "missing" } }).mediaTypes).toEqual(result.mediaTypes);
        expect(getDynamicListResults(1, { ...saved, filters: { search: "missing" } }).mediaTypes).toEqual([]);
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.BOOKS))).run();
        expect(getDynamicListResults(1, saved, { filters: { sorting: "provider_rating_highest" } }).mediaTypes).toEqual([MediaType.MOVIES]);
    });

    it("reuses the complete list projection for progress, owner ratings, comments, covers and tags", () => {
        for (const [index, mediaType] of ALL_MEDIA_TYPES.entries()) addEntry(mediaType, index + 1, { comment: "Owner comment", favorite: true, rating: 8 });
        dbContext.db.update(schema.user).set({ ratingSystem: RatingSystemType.FEELING }).where(eq(schema.user.id, 1)).run();
        dbContext.db.update(schema.booksList).set({ actualPage: 42, redo: 2 }).where(eq(schema.booksList.userId, 1)).run();
        dbContext.db.update(schema.gamesList).set({ playtime: 150 }).where(eq(schema.gamesList.userId, 1)).run();
        dbContext.db.update(schema.seriesList).set({ currentSeason: 2, currentEpisode: 3 }).where(eq(schema.seriesList.userId, 1)).run();
        dbContext.db.insert(schema.seriesEpisodesPerSeason).values({ mediaId: 1, season: 2, episodes: 10 }).run();
        dbContext.db.insert(schema.booksTags).values([
            { userId: 1, mediaId: 4, name: "Owner tag" },
            { userId: 2, mediaId: 4, name: "Visitor tag" },
        ]).run();
        const items = getDynamicListResults(1, spec).items;
        expect(items.every(item => item.userId === 1 && item.ratingSystem === RatingSystemType.FEELING && item.comment === "Owner comment" && item.favorite === true)).toBe(true);
        expect(items.find(item => item.mediaType === MediaType.BOOKS)).toMatchObject({ mediaName: "Media 4", actualPage: 42, pages: 100, redo: 2, tags: [{ name: "Owner tag" }] });
        expect(items.find(item => item.mediaType === MediaType.GAMES)).toMatchObject({ playtime: 150 });
        expect(items.find(item => item.mediaType === MediaType.SERIES)).toMatchObject({ currentSeason: 2, currentEpisode: 3, epsPerSeason: [{ season: 2, episodes: 10 }] });
    });

    it("resolves in-progress aliases and excludes unsupported statuses", () => {
        addEntry(MediaType.ANIME, 1, { status: Status.WATCHING });
        addEntry(MediaType.BOOKS, 2, { status: Status.READING });
        addEntry(MediaType.GAMES, 3, { status: Status.PLAYING });
        addEntry(MediaType.MOVIES, 4);
        addEntry(MediaType.GAMES, 5, { status: Status.MULTIPLAYER });
        expect(getDynamicListResults(1, { ...spec, filters: { statusGroup: "in_progress" } }).items.map(item => item.mediaId)).toEqual([1, 2, 3]);
        expect(getDynamicListResults(1, { ...spec, mediaTypes: [MediaType.MOVIES], filters: { statusGroup: "in_progress" } }).total).toBe(0);
    });

    it("sorts mixed timestamp formats chronologically and paginates globally across types", () => {
        for (let id = 1; id <= 50; id++) {
            const timestamp = new Date(Date.UTC(2026, 0, 1, 0, id)).toISOString();
            addEntry(id % 2 ? MediaType.MOVIES : MediaType.BOOKS, id, { addedAt: id % 2 ? timestamp : timestamp.replace("T", " ").replace("Z", "") });
        }
        const first = getDynamicListResults(1, spec);
        const second = getDynamicListResults(1, spec, { page: 2 });
        const third = getDynamicListResults(1, spec, { page: 3 });
        expect(first).toMatchObject({ total: 50, page: 1, perPage: 24, pages: 3 });
        expect(first.items.map(item => item.mediaId)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
        expect(second.items.map(item => item.mediaId)).toEqual(Array.from({ length: 24 }, (_, i) => i + 25));
        expect(third.items.map(item => item.mediaId)).toEqual([49, 50]);
        expect(getDynamicListResults(1, { ...spec, sort: { field: "addedAt", direction: "desc" } }).items[0].mediaId).toBe(50);
    });

    it("uses stable ordering for ties and places null ratings last in either direction", () => {
        addEntry(MediaType.MOVIES, 1, { title: "Same", rating: 8 });
        addEntry(MediaType.BOOKS, 1, { title: "Same", rating: 8 });
        addEntry(MediaType.GAMES, 1, { title: "Same", rating: null });
        expect(getDynamicListResults(1, spec).items.map(item => item.mediaType)).toEqual([MediaType.BOOKS, MediaType.GAMES, MediaType.MOVIES]);
        for (const direction of ["asc", "desc"] as const) {
            expect(getDynamicListResults(1, { ...spec, sort: { field: "rating", direction } }).items.map(item => item.mediaType)).toEqual([MediaType.BOOKS, MediaType.MOVIES, MediaType.GAMES]);
        }
    });

    it("sorts mixed-case titles across media types with stable ties in either direction", () => {
        addEntry(MediaType.GAMES, 1, { title: "banana" });
        addEntry(MediaType.BOOKS, 2, { title: "Apricot" });
        addEntry(MediaType.ANIME, 3, { title: "cherry" });
        addEntry(MediaType.MOVIES, 4, { title: "apple" });
        addEntry(MediaType.SERIES, 5, { title: "Banana" });
        addEntry(MediaType.MANGA, 6, { title: "Date" });
        expect(getDynamicListResults(1, { ...spec, sort: { field: "title", direction: "asc" } }).items.map(item => item.mediaId))
            .toEqual([4, 2, 1, 5, 3, 6]);
        expect(getDynamicListResults(1, spec, { filters: { sorting: "title_desc" } }).items.map(item => item.mediaId))
            .toEqual([6, 3, 1, 5, 2, 4]);
    });

    it.each([
        { mediaType: MediaType.BOOKS, catalogField: "pages", highest: "pages_highest", lowest: "pages_lowest", personalField: "redo", personalSort: "redo_highest" },
        { mediaType: MediaType.MANGA, catalogField: "chapters", highest: "chapters_highest", lowest: "chapters_lowest", personalField: "redo", personalSort: "redo_highest" },
        { mediaType: MediaType.GAMES, catalogField: "voteAverage", highest: "provider_rating_highest", lowest: "provider_rating_lowest", personalField: "playtime", personalSort: "playtime_highest" },
        { mediaType: MediaType.MOVIES, catalogField: "voteAverage", highest: "provider_rating_highest", lowest: "provider_rating_lowest", personalField: "redo", personalSort: "redo_highest" },
        { mediaType: MediaType.ANIME, catalogField: "voteAverage", highest: "provider_rating_highest", lowest: "provider_rating_lowest", personalField: "redo", personalSort: "redo_highest" },
        { mediaType: MediaType.SERIES, catalogField: "voteAverage", highest: "provider_rating_highest", lowest: "provider_rating_lowest", personalField: "redo", personalSort: "redo_highest" },
    ] as const)("shares $mediaType catalogue and personal ordering across browse, tracking lists and dynamic lists", async ({ mediaType, catalogField, highest, lowest, personalField, personalSort }) => {
        const definition = getServerMediaDefinition(mediaType);
        const { mediaTable, listTable } = definition.repository.tables;
        const listQueries = createMediaListQueries(definition.repository);
        const saved: DynamicListSpec = { ...spec, mediaTypes: [mediaType] };
        const catalogValues = [3, 9, mediaType === MediaType.BOOKS ? 3 : null];

        for (let mediaId = 1; mediaId <= 3; mediaId++) {
            addEntry(mediaType, mediaId);
            dbContext.db.update(mediaTable).set({ [catalogField]: catalogValues[mediaId - 1] }).where(eq(mediaTable.id, mediaId)).run();
            dbContext.db.update(listTable).set({ [personalField]: [1, 3, 0][mediaId - 1] }).where(eq(listTable.mediaId, mediaId)).run();
        }
        if (mediaType === MediaType.MANGA) {
            dbContext.db.update(schema.manga).set({ voteAverage: 9 }).where(eq(schema.manga.id, 2)).run();
        }

        for (const [sorting, expected] of [
            [highest, [2, 1, 3]],
            [lowest, mediaType === MediaType.BOOKS ? [1, 3, 2] : [1, 2, 3]],
        ] as const) {
            const browse = createMediaBrowseQueryParts(definition, { sorting });
            const catalogue = dbContext.db.select({ mediaId: mediaTable.id }).from(mediaTable)
                .leftJoin(listTable, browse.viewerJoin).orderBy(...browse.orderBy([])).all();
            const list = await listQueries.getMediaList(undefined, 1, { sorting: getMediaSortLabel(getMediaDefinition(mediaType), sorting) });
            const dynamic = getDynamicListResults(1, saved, { filters: { sorting } });
            expect(catalogue.map(item => item.mediaId)).toEqual(expected);
            expect(list.items.map(item => item.mediaId)).toEqual(expected);
            expect(dynamic.items.map(item => item.mediaId)).toEqual(expected);
            expect(dynamic.sorting).toBe(sorting);
        }

        const personalLabel = getMediaSortLabel(getMediaDefinition(mediaType), personalSort);
        const list = await listQueries.getMediaList(undefined, 1, { sorting: personalLabel });
        const dynamic = getDynamicListResults(1, saved, { filters: { sorting: personalSort } });
        expect(list.items.map(item => item.mediaId)).toEqual([2, 1, 3]);
        expect(dynamic.items.map(item => item.mediaId)).toEqual([2, 1, 3]);
        expect(dynamic.items[0]).toMatchObject({
            providerRating: mediaType === MediaType.BOOKS ? null : 9,
            redo: mediaType === MediaType.GAMES ? null : 3,
            pages: mediaType === MediaType.BOOKS ? 9 : null,
            chapters: mediaType === MediaType.MANGA ? 9 : null,
            playtime: mediaType === MediaType.GAMES ? 3 : null,
        });
        expect(dynamic.items[0]).not.toHaveProperty("sortValue");
        if (mediaType === MediaType.GAMES) {
            expect(getDynamicListResults(1, saved, { filters: { sorting: "playtime_lowest" } }).items.map(item => item.mediaId)).toEqual([3, 1, 2]);
        }
    });

    it("falls back for media-specific orders unsupported by mixed media", () => {
        addEntry(MediaType.MOVIES, 1);
        addEntry(MediaType.BOOKS, 3);
        addEntry(MediaType.GAMES, 5);
        expect(getDynamicListResults(1, spec, { filters: { sorting: "pages_highest" } }).sorting).toBe("default");
        expect(getDynamicListResults(1, spec, { filters: { mediaType: MediaType.BOOKS, sorting: "pages_highest" } }))
            .toMatchObject({ sorting: "pages_highest", total: 1, items: [{ mediaType: MediaType.BOOKS, mediaId: 3 }] });
        expect(getDynamicListResults(1, { ...spec, mediaTypes: [MediaType.BOOKS] }, {
            filters: { mediaType: MediaType.MOVIES, sorting: "pages_highest" },
        }).total).toBe(0);
    });

    it("keeps stale sorts usable when the last matching type disappears or new types match", () => {
        addEntry(MediaType.BOOKS, 1, { status: Status.PLAN_TO_READ });
        addEntry(MediaType.GAMES, 2);
        const saved: DynamicListSpec = { ...spec, filters: { statusGroup: "planned" } };
        expect(getDynamicListResults(1, saved, { filters: { sorting: "pages_highest" } }).sorting).toBe("pages_highest");
        dbContext.db.update(schema.gamesList).set({ status: Status.PLAN_TO_PLAY }).where(eq(schema.gamesList.mediaId, 2)).run();
        expect(getDynamicListResults(1, saved, { filters: { sorting: "pages_highest" } })).toMatchObject({ sorting: "default", total: 2 });
        dbContext.db.update(schema.booksList).set({ status: Status.COMPLETED }).where(eq(schema.booksList.mediaId, 1)).run();
        expect(getDynamicListResults(1, saved, { filters: { mediaType: MediaType.BOOKS, sorting: "pages_highest" } }))
            .toMatchObject({ total: 0, sorting: "pages_highest", mediaTypes: [MediaType.GAMES] });
        dbContext.db.update(schema.gamesList).set({ status: Status.COMPLETED }).where(eq(schema.gamesList.mediaId, 2)).run();
        expect(getDynamicListResults(1, saved, { filters: { sorting: "pages_highest" } })).toMatchObject({ total: 0, sorting: "default", mediaTypes: [] });
    });

    it.each([
        ["2026-08-31T12:00:00Z", "2026-02-28T12:00:00Z"],
        ["2024-08-31T12:00:00Z", "2024-02-29T12:00:00Z"],
    ])("uses clamped UTC calendar months from %s", (now, boundary) => {
        addEntry(MediaType.MOVIES, 1, { addedAt: new Date(new Date(boundary).getTime() - 1_000).toISOString(), status: Status.PLAN_TO_WATCH });
        addEntry(MediaType.BOOKS, 2, { addedAt: boundary, status: Status.PLAN_TO_READ });
        addEntry(MediaType.GAMES, 3, { addedAt: null, status: Status.PLAN_TO_PLAY });
        const querySpec: DynamicListSpec = { ...spec, filters: { statusGroup: "planned", addedBefore: { monthsAgo: 6 } } };
        expect(getDynamicListResults(1, querySpec, { now: new Date(now) }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, querySpec, { now: new Date(new Date(now).getTime() + 1_000) }).items.map(item => item.mediaId)).toEqual([1, 2]);
    });

    it("ANDs filters, matches any requested tag, and scopes tags to the owner", () => {
        addEntry(MediaType.MOVIES, 1, { rating: 8, favorite: true });
        addEntry(MediaType.BOOKS, 2, { rating: 9, favorite: true });
        addEntry(MediaType.GAMES, 3, { rating: 7, favorite: true });
        addEntry(MediaType.MOVIES, 4, { rating: 8, favorite: false });
        addEntry(MediaType.MOVIES, 5, { rating: 8, favorite: true });
        dbContext.db.insert(schema.moviesTags).values([
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 1, mediaId: 1, name: "short" },
            { userId: 1, mediaId: 4, name: "cozy" }, { userId: 2, mediaId: 5, name: "cozy" },
            { userId: 1, name: "cozy" },
        ]).run();
        dbContext.db.insert(schema.booksTags).values({ userId: 1, mediaId: 2, name: "short" }).run();
        dbContext.db.insert(schema.gamesTags).values({ userId: 1, mediaId: 3, name: "cozy" }).run();
        const querySpec: DynamicListSpec = { ...spec, filters: { statusGroup: "completed", minRating: 8, maxRating: 9, favorite: true, tags: ["cozy", "short"] } };
        expect(getDynamicListResults(1, querySpec).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getDynamicListResults(1, { ...spec, filters: { tags: ["' OR 1=1 --"] } }).total).toBe(0);
    });

    it("narrows saved rules with temporary filters and exposes options only from the saved view", () => {
        addEntry(MediaType.MOVIES, 1, { rating: 9, favorite: true });
        addEntry(MediaType.BOOKS, 2, { rating: 8, favorite: false });
        addEntry(MediaType.MOVIES, 3, { rating: 10, status: Status.PLAN_TO_WATCH });
        dbContext.db.insert(schema.moviesGenre).values([{ mediaId: 1, name: "Drama" }, { mediaId: 3, name: "Excluded genre" }]).run();
        dbContext.db.insert(schema.booksGenre).values({ mediaId: 2, name: "History" }).run();
        dbContext.db.insert(schema.moviesTags).values([
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 2, mediaId: 1, name: "Other user's tag" },
            { userId: 1, mediaId: 3, name: "Excluded tag" },
        ]).run();
        dbContext.db.insert(schema.booksTags).values({ userId: 1, mediaId: 2, name: "learning" }).run();
        const saved: DynamicListSpec = { ...spec, filters: { statusGroup: "completed", minRating: 8 } };
        const result = getDynamicListResults(1, saved, { filters: { genres: ["Drama"], tags: ["cozy"], favorite: true } });
        expect(result.items.map(item => item.mediaId)).toEqual([1]);
        expect(result.filterOptions).toEqual({ genres: ["Drama", "History"], tags: ["cozy", "learning"], mediaFilters: {} });
        expect(getDynamicListResults(1, saved, { filters: { status: Status.PLAN_TO_WATCH } }).total).toBe(0);
        expect(getDynamicListResults(1, saved).total).toBe(2);
        expect(saved.filters).toEqual({ statusGroup: "completed", minRating: 8 });
    });

    it("scopes genres and tag rules to each media type without removing other types", () => {
        addEntry(MediaType.MOVIES, 1, { rating: 9 });
        addEntry(MediaType.MOVIES, 2, { rating: 9 });
        addEntry(MediaType.BOOKS, 1, { rating: 8 });
        dbContext.db.insert(schema.moviesGenre).values([{ mediaId: 1, name: "Drama" }, { mediaId: 2, name: "Comedy" }]).run();
        dbContext.db.insert(schema.booksGenre).values({ mediaId: 1, name: "History" }).run();
        dbContext.db.insert(schema.moviesTags).values([
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 1, mediaId: 1, name: "short" },
            { userId: 2, mediaId: 2, name: "cozy" },
        ]).run();
        const mediaFilters = { movies: { genres: ["Drama"], tags: ["cozy", "short"], tagsMatch: "all" as const } };
        const saved = getDynamicListResults(1, { ...spec, filters: { minRating: 8, mediaFilters } });
        expect(saved.items.map(item => [item.mediaType, item.mediaId])).toEqual([[MediaType.BOOKS, 1], [MediaType.MOVIES, 1]]);
        expect(getDynamicListResults(1, spec, { filters: { minRating: 8, mediaFilters } }).items).toEqual(saved.items);
        expect(getDynamicListResults(1, { ...spec, filters: { mediaFilters: { movies: { tags: ["cozy"], excludeTags: ["short"] } } } }).items.map(item => item.mediaType)).toEqual([MediaType.BOOKS]);
        const options = getDynamicListEditorFilterOptions(1, "all").mediaFilters;
        expect(options.movies?.genres).toEqual([{ name: "Comedy" }, { name: "Drama" }]);
        expect(options.movies?.tags).toEqual([{ name: "cozy" }, { name: "short" }]);
        expect(options.books?.genres).toEqual([{ name: "History" }]);
        expect(options.books?.tags).toEqual([]);
    });

    it("filters and overrides ordering before pagination across media types", () => {
        for (let index = 1; index <= 28; index++) addEntry(MediaType.MOVIES, index, { title: `Movie ${index}`, addedAt: `2026-01-${String(index).padStart(2, "0")} 00:00:00` });
        addEntry(MediaType.BOOKS, 50, { title: "Movie 28", addedAt: "2026-02-01" });
        const browse = { mediaType: MediaType.MOVIES, sorting: "added_newest" as const };
        const first = getDynamicListResults(1, spec, { filters: browse });
        const second = getDynamicListResults(1, spec, { page: 2, filters: browse });
        expect(first.total).toBe(28);
        expect(first.pages).toBe(2);
        expect(first.items.map(item => item.mediaId)).toEqual(Array.from({ length: 24 }, (_, index) => 28 - index));
        expect(second.items.map(item => item.mediaId)).toEqual([4, 3, 2, 1]);
        const match = getDynamicListResults(1, spec, { filters: { ...browse, search: "Movie 28" } });
        expect(match.total).toBe(1);
        expect(match.items[0].mediaId).toBe(28);
    });

    it("composes every media's list facets for saved rules and temporary browsing", async () => {
        for (const mediaType of ALL_MEDIA_TYPES) {
            addEntry(mediaType, 1);
            addEntry(mediaType, 2);
        }
        dbContext.db.update(schema.movies).set({ directorName: "Director", originalLanguage: "fr" }).where(eq(schema.movies.id, 1)).run();
        dbContext.db.insert(schema.moviesActors).values([{ mediaId: 1, name: "Actor" }, { mediaId: 1, name: "Actor alternate" }]).run();
        dbContext.db.update(schema.books).set({ language: "en" }).where(eq(schema.books.id, 1)).run();
        dbContext.db.insert(schema.booksAuthors).values({ mediaId: 1, name: "Author" }).run();
        dbContext.db.insert(schema.gamesCompanies).values({ mediaId: 1, name: "Studio", developer: true, publisher: false }).run();
        dbContext.db.update(schema.gamesList).set({ platform: GamesPlatformsEnum.PC }).where(eq(schema.gamesList.mediaId, 1)).run();
        dbContext.db.update(schema.manga).set({ publishers: "Publisher" }).where(eq(schema.manga.id, 1)).run();
        dbContext.db.insert(schema.mangaAuthors).values({ mediaId: 1, name: "Author" }).run();
        for (const [mediaTable, actorTable, networkTable] of [
            [schema.series, schema.seriesActors, schema.seriesNetwork],
            [schema.anime, schema.animeActors, schema.animeNetwork],
        ] as const) {
            dbContext.db.update(mediaTable).set({ createdBy: 'Other Creator, A "Quoted" Creator', originCountry: "US" }).where(eq(mediaTable.id, 1)).run();
            dbContext.db.insert(actorTable).values({ mediaId: 1, name: "Actor" }).run();
            dbContext.db.insert(networkTable).values({ mediaId: 1, name: "Network" }).run();
        }
        const tvFilters = { actors: ["Actor"], creators: ['A "Quoted" Creator'], networks: ["Network"], langs: ["US"] };
        const mediaFilters: ScopedMediaFilters = {
            movies: { actors: ["Actor", "Actor alternate"], directors: ["Director"], langs: ["fr"] },
            books: { authors: ["Author"], langs: ["en"] },
            games: { companies: ["Studio"], platforms: [GamesPlatformsEnum.PC] },
            manga: { authors: ["Author"], publishers: ["Publisher"] }, series: tvFilters, anime: tvFilters,
        };
        const saved = getDynamicListResults(1, { ...spec, filters: { mediaFilters } });
        const runtime = getDynamicListResults(1, spec, { filters: { mediaFilters } });
        expect(saved.total).toBe(6);
        expect(runtime.items.map(item => [item.mediaType, item.mediaId])).toEqual(saved.items.map(item => [item.mediaType, item.mediaId]));
        expect(saved.items.every(item => item.mediaId === 1)).toBe(true);

        const moviesOnly = getDynamicListResults(1, { ...spec, filters: { mediaFilters: { movies: mediaFilters.movies } } });
        expect(moviesOnly.total).toBe(11);
        expect(moviesOnly.items.filter(item => item.mediaType === MediaType.MOVIES).map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, { ...spec, mediaTypes: [MediaType.MOVIES], filters: {
            mediaFilters: { movies: { actors: ["' OR 1=1 --"] } },
        } }).total).toBe(0);

        for (const mediaType of ALL_MEDIA_TYPES) {
            const list = await createMediaListQueries(getServerMediaDefinition(mediaType).repository)
                .getMediaList(undefined, 1, mediaFilters[mediaType]!);
            expect(list.items.map(item => item.mediaId)).toEqual([1]);
        }
    });

    it("loads named options only on request and scopes them to saved owner matches", async () => {
        addEntry(MediaType.MOVIES, 1, { rating: 8 });
        addEntry(MediaType.MOVIES, 2, { rating: 2 });
        addEntry(MediaType.MOVIES, 3, { userId: 2, rating: 9 });
        dbContext.db.insert(schema.moviesActors).values([
            { mediaId: 1, name: "Saved actor" }, { mediaId: 2, name: "Excluded actor" }, { mediaId: 3, name: "Foreign actor" },
        ]).run();
        const saved: DynamicListSpec = { ...spec, filters: { minRating: 8 } };
        expect(getDynamicListResults(1, saved, { filters: {} }).filterOptions.mediaFilters).toEqual({});
        const options = getDynamicListResults(1, saved, { includeFilterOptions: true }).filterOptions.mediaFilters;
        expect(options.movies?.actors).toEqual([{ name: "Saved actor" }]);
        const editorOptions = getDynamicListEditorFilterOptions(1, [MediaType.MOVIES]);
        expect(editorOptions.mediaFilters.movies?.actors).toEqual([{ name: "Excluded actor" }, { name: "Saved actor" }]);
        const ordinary = await createMediaListQueries(getServerMediaDefinition(MediaType.MOVIES).repository).getListFilters(1);
        expect(ordinary.actors).toEqual(editorOptions.mediaFilters.movies?.actors);
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.MOVIES))).run();
        expect(getDynamicListEditorFilterOptions(1, [MediaType.MOVIES]).mediaFilters.movies?.actors).toEqual([]);
    });

    it("filters comments and hides common media using the actual visitor's list", () => {
        addEntry(MediaType.MOVIES, 1, { comment: "Comment" });
        addEntry(MediaType.MOVIES, 2);
        addEntry(MediaType.MOVIES, 3, { comment: "" });
        addEntry(MediaType.MOVIES, 1, { userId: 2 });
        expect(getDynamicListResults(1, spec, { filters: { comment: true } }).items.map(item => item.mediaId)).toEqual([1, 3]);
        expect(getDynamicListResults(1, spec, { viewerId: 2, filters: { hideCommon: true } }).items.map(item => item.mediaId)).toEqual([2, 3]);
        expect(getDynamicListResults(1, spec, { viewerId: 1, filters: { hideCommon: true } }).total).toBe(3);
        expect(() => getDynamicListResults(1, spec, { filters: { hideCommon: true } })).toThrow("Sign in");
    });

    it("decodes user custom covers and catalog covers using each media directory", () => {
        addEntry(MediaType.MOVIES, 1, { customCover: "https://old.example.invalid/static/movies-covers/custom.jpg", favorite: true });
        addEntry(MediaType.BOOKS, 2, { favorite: false });
        const items = getDynamicListResults(1, spec).items;
        expect(items[0]).toMatchObject({ imageCover: "https://mylists.example.invalid/static/movies-covers/custom.jpg", favorite: true });
        expect(items[1]).toMatchObject({ imageCover: "https://mylists.example.invalid/static/books-covers/2.jpg", favorite: false });
    });

    it("preserves false-favorite behavior for saved rules and tracking browsing", async () => {
        addEntry(MediaType.MOVIES, 1);
        addEntry(MediaType.BOOKS, 2, { favorite: false, rating: 0 });
        addEntry(MediaType.GAMES, 3, { favorite: true, rating: 5 });
        expect(getDynamicListResults(1, { ...spec, filters: { favorite: false } }).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getDynamicListResults(1, spec, { filters: { favorite: false } }).total).toBe(3);
        const ordinary = await createMediaListQueries(getServerMediaDefinition(MediaType.GAMES).repository)
            .getMediaList(undefined, 1, { favorite: false });
        expect(ordinary.items.map(item => item.mediaId)).toEqual([3]);
        expect(getDynamicListResults(1, { ...spec, filters: { minRating: 0, maxRating: 0 } }).items.map(item => item.mediaId)).toEqual([2]);
    });

    it("searches titles case-insensitively with literal wildcard characters and bound input", () => {
        addEntry(MediaType.MOVIES, 1, { title: "A 100%_real Adventure" });
        addEntry(MediaType.BOOKS, 2, { title: "A 100xyzreal Adventure" });
        addEntry(MediaType.GAMES, 3, { title: "' OR 1=1 --" });
        expect(getDynamicListResults(1, { ...spec, filters: { search: "100%_REAL" } }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, spec, { filters: { search: "100%_REAL" } }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, { ...spec, filters: { search: "' OR 1=1 --" } }).items.map(item => item.mediaId)).toEqual([3]);
    });

    it("ORs exact statuses within each media's allowed statuses and ANDs a status group", () => {
        addEntry(MediaType.BOOKS, 1, { status: Status.READING });
        addEntry(MediaType.GAMES, 2, { status: Status.MULTIPLAYER });
        addEntry(MediaType.MOVIES, 3, { status: Status.COMPLETED });
        addEntry(MediaType.MOVIES, 4, { status: Status.READING });
        const statuses = [Status.READING, Status.MULTIPLAYER];
        expect(getDynamicListResults(1, { ...spec, filters: { statuses } }).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getDynamicListResults(1, { ...spec, filters: { statuses, statusGroup: "in_progress" } }).items.map(item => item.mediaId)).toEqual([1]);
    });

    it("uses inclusive release-year bounds and any catalog genre without duplicate entries", () => {
        addEntry(MediaType.MOVIES, 1, { releaseDate: "2000-01-01" });
        addEntry(MediaType.BOOKS, 2, { releaseDate: "2010-12-31" });
        addEntry(MediaType.GAMES, 3, { releaseDate: "1999-12-31" });
        addEntry(MediaType.MOVIES, 4, { releaseDate: null });
        addEntry(MediaType.BOOKS, 5, { releaseDate: "not-a-date" });
        dbContext.db.insert(schema.moviesGenre).values([
            { mediaId: 1, name: "Drama" }, { mediaId: 1, name: "Comedy" }, { mediaId: 4, name: "Drama" },
        ]).run();
        dbContext.db.insert(schema.booksGenre).values([{ mediaId: 2, name: "Comedy" }, { mediaId: 5, name: "Drama" }]).run();
        const filters = { genres: ["Drama", "Comedy"], minReleaseYear: 2000, maxReleaseYear: 2010 };
        expect(getDynamicListResults(1, { ...spec, filters }).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getDynamicListResults(1, { ...spec, filters: { genres: ["' OR 1=1 --"] } }).total).toBe(0);
    });

    it("distinguishes rated zero from unrated entries and ignores empty comments", () => {
        addEntry(MediaType.MOVIES, 1, { rating: null, comment: null });
        addEntry(MediaType.BOOKS, 2, { rating: 0, comment: "  loved it  " });
        addEntry(MediaType.GAMES, 3, { rating: 8, comment: "" });
        addEntry(MediaType.MOVIES, 4, { rating: null, comment: "   " });
        expect(getDynamicListResults(1, { ...spec, filters: { rated: true } }).items.map(item => item.mediaId)).toEqual([2, 3]);
        expect(getDynamicListResults(1, { ...spec, filters: { rated: false } }).items.map(item => item.mediaId)).toEqual([1, 4]);
        expect(getDynamicListResults(1, { ...spec, filters: { hasComment: true, rated: true } }).items.map(item => item.mediaId)).toEqual([2]);
        expect(getDynamicListResults(1, { ...spec, filters: { hasComment: false } }).items.map(item => item.mediaId)).toEqual([1, 3, 4]);
    });

    it("matches all requested tags and excludes any owner tag while ignoring other users' tags", () => {
        for (let id = 1; id <= 4; id++) addEntry(MediaType.MOVIES, id);
        dbContext.db.insert(schema.moviesTags).values([
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 1, mediaId: 1, name: "short" },
            { userId: 1, mediaId: 2, name: "cozy" }, { userId: 2, mediaId: 2, name: "short" },
            { userId: 1, mediaId: 3, name: "cozy" }, { userId: 1, mediaId: 3, name: "short" }, { userId: 1, mediaId: 3, name: "skip" },
            { userId: 2, mediaId: 1, name: "skip" }, { userId: 1, mediaId: 4, name: "short" },
            { userId: 1, name: "skip" },
        ]).run();
        const tags = ["cozy", "short", "cozy"];
        expect(getDynamicListResults(1, { ...spec, filters: { tags, tagsMatch: "all" } }).items.map(item => item.mediaId)).toEqual([1, 3]);
        expect(getDynamicListResults(1, { ...spec, filters: { tags, tagsMatch: "all", excludeTags: ["skip"] } }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, { ...spec, filters: { tags, tagsMatch: "any", excludeTags: ["skip"] } }).items.map(item => item.mediaId)).toEqual([1, 2, 4]);
        expect(getDynamicListResults(1, { ...spec, filters: { excludeTags: ["' OR 1=1 --"] } }).total).toBe(4);
    });

    it("combines a clamped added-date window with a last-updated cutoff and excludes unknown dates", () => {
        const now = new Date("2026-08-31T12:00:00Z");
        addEntry(MediaType.MOVIES, 1, { addedAt: "2025-08-31 12:00:00", lastUpdated: "2026-02-28T11:59:59Z" });
        addEntry(MediaType.BOOKS, 2, { addedAt: "2026-02-28T11:59:59Z", lastUpdated: "2026-02-28 12:00:00" });
        addEntry(MediaType.GAMES, 3, { addedAt: "2026-02-28T12:00:00Z", lastUpdated: "2025-01-01" });
        addEntry(MediaType.MOVIES, 4, { addedAt: "2025-08-31T11:59:59Z", lastUpdated: "2025-01-01" });
        addEntry(MediaType.BOOKS, 5, { addedAt: null, lastUpdated: "2025-01-01" });
        addEntry(MediaType.GAMES, 6, { addedAt: "2026-01-01", lastUpdated: null });
        const filters = { addedWithin: { monthsAgo: 12 }, addedBefore: { monthsAgo: 6 }, updatedBefore: { monthsAgo: 6 } };
        expect(getDynamicListResults(1, { ...spec, filters }, { now }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, { ...spec, filters: { addedWithin: { monthsAgo: 6 } } }, { now }).items.map(item => item.mediaId)).toEqual([3]);
        expect(getDynamicListResults(1, { ...spec, filters: { updatedBefore: { monthsAgo: 6 } } }, { now }).items.map(item => item.mediaId)).toEqual([4, 1, 3, 5]);
    });
});
