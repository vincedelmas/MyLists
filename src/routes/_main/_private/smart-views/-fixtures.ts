import {and, eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {MediaType, Status} from "@/lib/utils/enums";
import {movies, users} from "../../../../../scripts/e2e/data";
import {books, booksList, manga, mangaList, moviesGenre, moviesList, moviesTags, smartViews, userMediaSettings} from "@/lib/server/database/schema";
import {SMART_VIEW_PRESETS} from "@/lib/utils/smart-views/presets";
import {browseFilterGenres} from "../../_viewer/collections/-browse.data";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use smart list fixtures only with bun run test:e2e.");

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
        apiId: "smart-view-book",
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
    if (process.argv.includes("seed-shortcuts")) {
        db.insert(smartViews).values(Array.from({ length: 5 }, (_, index) => ({
            id: 501 + index,
            userId: users.owner.id,
            spec: { ...SMART_VIEW_PRESETS[0], title: `Profile list ${index + 1}` },
        }))).run();
        db.insert(smartViews).values([
            { id: 511, userId: users.stranger.id, profilePosition: 1, spec: { ...SMART_VIEW_PRESETS[0], title: "Public smart list" } },
            { id: 512, userId: users.restricted.id, profilePosition: 1, spec: { ...SMART_VIEW_PRESETS[0], title: "Restricted smart list" } },
            { id: 513, userId: users.stranger.id, spec: { ...SMART_VIEW_PRESETS[0], title: "Unpinned public smart list" } },
            { id: 514, userId: users.restricted.id, spec: { ...SMART_VIEW_PRESETS[0], title: "Unpinned restricted smart list" } },
        ]).run();
    }
    if (process.argv.includes("seed-tabs")) {
        db.insert(manga).values({
            id: 907, apiId: 907, name: "Completed manga outside smart lists", chapters: 10,
            imageCover: "default.jpg", lockStatus: true,
        }).run();
        db.insert(mangaList).values({
            userId: users.owner.id, mediaId: 907, status: Status.COMPLETED, currentChapter: 10,
            total: 10, addedAt: "2000-01-01 00:00:00",
        }).run();
        db.update(userMediaSettings).set({
            active: true, totalEntries: 1, statusCounts: { [Status.COMPLETED]: 1 } as Record<Status, number>,
        }).where(and(eq(userMediaSettings.userId, users.owner.id), eq(userMediaSettings.mediaType, MediaType.MANGA))).run();
        db.insert(smartViews).values([
            {
                id: 521, userId: users.owner.id,
                spec: { ...SMART_VIEW_PRESETS[1], mediaTypes: [MediaType.MOVIES], title: "Empty movie rules" },
            },
            {
                id: 522, userId: users.owner.id,
                spec: { ...SMART_VIEW_PRESETS[1], mediaTypes: [MediaType.MANGA], title: "Manga favorites" },
            },
        ]).run();
    }
});
