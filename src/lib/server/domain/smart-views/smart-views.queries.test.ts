import Database from "bun:sqlite";
import {and, eq} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {MediaType, RatingSystemType, Status} from "@/lib/utils/enums";
import * as schema from "@/lib/server/database/schema";
import {ALL_MEDIA_TYPES, getMediaDefinition} from "@/lib/media-definitions/definition.registry";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import type {SmartViewSpec} from "@/lib/schemas/smart-views.schema";
import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {createMediaListQueries} from "@/lib/server/domain/media/base/media-list.queries";
import {createMediaBrowseQueryParts} from "@/lib/server/domain/media/base/media-browse.queries";
import {getSmartViewEditorFilterOptions, getSmartViewResults, getSmartViewSummary} from "./smart-views.queries";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));

const spec: SmartViewSpec = {
    version: 1, title: "My smart list", mediaTypes: "all", filters: {},
    sort: { field: "addedAt", direction: "asc" }, display: "grid",
};


describe("smart list live queries", () => {
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
        expect(getSmartViewResults(1, spec).items.map(item => item.mediaId)).toEqual([1]);
        expect(getSmartViewResults(1, { ...spec, mediaTypes: [MediaType.BOOKS] }).total).toBe(0);
        dbContext.db.update(schema.userMediaSettings).set({ active: true }).where(eq(schema.userMediaSettings.userId, 1)).run();
        expect(getSmartViewResults(1, spec).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getSmartViewResults(2, spec).items.map(item => item.mediaId)).toEqual([3]);
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
        expect(getSmartViewEditorFilterOptions(1, "all")).toEqual({ genres: ["Comedy", "Drama"], tags: ["cozy", "learning"] });
        expect(getSmartViewEditorFilterOptions(1, [MediaType.BOOKS])).toEqual({ genres: ["Drama"], tags: ["learning"] });
        expect(getSmartViewEditorFilterOptions(1, [MediaType.MANGA])).toEqual({ genres: [], tags: [] });
        expect(getSmartViewEditorFilterOptions(2, [MediaType.MOVIES])).toEqual({ genres: ["Foreign genre"], tags: ["Foreign tag"] });
    });

    it("returns only four owner cover previews while counting all saved matches", () => {
        for (let id = 1; id <= 6; id++) addEntry(MediaType.MOVIES, id, { rating: 8, comment: "Private detail", customCover: id === 1 ? "custom.jpg" : null });
        addEntry(MediaType.MOVIES, 7, { userId: 2 });
        addEntry(MediaType.BOOKS, 8);
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.BOOKS))).run();
        const preview = getSmartViewSummary(1, spec);
        expect(preview.total).toBe(6);
        expect(preview.covers).toHaveLength(4);
        expect(preview.covers[0]).toEqual({
            mediaType: MediaType.MOVIES, mediaId: 1, title: "Media 1",
            imageCover: "https://mylists.example.invalid/static/movies-covers/custom.jpg",
        });
        expect(preview.covers.every(cover => Object.keys(cover).sort().join(",") === "imageCover,mediaId,mediaType,title")).toBe(true);
        expect(getSmartViewSummary(1, { ...spec, filters: { search: "missing" } })).toEqual({ total: 0, covers: [] });
    });

    it("resolves planned aliases across all six media types", () => {
        for (const [index, mediaType] of ALL_MEDIA_TYPES.entries()) {
            addEntry(mediaType, index + 1, { status: getServerMediaDefinition(mediaType).service.defaultStatus });
        }
        expect(getSmartViewResults(1, { ...spec, filters: { statusGroup: "planned" } }).total).toBe(6);
        expect(getSmartViewResults(1, { ...spec, filters: { statusGroup: "completed" } }).total).toBe(0);
    });

    it("offers only matching active media types before temporary filters and pagination", () => {
        for (let id = 1; id <= 25; id++) addEntry(MediaType.MOVIES, id);
        addEntry(MediaType.BOOKS, 50);
        addEntry(MediaType.MANGA, 51);
        addEntry(MediaType.GAMES, 52, { status: Status.PLAN_TO_PLAY });
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.MANGA))).run();
        const saved: SmartViewSpec = { ...spec, filters: { statusGroup: "completed" } };
        const result = getSmartViewResults(1, saved, { filters: { search: "Media 50" } });
        expect(result.mediaTypes).toEqual([MediaType.MOVIES, MediaType.BOOKS]);
        expect(result.items.map(item => item.mediaId)).toEqual([50]);
        expect(getSmartViewResults(1, saved, { page: 2, filters: { mediaType: MediaType.MOVIES } }).mediaTypes).toEqual(result.mediaTypes);
        expect(getSmartViewResults(1, saved, { filters: { search: "missing" } }).mediaTypes).toEqual(result.mediaTypes);
        expect(getSmartViewResults(1, { ...saved, filters: { search: "missing" } }).mediaTypes).toEqual([]);
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.BOOKS))).run();
        expect(getSmartViewResults(1, saved, { filters: { sorting: "provider_rating_highest" } }).mediaTypes).toEqual([MediaType.MOVIES]);
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
        const items = getSmartViewResults(1, spec).items;
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
        expect(getSmartViewResults(1, { ...spec, filters: { statusGroup: "in_progress" } }).items.map(item => item.mediaId)).toEqual([1, 2, 3]);
        expect(getSmartViewResults(1, { ...spec, mediaTypes: [MediaType.MOVIES], filters: { statusGroup: "in_progress" } }).total).toBe(0);
    });

    it("sorts mixed timestamp formats chronologically and paginates globally across types", () => {
        for (let id = 1; id <= 50; id++) {
            const timestamp = new Date(Date.UTC(2026, 0, 1, 0, id)).toISOString();
            addEntry(id % 2 ? MediaType.MOVIES : MediaType.BOOKS, id, { addedAt: id % 2 ? timestamp : timestamp.replace("T", " ").replace("Z", "") });
        }
        const first = getSmartViewResults(1, spec);
        const second = getSmartViewResults(1, spec, { page: 2 });
        const third = getSmartViewResults(1, spec, { page: 3 });
        expect(first).toMatchObject({ total: 50, page: 1, perPage: 24, pages: 3 });
        expect(first.items.map(item => item.mediaId)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
        expect(second.items.map(item => item.mediaId)).toEqual(Array.from({ length: 24 }, (_, i) => i + 25));
        expect(third.items.map(item => item.mediaId)).toEqual([49, 50]);
        expect(getSmartViewResults(1, { ...spec, sort: { field: "addedAt", direction: "desc" } }).items[0].mediaId).toBe(50);
    });

    it("uses stable ordering for ties and places null ratings last in either direction", () => {
        addEntry(MediaType.MOVIES, 1, { title: "Same", rating: 8 });
        addEntry(MediaType.BOOKS, 1, { title: "Same", rating: 8 });
        addEntry(MediaType.GAMES, 1, { title: "Same", rating: null });
        expect(getSmartViewResults(1, spec).items.map(item => item.mediaType)).toEqual([MediaType.BOOKS, MediaType.GAMES, MediaType.MOVIES]);
        for (const direction of ["asc", "desc"] as const) {
            expect(getSmartViewResults(1, { ...spec, sort: { field: "rating", direction } }).items.map(item => item.mediaType)).toEqual([MediaType.BOOKS, MediaType.MOVIES, MediaType.GAMES]);
        }
    });

    it("sorts mixed-case titles across media types with stable ties in either direction", () => {
        addEntry(MediaType.GAMES, 1, { title: "banana" });
        addEntry(MediaType.BOOKS, 2, { title: "Apricot" });
        addEntry(MediaType.ANIME, 3, { title: "cherry" });
        addEntry(MediaType.MOVIES, 4, { title: "apple" });
        addEntry(MediaType.SERIES, 5, { title: "Banana" });
        addEntry(MediaType.MANGA, 6, { title: "Date" });
        expect(getSmartViewResults(1, { ...spec, sort: { field: "title", direction: "asc" } }).items.map(item => item.mediaId))
            .toEqual([4, 2, 1, 5, 3, 6]);
        expect(getSmartViewResults(1, spec, { filters: { sorting: "title_desc" } }).items.map(item => item.mediaId))
            .toEqual([6, 3, 1, 5, 2, 4]);
    });

    it.each([
        { mediaType: MediaType.BOOKS, catalogField: "pages", highest: "pages_highest", lowest: "pages_lowest", personalField: "redo", personalSort: "redo_highest" },
        { mediaType: MediaType.MANGA, catalogField: "chapters", highest: "chapters_highest", lowest: "chapters_lowest", personalField: "redo", personalSort: "redo_highest" },
        { mediaType: MediaType.GAMES, catalogField: "voteAverage", highest: "provider_rating_highest", lowest: "provider_rating_lowest", personalField: "playtime", personalSort: "playtime_highest" },
        { mediaType: MediaType.MOVIES, catalogField: "voteAverage", highest: "provider_rating_highest", lowest: "provider_rating_lowest", personalField: "redo", personalSort: "redo_highest" },
        { mediaType: MediaType.ANIME, catalogField: "voteAverage", highest: "provider_rating_highest", lowest: "provider_rating_lowest", personalField: "redo", personalSort: "redo_highest" },
        { mediaType: MediaType.SERIES, catalogField: "voteAverage", highest: "provider_rating_highest", lowest: "provider_rating_lowest", personalField: "redo", personalSort: "redo_highest" },
    ] as const)("shares $mediaType catalogue and personal ordering across browse, tracking lists and smart lists", async ({ mediaType, catalogField, highest, lowest, personalField, personalSort }) => {
        const definition = getServerMediaDefinition(mediaType);
        const { mediaTable, listTable } = definition.repository.tables;
        const listQueries = createMediaListQueries(definition.repository);
        const saved: SmartViewSpec = { ...spec, mediaTypes: [mediaType] };
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
            const smart = getSmartViewResults(1, saved, { filters: { sorting } });
            expect(catalogue.map(item => item.mediaId)).toEqual(expected);
            expect(list.items.map(item => item.mediaId)).toEqual(expected);
            expect(smart.items.map(item => item.mediaId)).toEqual(expected);
            expect(smart.sorting).toBe(sorting);
        }

        const personalLabel = getMediaSortLabel(getMediaDefinition(mediaType), personalSort);
        const list = await listQueries.getMediaList(undefined, 1, { sorting: personalLabel });
        const smart = getSmartViewResults(1, saved, { filters: { sorting: personalSort } });
        expect(list.items.map(item => item.mediaId)).toEqual([2, 1, 3]);
        expect(smart.items.map(item => item.mediaId)).toEqual([2, 1, 3]);
        expect(smart.items[0]).toMatchObject({
            providerRating: mediaType === MediaType.BOOKS ? null : 9,
            redo: mediaType === MediaType.GAMES ? null : 3,
            pages: mediaType === MediaType.BOOKS ? 9 : null,
            chapters: mediaType === MediaType.MANGA ? 9 : null,
            playtime: mediaType === MediaType.GAMES ? 3 : null,
        });
        expect(smart.items[0]).not.toHaveProperty("sortValue");
        if (mediaType === MediaType.GAMES) {
            expect(getSmartViewResults(1, saved, { filters: { sorting: "playtime_lowest" } }).items.map(item => item.mediaId)).toEqual([3, 1, 2]);
        }
    });

    it("falls back for media-specific orders unsupported by mixed media", () => {
        addEntry(MediaType.MOVIES, 1);
        addEntry(MediaType.BOOKS, 3);
        addEntry(MediaType.GAMES, 5);
        expect(getSmartViewResults(1, spec, { filters: { sorting: "pages_highest" } }).sorting).toBe("default");
        expect(getSmartViewResults(1, spec, { filters: { mediaType: MediaType.BOOKS, sorting: "pages_highest" } }))
            .toMatchObject({ sorting: "pages_highest", total: 1, items: [{ mediaType: MediaType.BOOKS, mediaId: 3 }] });
        expect(getSmartViewResults(1, { ...spec, mediaTypes: [MediaType.BOOKS] }, {
            filters: { mediaType: MediaType.MOVIES, sorting: "pages_highest" },
        }).total).toBe(0);
    });

    it("keeps stale sorts usable when the last matching type disappears or new types match", () => {
        addEntry(MediaType.BOOKS, 1, { status: Status.PLAN_TO_READ });
        addEntry(MediaType.GAMES, 2);
        const saved: SmartViewSpec = { ...spec, filters: { statusGroup: "planned" } };
        expect(getSmartViewResults(1, saved, { filters: { sorting: "pages_highest" } }).sorting).toBe("pages_highest");
        dbContext.db.update(schema.gamesList).set({ status: Status.PLAN_TO_PLAY }).where(eq(schema.gamesList.mediaId, 2)).run();
        expect(getSmartViewResults(1, saved, { filters: { sorting: "pages_highest" } })).toMatchObject({ sorting: "default", total: 2 });
        dbContext.db.update(schema.booksList).set({ status: Status.COMPLETED }).where(eq(schema.booksList.mediaId, 1)).run();
        expect(getSmartViewResults(1, saved, { filters: { mediaType: MediaType.BOOKS, sorting: "pages_highest" } }))
            .toMatchObject({ total: 0, sorting: "pages_highest", mediaTypes: [MediaType.GAMES] });
        dbContext.db.update(schema.gamesList).set({ status: Status.COMPLETED }).where(eq(schema.gamesList.mediaId, 2)).run();
        expect(getSmartViewResults(1, saved, { filters: { sorting: "pages_highest" } })).toMatchObject({ total: 0, sorting: "default", mediaTypes: [] });
    });

    it.each([
        ["2026-08-31T12:00:00Z", "2026-02-28T12:00:00Z"],
        ["2024-08-31T12:00:00Z", "2024-02-29T12:00:00Z"],
    ])("uses clamped UTC calendar months from %s", (now, boundary) => {
        addEntry(MediaType.MOVIES, 1, { addedAt: new Date(new Date(boundary).getTime() - 1_000).toISOString(), status: Status.PLAN_TO_WATCH });
        addEntry(MediaType.BOOKS, 2, { addedAt: boundary, status: Status.PLAN_TO_READ });
        addEntry(MediaType.GAMES, 3, { addedAt: null, status: Status.PLAN_TO_PLAY });
        const querySpec: SmartViewSpec = { ...spec, filters: { statusGroup: "planned", addedBefore: { monthsAgo: 6 } } };
        expect(getSmartViewResults(1, querySpec, { now: new Date(now) }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getSmartViewResults(1, querySpec, { now: new Date(new Date(now).getTime() + 1_000) }).items.map(item => item.mediaId)).toEqual([1, 2]);
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
        const querySpec: SmartViewSpec = { ...spec, filters: { statusGroup: "completed", minRating: 8, maxRating: 9, favorite: true, tags: ["cozy", "short"] } };
        expect(getSmartViewResults(1, querySpec).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getSmartViewResults(1, { ...spec, filters: { tags: ["' OR 1=1 --"] } }).total).toBe(0);
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
        const saved: SmartViewSpec = { ...spec, filters: { statusGroup: "completed", minRating: 8 } };
        const result = getSmartViewResults(1, saved, { filters: { genres: ["Drama"], tags: ["cozy"], favorite: true } });
        expect(result.items.map(item => item.mediaId)).toEqual([1]);
        expect(result.filterOptions).toEqual({ genres: ["Drama", "History"], tags: ["cozy", "learning"] });
        expect(getSmartViewResults(1, saved, { filters: { status: Status.PLAN_TO_WATCH } }).total).toBe(0);
        expect(getSmartViewResults(1, saved).total).toBe(2);
        expect(saved.filters).toEqual({ statusGroup: "completed", minRating: 8 });
    });

    it("filters and overrides ordering before pagination across media types", () => {
        for (let index = 1; index <= 28; index++) addEntry(MediaType.MOVIES, index, { title: `Movie ${index}`, addedAt: `2026-01-${String(index).padStart(2, "0")} 00:00:00` });
        addEntry(MediaType.BOOKS, 50, { title: "Movie 28", addedAt: "2026-02-01" });
        const browse = { mediaType: MediaType.MOVIES, sorting: "added_newest" as const };
        const first = getSmartViewResults(1, spec, { filters: browse });
        const second = getSmartViewResults(1, spec, { page: 2, filters: browse });
        expect(first.total).toBe(28);
        expect(first.pages).toBe(2);
        expect(first.items.map(item => item.mediaId)).toEqual(Array.from({ length: 24 }, (_, index) => 28 - index));
        expect(second.items.map(item => item.mediaId)).toEqual([4, 3, 2, 1]);
        const match = getSmartViewResults(1, spec, { filters: { ...browse, search: "Movie 28" } });
        expect(match.total).toBe(1);
        expect(match.items[0].mediaId).toBe(28);
    });

    it("decodes user custom covers and catalog covers using each media directory", () => {
        addEntry(MediaType.MOVIES, 1, { customCover: "https://old.example.invalid/static/movies-covers/custom.jpg", favorite: true });
        addEntry(MediaType.BOOKS, 2, { favorite: false });
        const items = getSmartViewResults(1, spec).items;
        expect(items[0]).toMatchObject({ imageCover: "https://mylists.example.invalid/static/movies-covers/custom.jpg", favorite: true });
        expect(items[1]).toMatchObject({ imageCover: "https://mylists.example.invalid/static/books-covers/2.jpg", favorite: false });
    });

    it("includes unset favorites in a false favorite filter and excludes unrated media from rating ranges", () => {
        addEntry(MediaType.MOVIES, 1);
        addEntry(MediaType.BOOKS, 2, { favorite: false, rating: 0 });
        addEntry(MediaType.GAMES, 3, { favorite: true, rating: 5 });
        expect(getSmartViewResults(1, { ...spec, filters: { favorite: false } }).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getSmartViewResults(1, { ...spec, filters: { minRating: 0, maxRating: 0 } }).items.map(item => item.mediaId)).toEqual([2]);
    });

    it("searches titles case-insensitively with literal wildcard characters and bound input", () => {
        addEntry(MediaType.MOVIES, 1, { title: "A 100%_real Adventure" });
        addEntry(MediaType.BOOKS, 2, { title: "A 100xyzreal Adventure" });
        addEntry(MediaType.GAMES, 3, { title: "' OR 1=1 --" });
        expect(getSmartViewResults(1, { ...spec, filters: { search: "100%_REAL" } }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getSmartViewResults(1, { ...spec, filters: { search: "' OR 1=1 --" } }).items.map(item => item.mediaId)).toEqual([3]);
    });

    it("ORs exact statuses within each media's allowed statuses and ANDs a status group", () => {
        addEntry(MediaType.BOOKS, 1, { status: Status.READING });
        addEntry(MediaType.GAMES, 2, { status: Status.MULTIPLAYER });
        addEntry(MediaType.MOVIES, 3, { status: Status.COMPLETED });
        addEntry(MediaType.MOVIES, 4, { status: Status.READING });
        const statuses = [Status.READING, Status.MULTIPLAYER];
        expect(getSmartViewResults(1, { ...spec, filters: { statuses } }).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getSmartViewResults(1, { ...spec, filters: { statuses, statusGroup: "in_progress" } }).items.map(item => item.mediaId)).toEqual([1]);
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
        expect(getSmartViewResults(1, { ...spec, filters }).items.map(item => item.mediaId)).toEqual([1, 2]);
        expect(getSmartViewResults(1, { ...spec, filters: { genres: ["' OR 1=1 --"] } }).total).toBe(0);
    });

    it("distinguishes rated zero from unrated entries and ignores empty comments", () => {
        addEntry(MediaType.MOVIES, 1, { rating: null, comment: null });
        addEntry(MediaType.BOOKS, 2, { rating: 0, comment: "  loved it  " });
        addEntry(MediaType.GAMES, 3, { rating: 8, comment: "" });
        addEntry(MediaType.MOVIES, 4, { rating: null, comment: "   " });
        expect(getSmartViewResults(1, { ...spec, filters: { rated: true } }).items.map(item => item.mediaId)).toEqual([2, 3]);
        expect(getSmartViewResults(1, { ...spec, filters: { rated: false } }).items.map(item => item.mediaId)).toEqual([1, 4]);
        expect(getSmartViewResults(1, { ...spec, filters: { hasComment: true, rated: true } }).items.map(item => item.mediaId)).toEqual([2]);
        expect(getSmartViewResults(1, { ...spec, filters: { hasComment: false } }).items.map(item => item.mediaId)).toEqual([1, 3, 4]);
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
        expect(getSmartViewResults(1, { ...spec, filters: { tags, tagsMatch: "all" } }).items.map(item => item.mediaId)).toEqual([1, 3]);
        expect(getSmartViewResults(1, { ...spec, filters: { tags, tagsMatch: "all", excludeTags: ["skip"] } }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getSmartViewResults(1, { ...spec, filters: { tags, tagsMatch: "any", excludeTags: ["skip"] } }).items.map(item => item.mediaId)).toEqual([1, 2, 4]);
        expect(getSmartViewResults(1, { ...spec, filters: { excludeTags: ["' OR 1=1 --"] } }).total).toBe(4);
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
        expect(getSmartViewResults(1, { ...spec, filters }, { now }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getSmartViewResults(1, { ...spec, filters: { addedWithin: { monthsAgo: 6 } } }, { now }).items.map(item => item.mediaId)).toEqual([3]);
        expect(getSmartViewResults(1, { ...spec, filters: { updatedBefore: { monthsAgo: 6 } } }, { now }).items.map(item => item.mediaId)).toEqual([4, 1, 3, 5]);
    });
});
