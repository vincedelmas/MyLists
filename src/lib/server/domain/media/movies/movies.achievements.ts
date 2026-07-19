import {Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {movies, moviesActors, moviesList} from "@/lib/server/database/schema";
import {count, countDistinct, eq, gte, isNotNull, lte, max} from "drizzle-orm";
import {MoviesAchCodeName} from "@/lib/server/domain/media/movies/movies.types";
import {MovieSchemaConfig} from "@/lib/server/domain/media/movies/movies.config";
import {moviesAchievements} from "@/lib/server/domain/media/movies/achievements.seed";
import {AchievementHandler, createMediaAchievements} from "@/lib/server/domain/media/base/base.achievements";


export const createMoviesAchievements = (config: MovieSchemaConfig) => {
    return createMediaAchievements({
        config,
        definitions: moviesAchievements,
        createHandlers: ({ count: countAchievement, specificGenre, applyWhereConditionsAndGrouping }) => {
            const { listTable } = config;

            const duration: AchievementHandler = (achievement, userId) => {
                const value = parseInt(achievement.value!, 10);
                const isLong = achievement.codeName.includes("long");
                const condition = isLong ? gte(movies.duration, value) : lte(movies.duration, value);

                const baseCte = getDbClient()
                    .select({
                        userId: moviesList.userId,
                        value: count(moviesList.mediaId).as("value"),
                    })
                    .from(moviesList)
                    .innerJoin(movies, eq(moviesList.mediaId, movies.id));

                return applyWhereConditionsAndGrouping(
                    baseCte,
                    [eq(moviesList.status, Status.COMPLETED), condition],
                    userId,
                );
            };

            const director: AchievementHandler = (_achievement, userId) => {
                const subQuery = getDbClient()
                    .select({
                        userId: moviesList.userId,
                        count: count(moviesList.mediaId).as("count"),
                    })
                    .from(moviesList)
                    .innerJoin(movies, eq(moviesList.mediaId, movies.id))
                    .where(eq(moviesList.status, Status.COMPLETED))
                    .groupBy(userId ? eq(moviesList.userId, userId) : moviesList.userId, movies.directorName)
                    .as("sub");

                return getDbClient()
                    .select({
                        userId: subQuery.userId,
                        value: max(subQuery.count).as("value"),
                    })
                    .from(subQuery)
                    .groupBy(subQuery.userId)
                    .as("calculation");
            };

            const actor: AchievementHandler = (_achievement, userId) => {
                const subQuery = getDbClient()
                    .select({
                        userId: moviesList.userId,
                        count: count(moviesList.mediaId).as("count"),
                    })
                    .from(moviesList)
                    .innerJoin(moviesActors, eq(moviesList.mediaId, moviesActors.mediaId))
                    .where(eq(moviesList.status, Status.COMPLETED))
                    .groupBy(userId ? eq(moviesList.userId, userId) : moviesList.userId, moviesActors.name)
                    .as("sub");

                return getDbClient()
                    .select({
                        userId: subQuery.userId,
                        value: max(subQuery.count).as("value"),
                    })
                    .from(subQuery)
                    .groupBy(subQuery.userId)
                    .as("calculation");
            };

            const language: AchievementHandler = (_achievement, userId) => {
                const baseCte = getDbClient()
                    .select({
                        userId: moviesList.userId,
                        value: countDistinct(movies.originalLanguage).as("value"),
                    })
                    .from(moviesList)
                    .innerJoin(movies, eq(moviesList.mediaId, movies.id));

                return applyWhereConditionsAndGrouping(
                    baseCte,
                    [eq(moviesList.status, Status.COMPLETED)],
                    userId,
                );
            };


            return {
                actor_movies: actor,
                long_movies: duration,
                short_movies: duration,
                director_movies: director,
                origin_lang_movies: language,
                war_genre_movies: specificGenre,
                sci_genre_movies: specificGenre,
                animation_movies: specificGenre,
                family_genre_movies: specificGenre,
                rated_movies: countAchievement(isNotNull(listTable.rating)),
                comment_movies: countAchievement(isNotNull(listTable.comment)),
                completed_movies: countAchievement(eq(listTable.status, Status.COMPLETED)),
            } satisfies Record<MoviesAchCodeName, AchievementHandler>;
        },
    });
}
