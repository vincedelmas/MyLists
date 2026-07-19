import {Status} from "@/lib/utils/enums";
import {Achievement} from "@/lib/types/achievements.types";
import {getDbClient} from "@/lib/server/database/async-storage";
import {movies, moviesActors, moviesList} from "@/lib/server/database/schema";
import {count, countDistinct, eq, gte, isNotNull, lte, max} from "drizzle-orm";
import {MoviesAchCodeName} from "@/lib/server/domain/media/movies/movies.types";
import {MovieSchemaConfig} from "@/lib/server/domain/media/movies/movies.config";
import {AchievementHandler, BaseMediaAchievements} from "@/lib/server/domain/media/base/base.achievements";


export class MoviesAchievements extends BaseMediaAchievements<MovieSchemaConfig, MoviesAchCodeName> {
    protected readonly handlers: Record<MoviesAchCodeName, AchievementHandler>;

    constructor(config: MovieSchemaConfig) {
        super(config);
        const { listTable } = config;

        this.handlers = {
            actor_movies: this.actor.bind(this),
            long_movies: this.duration.bind(this),
            short_movies: this.duration.bind(this),
            director_movies: this.director.bind(this),
            origin_lang_movies: this.language.bind(this),
            war_genre_movies: this.specificGenre.bind(this),
            sci_genre_movies: this.specificGenre.bind(this),
            animation_movies: this.specificGenre.bind(this),
            family_genre_movies: this.specificGenre.bind(this),
            rated_movies: this.count.bind(this, isNotNull(listTable.rating)),
            comment_movies: this.count.bind(this, isNotNull(listTable.comment)),
            completed_movies: this.count.bind(this, eq(listTable.status, Status.COMPLETED)),
        };
    }

    private duration(achievement: Achievement, userId?: number) {
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

        return this.applyWhereConditionsAndGrouping(baseCte, [eq(moviesList.status, Status.COMPLETED), condition], userId);
    }

    private director(_achievement: Achievement, userId?: number) {
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
    }

    private actor(_achievement: Achievement, userId?: number) {
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
    }

    private language(_achievement: Achievement, userId?: number) {
        const baseCte = getDbClient()
            .select({
                userId: moviesList.userId,
                value: countDistinct(movies.originalLanguage).as("value"),
            })
            .from(moviesList)
            .innerJoin(movies, eq(moviesList.mediaId, movies.id));

        return this.applyWhereConditionsAndGrouping(baseCte, [eq(moviesList.status, Status.COMPLETED)], userId);
    }
}
