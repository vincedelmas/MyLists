import {and, eq} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {MediaType, PrivacyType, Status} from "@/lib/utils/enums";
import {publicCollection, users} from "../../../../../../scripts/e2e/data";
import {browseActor, browseDirector, browseFilterGenres, browseMovies, browseNote, communityNavigationCollections} from "./-browse.data";
import {collectionItems, collections, movies, moviesActors, moviesGenre, moviesList, moviesTags, userMediaSettings} from "@/lib/server/database/schema";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use browse fixtures only with bun run test:e2e.");

db.transaction(() => {
    db.insert(movies).values(browseMovies.map(movie => ({
        ...movie, apiId: movie.id, directorName: browseDirector, duration: 100, imageCover: "default.jpg", lockStatus: true,
    }))).run();
    db.insert(moviesActors).values(browseMovies.map(movie => ({ mediaId: movie.id, name: browseActor }))).run();
    db.insert(moviesGenre).values(browseMovies.map((movie, index) => ({ mediaId: movie.id, name: index < 25 ? "Drama" : "Adventure" }))).run();
    if (process.argv.includes("seed-filters")) {
        db.insert(moviesGenre).values(browseFilterGenres.map(name => ({ mediaId: browseMovies.at(-1)!.id, name }))).run();
    }
    db.update(collections).set({ ordered: true }).where(eq(collections.id, publicCollection.id)).run();
    db.insert(collectionItems).values(browseMovies.map((movie, index) => ({
        collectionId: publicCollection.id,
        mediaType: MediaType.MOVIES,
        mediaId: movie.id,
        orderIndex: index + 1,
        annotation: index === 29 ? browseNote : null,
    }))).run();
    if (process.argv.includes("seed-community")) {
        db.insert(collections).values(communityNavigationCollections.map((collection, index) => ({
            ...collection,
            ownerId: users.owner.id,
            privacy: PrivacyType.PUBLIC,
            ordered: true,
            likeCount: (communityNavigationCollections.length - index) * 5,
        }))).run();
        db.insert(collectionItems).values(communityNavigationCollections.map(collection => ({
            collectionId: collection.id,
            mediaType: MediaType.MOVIES,
            mediaId: browseMovies[0].id,
            orderIndex: 1,
        }))).run();
    }
    db.insert(moviesList).values(browseMovies.map((movie, index) => ({
        userId: users.owner.id,
        mediaId: movie.id,
        status: Status.COMPLETED,
        rating: index === 29 ? 4 : 5,
        favorite: index === 29,
        total: 1,
        addedAt: "2024-01-01T00:00:00.000Z",
        lastUpdated: "2024-02-01T00:00:00.000Z",
    }))).run();
    db.insert(moviesList).values(browseMovies.slice(-2).map((movie, index) => ({
        userId: users.stranger.id,
        mediaId: movie.id,
        status: Status.PLAN_TO_WATCH,
        rating: index === 1 ? 9 : 8,
        favorite: index === 1,
        addedAt: "2025-03-01T00:00:00.000Z",
        lastUpdated: "2025-04-01T00:00:00.000Z",
    }))).run();
    db.insert(moviesTags).values([
        { userId: users.owner.id, mediaId: browseMovies[0].id, name: "owner-only" },
        { userId: users.stranger.id, mediaId: browseMovies.at(-1)!.id, name: "weekend" },
    ]).run();
    for (const account of [users.owner, users.stranger]) {
        const owner = account.id === users.owner.id;
        db.update(userMediaSettings).set({
            totalEntries: owner ? 31 : 2,
            entriesRated: owner ? 30 : 2,
            sumEntriesRated: owner ? 149 : 17,
            entriesFavorites: 1,
            totalSpecific: owner ? 30 : 0,
            timeSpent: owner ? 3000 : 0,
            statusCounts: { [Status.PLAN_TO_WATCH]: owner ? 1 : 2, [Status.COMPLETED]: owner ? 30 : 0 } as Record<Status, number>,
        }).where(and(eq(userMediaSettings.userId, account.id), eq(userMediaSettings.mediaType, MediaType.MOVIES))).run();
    }
});
