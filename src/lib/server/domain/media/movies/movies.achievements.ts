import {AchievementCategory, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {movies, moviesActors, moviesList} from "@/lib/server/database/schema";
import {and, count, countDistinct, eq, gt, gte, isNotNull, lt, lte, ne, sql} from "drizzle-orm";
import {MovieServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {createAchievementQueries, pickTopPerUser} from "@/lib/server/domain/media/base/achievements-queries";
import {AchievementCalculation, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


export const createMoviesAchievementCatalog = (definition: MovieServerDefinition) => {
    const { identity, repository } = definition;
    const { listTable } = repository.tables;
    const queries = createAchievementQueries(repository);

    const completedMovies = queries.countList(eq(listTable.status, Status.COMPLETED));

    const longMovies: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: moviesList.userId, value: count(moviesList.mediaId) })
            .from(moviesList)
            .innerJoin(movies, eq(moviesList.mediaId, movies.id))
            .where(and(eq(moviesList.status, Status.COMPLETED), gte(movies.duration, 150), queries.userFilter(userId)))
            .groupBy(moviesList.userId)
            .all();
    };

    const shortMovies: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: moviesList.userId, value: count(moviesList.mediaId) })
            .from(moviesList)
            .innerJoin(movies, eq(moviesList.mediaId, movies.id))
            .where(and(
                eq(moviesList.status, Status.COMPLETED),
                gt(movies.duration, 0),
                lte(movies.duration, 89),
                queries.userFilter(userId),
            ))
            .groupBy(moviesList.userId)
            .all();
    };

    const classicMovies: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({ userId: moviesList.userId, value: count(moviesList.mediaId) })
            .from(moviesList)
            .innerJoin(movies, eq(moviesList.mediaId, movies.id))
            .where(and(
                eq(moviesList.status, Status.COMPLETED),
                isNotNull(movies.releaseDate),
                ne(movies.releaseDate, ""),
                lt(movies.releaseDate, "1975-01-01"),
                queries.userFilter(userId),
            ))
            .groupBy(moviesList.userId)
            .all();
    };

    const director: AchievementCalculation = (userId) => {
        const rows = getDbClient()
            .select({
                userId: moviesList.userId,
                label: movies.directorName,
                count: count(moviesList.mediaId),
            })
            .from(moviesList)
            .innerJoin(movies, eq(moviesList.mediaId, movies.id))
            .where(and(
                eq(moviesList.status, Status.COMPLETED),
                isNotNull(movies.directorName),
                ne(movies.directorName, ""),
                queries.userFilter(userId),
            ))
            .groupBy(moviesList.userId, movies.directorName)
            .all();

        return pickTopPerUser(rows);
    };

    const actor: AchievementCalculation = (userId) => {
        const rows = getDbClient()
            .select({
                userId: moviesList.userId,
                label: moviesActors.name,
                count: count(moviesList.mediaId),
            })
            .from(moviesList)
            .innerJoin(moviesActors, eq(moviesList.mediaId, moviesActors.mediaId))
            .where(and(eq(moviesList.status, Status.COMPLETED), queries.userFilter(userId)))
            .groupBy(moviesList.userId, moviesActors.name)
            .all();

        return pickTopPerUser(rows);
    };

    const language: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: moviesList.userId,
                value: countDistinct(movies.originalLanguage),
            })
            .from(moviesList)
            .innerJoin(movies, eq(moviesList.mediaId, movies.id))
            .where(and(
                eq(moviesList.status, Status.COMPLETED),
                isNotNull(movies.originalLanguage),
                ne(movies.originalLanguage, ""),
                queries.userFilter(userId),
            ))
            .groupBy(moviesList.userId)
            .all();
    };

    const rewatches: AchievementCalculation = (userId) => {
        return getDbClient()
            .select({
                userId: moviesList.userId,
                value: sql<number>`COALESCE(SUM(${moviesList.redo}), 0)`,
            })
            .from(moviesList)
            .where(queries.userFilter(userId))
            .groupBy(moviesList.userId)
            .all();
    };

    return defineAchievementCatalog({
        category: AchievementCategory.MOVIES,
        mediaType: identity.mediaType,
        entries: {
            movies_first: {
                name: "First Feature",
                description: "Complete your very first movie. Lights down, phone off.",
                icon: "film-projector",
                shape: "circle",
                pattern: "rings",
                target: 1,
                calculate: completedMovies,
            },
            movies_50: {
                name: "Regular Ticket Holder",
                description: "Complete 50 movies. Your local cinema misses your popcorn budget.",
                icon: "ticket",
                shape: "circle",
                pattern: "rings",
                target: 50,
                calculate: completedMovies,
            },
            movies_250: {
                name: "Cinephile Marathoner",
                description: "Complete 250 movies, because real life has too few explosions and car chases.",
                icon: "popcorn",
                shape: "octagon",
                pattern: "rays",
                target: 250,
                calculate: completedMovies,
            },
            movies_750: {
                name: "Living Film Archive",
                description: "Complete 750 movies. At this point, Letterboxd asks you for advice.",
                icon: "crown",
                shape: "shield",
                pattern: "rays",
                target: 750,
                calculate: completedMovies,
            },
            movies_rated_50: {
                name: "Certified Movie Critic",
                description: "Rate 50 movies, because slapping stars on films is harder than it looks.",
                icon: "stars",
                shape: "circle",
                pattern: "dots",
                target: 50,
                calculate: queries.countList(isNotNull(listTable.rating)),
            },
            movies_commented_25: {
                name: "Couch Commentator",
                description: "Comment on 25 movies, because every film deserves your unsolicited director's cut.",
                icon: "chat",
                shape: "circle",
                pattern: "dots",
                target: 25,
                calculate: queries.countNonEmptyComment(),
            },
            movies_director_8: {
                name: "Director Devotee",
                description: "Complete 8 movies from the same director. You're practically their biographer.",
                icon: "clapperboard",
                shape: "hex",
                pattern: "rays",
                target: 8,
                calculate: director,
            },
            movies_actor_12: {
                name: "Typecast Connoisseur",
                description: "Complete 12 movies featuring the same actor, watching them save the world all over again.",
                icon: "masks",
                shape: "hex",
                pattern: "dots",
                target: 12,
                calculate: actor,
            },
            movies_languages_6: {
                name: "World Tour",
                description: "Complete movies in 6 different original languages. Subtitles are no match for you.",
                icon: "globe",
                shape: "hex",
                pattern: "rings",
                target: 6,
                calculate: language,
            },
            movies_long_12: {
                name: "Epic Endurance",
                description: "Complete 12 movies of 2h30 or longer. You've trained for the cinematic marathon.",
                icon: "hourglass",
                shape: "octagon",
                pattern: "rings",
                target: 12,
                calculate: longMovies,
            },
            movies_short_15: {
                name: "Short Attention Span",
                description: "Complete 15 movies under 1h30, because nobody always has time for three-hour epics.",
                icon: "stopwatch",
                shape: "circle",
                pattern: "rings",
                target: 15,
                calculate: shortMovies,
            },
            movies_genres_10: {
                name: "Genre Hopper",
                description: "Complete movies across 10 different genres. No comfort zone can hold you.",
                icon: "palette",
                shape: "hex",
                pattern: "dots",
                target: 10,
                calculate: queries.countDistinctGenres(),
            },
            movies_rewatch_5: {
                name: "Again, From the Top",
                description: "Log 5 movie rewatches. Some films only get better the second time around.",
                icon: "cycle",
                shape: "circle",
                pattern: "rings",
                target: 5,
                calculate: rewatches,
            },
            movies_classic_10: {
                name: "Silver Screen Classic",
                description: "Complete 10 movies released before 1975. Respecting the golden era.",
                icon: "film-strip",
                shape: "octagon",
                pattern: "rays",
                target: 10,
                calculate: classicMovies,
            },
        },
    });
};
