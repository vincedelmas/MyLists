import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {movies, moviesActors, moviesList} from "@/lib/server/database/schema";
import {count, countDistinct, eq, gte, isNotNull, lte, max} from "drizzle-orm";
import {MovieSchemaConfig} from "@/lib/server/domain/media/movies/movies.config";
import {moviesAchievements} from "@/lib/server/domain/media/movies/achievements.seed";
import {AchievementCalculation, AchievementCalculations, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";
import {createAchievementQueries} from "@/lib/server/domain/media/base/base.achievements-queries";


export const createMoviesAchievementCatalog = (config: MovieSchemaConfig) => {
    const { listTable } = config;
    const queries = createAchievementQueries(config);

    const duration: AchievementCalculation = (achievement) => {
        const value = Number(achievement.value);
        const isLong = achievement.codeName.includes("long");
        const condition = isLong ? gte(movies.duration, value) : lte(movies.duration, value);

        const query = getDbClient()
            .select({
                userId: moviesList.userId,
                value: count(moviesList.mediaId).as("value"),
            })
            .from(moviesList)
            .innerJoin(movies, eq(moviesList.mediaId, movies.id));

        return queries.applyConditionsAndGroup(query, [eq(moviesList.status, Status.COMPLETED), condition]);
    };

    const director: AchievementCalculation = () => {
        const directorCounts = getDbClient()
            .select({
                userId: moviesList.userId,
                count: count(moviesList.mediaId).as("count"),
            })
            .from(moviesList)
            .innerJoin(movies, eq(moviesList.mediaId, movies.id))
            .where(eq(moviesList.status, Status.COMPLETED))
            .groupBy(moviesList.userId, movies.directorName)
            .as("director_counts");

        return getDbClient()
            .select({
                userId: directorCounts.userId,
                value: max(directorCounts.count).as("value"),
            })
            .from(directorCounts)
            .groupBy(directorCounts.userId)
            .as("calculation");
    };

    const actor: AchievementCalculation = () => {
        const actorCounts = getDbClient()
            .select({
                userId: moviesList.userId,
                count: count(moviesList.mediaId).as("count"),
            })
            .from(moviesList)
            .innerJoin(moviesActors, eq(moviesList.mediaId, moviesActors.mediaId))
            .where(eq(moviesList.status, Status.COMPLETED))
            .groupBy(moviesList.userId, moviesActors.name)
            .as("actor_counts");

        return getDbClient()
            .select({
                userId: actorCounts.userId,
                value: max(actorCounts.count).as("value"),
            })
            .from(actorCounts)
            .groupBy(actorCounts.userId)
            .as("calculation");
    };

    const language: AchievementCalculation = () => {
        const query = getDbClient()
            .select({
                userId: moviesList.userId,
                value: countDistinct(movies.originalLanguage).as("value"),
            })
            .from(moviesList)
            .innerJoin(movies, eq(moviesList.mediaId, movies.id));

        return queries.applyConditionsAndGroup(query, [eq(moviesList.status, Status.COMPLETED)]);
    };

    return defineAchievementCatalog({
        mediaType: config.mediaType,
        definitions: moviesAchievements,
        calculations: {
            actor_movies: actor,
            long_movies: duration,
            short_movies: duration,
            director_movies: director,
            origin_lang_movies: language,
            war_genre_movies: queries.countCompletedGenre,
            sci_genre_movies: queries.countCompletedGenre,
            animation_movies: queries.countCompletedGenre,
            family_genre_movies: queries.countCompletedGenre,
            rated_movies: queries.countList(isNotNull(listTable.rating)),
            comment_movies: queries.countList(isNotNull(listTable.comment)),
            completed_movies: queries.countList(eq(listTable.status, Status.COMPLETED)),
        } satisfies AchievementCalculations<typeof moviesAchievements>,
    });
};
