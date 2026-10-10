import {and, eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";
import {movies, users} from "../../../../../../scripts/e2e/data";
import {books, booksList, manga, mangaList, movies as moviesTable, moviesActors, moviesGenre, moviesList, moviesTags, dynamicLists, userMediaSettings, user} from "@/lib/server/database/schema";
import {DYNAMIC_LIST_PRESETS} from "@/lib/utils/dynamic-lists/presets";
import {browseFilterGenres} from "../../../_viewer/lists/collections/-browse.data";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use dynamic list fixtures only with bun run test:e2e.");

db.transaction(() => {
    db.update(moviesList).set({ addedAt: "2000-01-01 00:00:00" }).where(eq(moviesList.mediaId, movies.private.id)).run();
    db.insert(moviesList).values({
        userId: users.owner.id,
        mediaId: movies.editable.id,
        status: Status.PLAN_TO_WATCH,
        addedAt: new Date().toISOString(),
    }).run();
    db.insert(books).values({
        id: 906,
        apiId: "dynamic-list-book",
        name: "A long-awaited book",
        imageCover: "default.jpg",
        pages: 200,
    }).run();
    db.insert(booksList).values({
        userId: users.owner.id,
        mediaId: 906,
        status: Status.PLAN_TO_READ,
        addedAt: "2000-01-02T00:00:00.000Z",
    }).run();
    db.update(userMediaSettings).set({ active: true }).where(eq(userMediaSettings.mediaType, MediaType.BOOKS)).run();
    if (process.argv.includes("seed-filters")) {
        db.insert(moviesGenre).values(browseFilterGenres.map(name => ({ mediaId: movies.private.id, name }))).run();
    }
    if (process.argv.includes("seed-search")) {
        db.insert(moviesGenre).values([
            { mediaId: movies.private.id, name: "Science Fiction" },
            { mediaId: movies.editable.id, name: "Documentary" },
        ]).run();
        db.insert(moviesTags).values([
            { userId: users.owner.id, mediaId: movies.private.id, name: "Weekend" },
            { userId: users.owner.id, mediaId: movies.editable.id, name: "Avoid" },
        ]).run();
    }
    if (process.argv.includes("seed-metadata")) {
        db.insert(moviesActors).values([
            { mediaId: movies.private.id, name: "Cate Blanchett" },
            { mediaId: movies.editable.id, name: "Michael Keaton" },
        ]).run();
        db.update(moviesTable).set({ directorName: "Greta Gerwig", originalLanguage: "en" }).where(eq(moviesTable.id, movies.private.id)).run();
        db.update(moviesTable).set({ directorName: "Christopher Nolan", originalLanguage: "fr" }).where(eq(moviesTable.id, movies.editable.id)).run();
    }
    if (process.argv.includes("seed-public-profile")) {
        db.update(user).set({ privacy: PrivacyType.PUBLIC }).where(eq(user.id, users.owner.id)).run();
    }
    if (process.argv.includes("seed-shortcuts")) {
        db.insert(dynamicLists).values(Array.from({ length: 5 }, (_, index) => ({
            id: 501 + index,
            userId: users.owner.id,
            spec: { ...DYNAMIC_LIST_PRESETS[0], title: `Profile list ${index + 1}` },
        }))).run();
        db.insert(dynamicLists).values([
            { id: 511, userId: users.stranger.id, profilePosition: 1, spec: { ...DYNAMIC_LIST_PRESETS[0], title: "Public dynamic list" } },
            { id: 512, userId: users.restricted.id, profilePosition: 1, spec: { ...DYNAMIC_LIST_PRESETS[0], title: "Restricted dynamic list" } },
            { id: 513, userId: users.stranger.id, spec: { ...DYNAMIC_LIST_PRESETS[0], title: "Unpinned public dynamic list" } },
            { id: 514, userId: users.restricted.id, spec: { ...DYNAMIC_LIST_PRESETS[0], title: "Unpinned restricted dynamic list" } },
        ]).run();
    }
    if (process.argv.includes("seed-tabs")) {
        db.insert(manga).values({
            id: 907, apiId: 907, name: "Completed manga outside dynamic lists", chapters: 10,
            imageCover: "default.jpg", lockStatus: true,
        }).run();
        db.insert(mangaList).values({
            userId: users.owner.id, mediaId: 907, status: Status.COMPLETED, currentChapter: 10,
            total: 10, addedAt: "2000-01-01 00:00:00",
        }).run();
        db.update(userMediaSettings).set({
            active: true, totalEntries: 1, statusCounts: { [Status.COMPLETED]: 1 } as Record<Status, number>,
        }).where(and(eq(userMediaSettings.userId, users.owner.id), eq(userMediaSettings.mediaType, MediaType.MANGA))).run();
        db.insert(dynamicLists).values([
            {
                id: 521, userId: users.owner.id,
                spec: { ...DYNAMIC_LIST_PRESETS[1], mediaTypes: [MediaType.MOVIES], title: "Empty movie rules" },
            },
            {
                id: 522, userId: users.owner.id,
                spec: { ...DYNAMIC_LIST_PRESETS[1], mediaTypes: [MediaType.MANGA], title: "Manga favorites" },
            },
        ]).run();
    }
});
