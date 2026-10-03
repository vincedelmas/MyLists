import {and, eq, ne} from "drizzle-orm";
import {db} from "@/lib/server/database/db";
import {movies, users} from "../../../../../scripts/e2e/data";
import {moviesList, series, seriesEpisodesPerSeason, userMediaSettings, books, booksAuthors, booksGenre, manga, games, anime, animeEpisodesPerSeason, followers, user} from "@/lib/server/database/schema";


if (!process.env.MYLISTS_E2E_DIR) throw new Error("Use bun run test:e2e.");

if (process.argv[2] === "seed-series") {
    db.insert(series).values({ id: 901, apiId: 901, name: "MCP test series", duration: 30, imageCover: "default.jpg", totalSeasons: 2, totalEpisodes: 8 }).run();
    db.insert(seriesEpisodesPerSeason).values([{ mediaId: 901, season: 1, episodes: 4 }, { mediaId: 901, season: 2, episodes: 4 }]).run();
}
else if (process.argv[2] === "movie-state") {
    const otherUserEntries = db.select().from(moviesList).where(and(eq(moviesList.mediaId, movies.editable.id), ne(moviesList.userId, users.owner.id))).all().length;
    const settings = db.select().from(userMediaSettings).where(and(eq(userMediaSettings.userId, users.owner.id), eq(userMediaSettings.mediaType, "movies"))).get()!;
    console.log(JSON.stringify({ otherUserEntries, totalEntries: settings.totalEntries, timeSpent: settings.timeSpent }));
}

else if (process.argv[2] === "seed-media") {
    db.update(userMediaSettings).set({ active: true }).where(eq(userMediaSettings.userId, users.owner.id)).run();
    db.insert(books).values({ id: 902, apiId: "book-string-id", name: "MCP test book", pages: 200, imageCover: "default.jpg", language: "en" }).run();
    db.insert(booksAuthors).values({ mediaId: 902, name: "MCP Author" }).run();
    db.insert(booksGenre).values({ mediaId: 902, name: "Fantasy" }).run();
    db.insert(manga).values({ id: 903, apiId: 903, name: "MCP test manga", chapters: 50, imageCover: "default.jpg" }).run();
    db.insert(games).values({ id: 904, apiId: 904, name: "MCP test game", imageCover: "default.jpg" }).run();
    db.insert(anime).values({ id: 905, apiId: 905, name: "MCP test anime", duration: 24, imageCover: "default.jpg", totalSeasons: 1, totalEpisodes: 4 }).run();
    db.insert(animeEpisodesPerSeason).values({ mediaId: 905, season: 1, episodes: 4 }).run();
}

else if (process.argv[2] === "seed-query") {
    db.update(user).set({ privacy: "private" }).where(eq(user.id, users.restricted.id)).run();
    db.insert(followers).values([
        { followerId: users.owner.id, followedId: users.restricted.id, status: "accepted" },
        { followerId: users.owner.id, followedId: users.stranger.id, status: "requested" },
    ]).run();
    db.update(moviesList).set({ rating: 9 }).where(eq(moviesList.userId, users.owner.id)).run();
    db.update(moviesList).set({ rating: 10 }).where(eq(moviesList.userId, users.restricted.id)).run();
    db.insert(moviesList).values([
        { userId: users.owner.id, mediaId: movies.editable.id, status: "Completed", rating: 6 },
        { userId: users.stranger.id, mediaId: movies.imported.id, status: "Completed", rating: 8 },
        { userId: users.follower.id, mediaId: movies.editable.id, status: "Completed", rating: 7 },
    ]).run();
}
