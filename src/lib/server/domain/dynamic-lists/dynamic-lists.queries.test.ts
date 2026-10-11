import {createMediaQueries} from "@/lib/server/domain/media/base/media.queries";
import {seedMediaTags} from "@/lib/server/domain/media/tag-test-utils";
import Database from "bun:sqlite";
import {and, eq} from "drizzle-orm";
import {drizzle, type BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {GamesPlatformsEnum, MediaType, Status, TagAction} from "@/lib/utils/enums";
import type {ScopedMediaFilters} from "@/lib/schemas/media-filters.schema";
import * as schema from "@/lib/server/database/schema";
import {ALL_MEDIA_TYPES} from "@/lib/media-definitions/definition.registry";
import {getServerMediaDefinition} from "@/lib/media-definitions/definition.registry.server";
import type {DynamicListSpec} from "@/lib/schemas/dynamic-lists.schema";

import {createMediaListQueries} from "@/lib/server/domain/media/base/media-list.queries";

import {dynamicListsRepository} from "./dynamic-lists.repository";
import {createMediaTagQueries} from "@/lib/server/domain/media/base/media-tag.queries";
import {getDynamicListEditorFilterOptions, getDynamicListResults, getDynamicListSummary} from "./dynamic-lists.queries";


const dbContext = vi.hoisted(() => ({ db: undefined as unknown as BunSQLiteDatabase<typeof schema> }));
vi.mock("@/lib/server/database/db", () => ({ get db() { return dbContext.db; } }));
vi.mock("@/env/client", () => ({ clientEnv: { VITE_BASE_URL: "https://mylists.example.invalid" } }));
vi.mock("@/env/server", () => ({ serverEnv: { UPLOADS_DIR_NAME: "static" } }));

const spec: DynamicListSpec = {
    version: 2, title: "My dynamic list", mediaTypes: "all", filters: {},
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

    function tagId(mediaType: MediaType, name: string, userId = 1) {
        return dbContext.db.select({ id: schema.mediaTags.id }).from(schema.mediaTags)
            .where(and(eq(schema.mediaTags.userId, userId), eq(schema.mediaTags.mediaType, mediaType), eq(schema.mediaTags.name, name))).get()!.id;
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
        seedMediaTags(dbContext.db, MediaType.MOVIES, [
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 2, mediaId: 1, name: "Visitor tag" },
            { userId: 1, name: "Unused tag" }, { userId: 2, mediaId: 4, name: "Foreign tag" },
        ]);
        seedMediaTags(dbContext.db, MediaType.BOOKS, { userId: 1, mediaId: 2, name: "learning" });
        seedMediaTags(dbContext.db, MediaType.MANGA, { userId: 1, mediaId: 3, name: "Inactive tag" });
        dbContext.db.update(schema.userMediaSettings).set({ active: false })
            .where(and(eq(schema.userMediaSettings.userId, 1), eq(schema.userMediaSettings.mediaType, MediaType.MANGA))).run();
        expect(getDynamicListEditorFilterOptions(1, "all")).toMatchObject({ genres: ["Comedy", "Drama"], mediaFilters: { movies: { tags: [{ name: "cozy" }, { name: "Unused tag" }] }, books: { tags: [{ name: "learning" }] } } });
        expect(getDynamicListEditorFilterOptions(1, [MediaType.BOOKS])).toMatchObject({ genres: ["Drama"], mediaFilters: { books: { tags: [{ name: "learning" }] } } });
        expect(getDynamicListEditorFilterOptions(1, [MediaType.MANGA])).toMatchObject({ genres: [], mediaFilters: { manga: { tags: [] } } });
        expect(getDynamicListEditorFilterOptions(2, [MediaType.MOVIES])).toMatchObject({ genres: ["Foreign genre"], mediaFilters: { movies: { tags: [{ name: "Foreign tag" }, { name: "Visitor tag" }] } } });
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

it("ANDs filters, matches any requested tag, and scopes tags to the owner", () => {
        addEntry(MediaType.MOVIES, 1, { rating: 8, favorite: true });
        addEntry(MediaType.BOOKS, 2, { rating: 9, favorite: true });
        addEntry(MediaType.GAMES, 3, { rating: 7, favorite: true });
        addEntry(MediaType.MOVIES, 4, { rating: 8, favorite: false });
        addEntry(MediaType.MOVIES, 5, { rating: 8, favorite: true });
        seedMediaTags(dbContext.db, MediaType.MOVIES, [
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 1, mediaId: 1, name: "short" },
            { userId: 1, mediaId: 4, name: "cozy" }, { userId: 2, mediaId: 5, name: "cozy" },
            { userId: 1, name: "cozy" },
        ]);
        seedMediaTags(dbContext.db, MediaType.BOOKS, { userId: 1, mediaId: 2, name: "short" });
        seedMediaTags(dbContext.db, MediaType.GAMES, { userId: 1, mediaId: 3, name: "cozy" });
        const querySpec: DynamicListSpec = { ...spec, filters: { statusGroup: "completed", minRating: 8, maxRating: 9, favorite: true, mediaFilters: {
            movies: { tagRules: [{ tags: [tagId(MediaType.MOVIES, "cozy"), tagId(MediaType.MOVIES, "short")] }] },
            books: { tagRules: [{ tags: [tagId(MediaType.BOOKS, "short")] }] },
            games: { tagRules: [{ tags: [tagId(MediaType.GAMES, "cozy")] }] },
        } } };
        expect(getDynamicListResults(1, querySpec).items.map(item => item.mediaId)).toEqual([1, 2]);
        seedMediaTags(dbContext.db, MediaType.MOVIES, { userId: 1, name: "' OR 1=1 --" });
        expect(getDynamicListResults(1, { ...spec, mediaTypes: [MediaType.MOVIES], filters: {
            mediaFilters: { movies: { tagRules: [{ tags: [tagId(MediaType.MOVIES, "' OR 1=1 --")] }] } },
        } }).total).toBe(0);
    });

    it("narrows saved rules with temporary filters and exposes options only from the saved view", () => {
        addEntry(MediaType.MOVIES, 1, { rating: 9, favorite: true });
        addEntry(MediaType.BOOKS, 2, { rating: 8, favorite: false });
        addEntry(MediaType.MOVIES, 3, { rating: 10, status: Status.PLAN_TO_WATCH });
        dbContext.db.insert(schema.moviesGenre).values([{ mediaId: 1, name: "Drama" }, { mediaId: 3, name: "Excluded genre" }]).run();
        dbContext.db.insert(schema.booksGenre).values({ mediaId: 2, name: "History" }).run();
        seedMediaTags(dbContext.db, MediaType.MOVIES, [
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 2, mediaId: 1, name: "Other user's tag" },
            { userId: 1, mediaId: 3, name: "Excluded tag" },
        ]);
        seedMediaTags(dbContext.db, MediaType.BOOKS, { userId: 1, mediaId: 2, name: "learning" });
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
        seedMediaTags(dbContext.db, MediaType.MOVIES, [
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 1, mediaId: 1, name: "short" },
            { userId: 2, mediaId: 2, name: "cozy" },
        ]);
        const mediaFilters = { movies: { genres: ["Drama"], tagRules: [{ tags: [tagId(MediaType.MOVIES, "cozy"), tagId(MediaType.MOVIES, "short")], tagsMatch: "all" as const }] } };
        const saved = getDynamicListResults(1, { ...spec, filters: { minRating: 8, mediaFilters } });
        expect(saved.items.map(item => [item.mediaType, item.mediaId])).toEqual([[MediaType.BOOKS, 1], [MediaType.MOVIES, 1]]);
        expect(getDynamicListResults(1, spec, { filters: { minRating: 8, mediaFilters: { movies: { genres: ["Drama"], tags: ["cozy", "short"], tagsMatch: "all" } } } }).items).toEqual(saved.items);
        expect(getDynamicListResults(1, { ...spec, filters: { mediaFilters: { movies: { tagRules: [{ tags: [tagId(MediaType.MOVIES, "cozy")], excludeTags: [tagId(MediaType.MOVIES, "short")] }] } } } }).items.map(item => item.mediaType)).toEqual([MediaType.BOOKS]);
        const options = getDynamicListEditorFilterOptions(1, "all").mediaFilters;
        expect(options.movies?.genres).toEqual([{ name: "Comedy" }, { name: "Drama" }]);
        expect(options.movies?.tags).toMatchObject([{ name: "cozy" }, { name: "short" }]);
        expect(options.books?.genres).toEqual([{ name: "History" }]);
        expect(options.books?.tags).toEqual([]);
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

    it("searches titles case-insensitively with literal wildcard characters and bound input", () => {
        addEntry(MediaType.MOVIES, 1, { title: "A 100%_real Adventure" });
        addEntry(MediaType.BOOKS, 2, { title: "A 100xyzreal Adventure" });
        addEntry(MediaType.GAMES, 3, { title: "' OR 1=1 --" });
        expect(getDynamicListResults(1, { ...spec, filters: { search: "100%_REAL" } }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, spec, { filters: { search: "100%_REAL" } }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, { ...spec, filters: { search: "' OR 1=1 --" } }).items.map(item => item.mediaId)).toEqual([3]);
    });

it("matches all requested tags and excludes any owner tag while ignoring other users' tags", () => {
        for (let id = 1; id <= 4; id++) addEntry(MediaType.MOVIES, id);
        seedMediaTags(dbContext.db, MediaType.MOVIES, [
            { userId: 1, mediaId: 1, name: "cozy" }, { userId: 1, mediaId: 1, name: "short" },
            { userId: 1, mediaId: 2, name: "cozy" }, { userId: 2, mediaId: 2, name: "short" },
            { userId: 1, mediaId: 3, name: "cozy" }, { userId: 1, mediaId: 3, name: "short" }, { userId: 1, mediaId: 3, name: "skip" },
            { userId: 2, mediaId: 1, name: "skip" }, { userId: 1, mediaId: 4, name: "short" },
            { userId: 1, name: "skip" },
        ]);
        const tags = [tagId(MediaType.MOVIES, "cozy"), tagId(MediaType.MOVIES, "short")];
        const excludeTags = [tagId(MediaType.MOVIES, "skip")];
        expect(getDynamicListResults(1, { ...spec, filters: { mediaFilters: { movies: { tagRules: [{ tags, tagsMatch: "all" }] } } } }).items.map(item => item.mediaId)).toEqual([1, 3]);
        expect(getDynamicListResults(1, { ...spec, filters: { mediaFilters: { movies: { tagRules: [{ tags, tagsMatch: "all", excludeTags }] } } } }).items.map(item => item.mediaId)).toEqual([1]);
        expect(getDynamicListResults(1, { ...spec, filters: { mediaFilters: { movies: { tagRules: [{ tags, tagsMatch: "any", excludeTags }] } } } }).items.map(item => item.mediaId)).toEqual([1, 2, 4]);
    });

    it("keeps tag IDs through renames and removes deleted references without changing other rules", () => {
        addEntry(MediaType.MOVIES, 1, { rating: 8 });
        addEntry(MediaType.MOVIES, 2, { rating: 9 });
        addEntry(MediaType.BOOKS, 3, { rating: 8 });
        seedMediaTags(dbContext.db, MediaType.MOVIES, [
            { userId: 1, mediaId: 1, name: "Favorites" },
            { userId: 1, name: "Favorites" },
            { userId: 1, mediaId: 2, name: "Avoid" },
        ]);
        seedMediaTags(dbContext.db, MediaType.BOOKS, { userId: 1, mediaId: 3, name: "Favorites" });
        const favoriteId = tagId(MediaType.MOVIES, "Favorites");
        const avoidId = tagId(MediaType.MOVIES, "Avoid");
        const savedSpec: DynamicListSpec = { ...spec, filters: { minRating: 8, mediaFilters: {
            movies: { tagRules: [{ tags: [favoriteId], tagsMatch: "all", excludeTags: [avoidId] }] },
        } } };
        const { id } = dynamicListsRepository.create(1, savedSpec);
        const tags = createMediaTagQueries(getServerMediaDefinition(MediaType.MOVIES));
        tags.editUserTag(1, { oldName: "Favorites", name: "Loved" }, TagAction.RENAME);
        expect(tagId(MediaType.MOVIES, "Loved")).toBe(favoriteId);
        expect(dynamicListsRepository.get(1, id)).toMatchObject({ spec: savedSpec, tagNames: { [favoriteId]: "Loved" } });
        expect(getDynamicListResults(1, savedSpec).items.map(item => item.mediaId)).toEqual([1, 3]);
        expect(tagId(MediaType.BOOKS, "Favorites")).not.toBe(favoriteId);

        tags.editUserTag(1, { name: "Loved" }, TagAction.DELETE_ALL);
        const afterIncludeDeletion = dynamicListsRepository.get(1, id).spec;
        expect(afterIncludeDeletion.filters.mediaFilters?.movies?.tagRules).toEqual([{ tags: [], tagsMatch: "all", excludeTags: [avoidId] }]);
        expect(getDynamicListResults(1, afterIncludeDeletion).items.map(item => item.mediaId)).toEqual([1, 3]);
        tags.editUserTag(1, { name: "Avoid" }, TagAction.DELETE_ALL);
        const afterDeletion = dynamicListsRepository.get(1, id).spec;
        expect(afterDeletion.filters.minRating).toBe(8);
        expect(afterDeletion.filters.mediaFilters?.movies?.tagRules).toEqual([]);
        expect(getDynamicListResults(1, afterDeletion).items.map(item => item.mediaId)).toEqual([1, 2, 3]);
        tags.editUserTag(1, { name: "Loved" }, TagAction.ADD, 2);
        expect(tagId(MediaType.MOVIES, "Loved")).not.toBe(favoriteId);
        expect(getDynamicListResults(1, dynamicListsRepository.get(1, id).spec).total).toBe(3);
    });

    it("cleans movie rules when the final tag assignment is removed", () => {
        const mediaType = MediaType.MOVIES;
        addEntry(mediaType, 1);
        seedMediaTags(dbContext.db, mediaType, { userId: 1, mediaId: 1, name: "Temporary" });
        const id = tagId(mediaType, "Temporary");
        const list = dynamicListsRepository.create(1, { ...spec, filters: {
            mediaFilters: { [mediaType]: { tagRules: [{ tags: [id] }] } },
        } });
        createMediaTagQueries(getServerMediaDefinition(mediaType)).editUserTag(1, { name: "Temporary" }, TagAction.DELETE_ONE, 1);
        expect(dynamicListsRepository.get(1, list.id).spec.filters.mediaFilters?.[mediaType]?.tagRules).toEqual([]);
        expect(dbContext.db.select().from(schema.mediaTags).where(eq(schema.mediaTags.id, id)).all()).toEqual([]);
    });

    it("cleans saved tag rules when a tracked movie is removed", () => {
        const mediaType = MediaType.MOVIES;
        addEntry(mediaType, 1);
        const tags = createMediaTagQueries(getServerMediaDefinition(mediaType));
        tags.editUserTag(1, { name: "Temporary" }, TagAction.ADD, 1);
        const id = tagId(mediaType, "Temporary");
        const list = dynamicListsRepository.create(1, { ...spec, filters: {
            mediaFilters: { [mediaType]: { tagRules: [{ excludeTags: [id] }] } },
        } });

        createMediaQueries(getServerMediaDefinition(mediaType)).removeMediaFromUserList(1, 1);

        expect(dynamicListsRepository.get(1, list.id).spec.filters.mediaFilters?.[mediaType]?.tagRules).toEqual([]);
        expect(dbContext.db.select().from(schema.mediaTags).where(eq(schema.mediaTags.id, id)).all()).toEqual([]);
    });

    it("keeps an explicitly created empty tag and its rules after removing its final media assignment", async () => {
        addEntry(MediaType.MOVIES, 1);
        const tags = createMediaTagQueries(getServerMediaDefinition(MediaType.MOVIES));
        tags.editUserTag(1, { name: "Keep" }, TagAction.ADD);
        tags.editUserTag(1, { name: "Keep" }, TagAction.ADD, 1);
        const id = tagId(MediaType.MOVIES, "Keep");
        const saved = dynamicListsRepository.create(1, { ...spec, filters: {
            mediaFilters: { movies: { tagRules: [{ tags: [id] }] } },
        } });

        tags.editUserTag(1, { name: "Keep" }, TagAction.DELETE_ONE, 1);

        expect(dynamicListsRepository.get(1, saved.id).spec.filters.mediaFilters?.movies?.tagRules).toEqual([{ tags: [id] }]);
        expect(tagId(MediaType.MOVIES, "Keep")).toBe(id);
        expect(await tags.getTagsView(1)).toEqual([{ tagName: "Keep", totalCount: 0 }]);
        expect(getDynamicListResults(1, dynamicListsRepository.get(1, saved.id).spec).total).toBe(0);
    });

    it("rolls back tag and tracking deletion if cleaning saved rules fails", () => {
        addEntry(MediaType.MOVIES, 1);
        const definition = getServerMediaDefinition(MediaType.MOVIES);
        const tags = createMediaTagQueries(definition);
        tags.editUserTag(1, { name: "Keep" }, TagAction.ADD, 1);
        const id = tagId(MediaType.MOVIES, "Keep");
        const savedSpec: DynamicListSpec = { ...spec, filters: {
            mediaFilters: { movies: { tagRules: [{ tags: [id] }] } },
        } };
        const saved = dynamicListsRepository.create(1, savedSpec);
        sqlite.exec("CREATE TRIGGER fail_tag_rule_cleanup BEFORE UPDATE ON smart_views BEGIN SELECT RAISE(ABORT, 'cleanup failed'); END");

        expect(() => tags.editUserTag(1, { name: "Keep" }, TagAction.DELETE_ALL)).toThrow("cleanup failed");
        expect(() => createMediaQueries(definition).removeMediaFromUserList(1, 1)).toThrow("cleanup failed");
        expect(tagId(MediaType.MOVIES, "Keep")).toBe(id);
        expect(dbContext.db.select().from(schema.moviesTags).all()).toHaveLength(1);
        expect(dbContext.db.select().from(schema.moviesList).all()).toHaveLength(1);
        expect(dynamicListsRepository.get(1, saved.id).spec).toEqual(savedSpec);
    });

it("rejects tag IDs owned by another user or a different media type", () => {
        seedMediaTags(dbContext.db, MediaType.MOVIES, [{ userId: 1, name: "Mine" }, { userId: 2, name: "Other" }]);
        for (const mediaFilters of [
            { movies: { tagRules: [{ tags: [tagId(MediaType.MOVIES, "Other", 2)] }] } },
            { books: { tagRules: [{ excludeTags: [tagId(MediaType.MOVIES, "Mine")] }] } },
            { movies: { tagRules: [{ tags: [999_999] }] } },
        ]) {
            expect(() => getDynamicListResults(1, { ...spec, filters: { mediaFilters } })).toThrow("Choose tags from your own tracking list");
            expect(() => dynamicListsRepository.create(1, { ...spec, filters: { mediaFilters } })).toThrow("Choose tags from your own tracking list");
        }
    });

});
