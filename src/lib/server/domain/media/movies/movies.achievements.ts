import {AchievementDifficulty, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {movies, moviesActors, moviesList} from "@/lib/server/database/schema";
import {count, countDistinct, eq, gte, isNotNull, lte, max} from "drizzle-orm";
import {createAchievementQueries} from "@/lib/server/domain/media/base/achievements-queries";
import {MovieServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {AchievementCalculation, defineAchievementCatalog} from "@/lib/server/domain/achievements/achievement-catalog";


export const createMoviesAchievementCatalog = (definition: MovieServerDefinition) => {
    const { identity, repository } = definition;
    const { listTable } = repository.tables;
    const queries = createAchievementQueries(repository);

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
        mediaType: identity.mediaType,
        entries: {
            completed_movies: {
                name: "Cinephile Marathoner",
                description: "Awarded for completing movies, because real life has too few explosions and car chases.",
                tiers: [
                    { criteria: { count: 100 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 400 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 800 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 1500 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countList(eq(listTable.status, Status.COMPLETED)),
            },
            rated_movies: {
                name: "Certified Movie Critic",
                description: "Awarded for rating movies, because slapping stars on films is harder than it looks, right?",
                tiers: [
                    { criteria: { count: 50 }, difficulty: AchievementDifficulty.BRONZE },
                    { criteria: { count: 100 }, difficulty: AchievementDifficulty.SILVER },
                    { criteria: { count: 150 }, difficulty: AchievementDifficulty.GOLD },
                    { criteria: { count: 250 }, difficulty: AchievementDifficulty.PLATINUM },
                ],
                calculate: queries.countList(isNotNull(listTable.rating)),
            },
            comment_movies: {
                name: "Couch Commentator",
                description: "Awarded for commenting movies, because every film deserves your unsolicited director’s cut.",
                tiers: [
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 60 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 100 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 150 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: queries.countList(isNotNull(listTable.comment)),
            },
            director_movies: {
                name: "Director Devotee",
                description: "Awarded for completing movies from the same director, because you’re practically their personal biographer at this point.",
                tiers: [
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 12 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 15 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: director,
            },
            actor_movies: {
                name: "Typecast Connoisseur",
                description:
                    "Awarded for completing movies featuring the same actor, because you enjoy watching them save the world—again.",
                tiers: [
                    { criteria: { count: 8 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 12 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 15 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: actor,
            },
            origin_lang_movies: {
                name: "World Tour",
                description:
                    "Awarded for completing movies from different languages, proving that subtitles are no match for your wanderlust.",
                tiers: [
                    { criteria: { count: 3 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 7 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: language,
            },
            war_genre_movies: {
                name: "War Room Veteran",
                description:
                    "Awarded for completing War movies, because nothing says relaxation like intense geopolitical conflicts.",
                value: "War",
                tiers: [
                    { criteria: { count: 5 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 30 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: queries.countCompletedGenre,
            },
            family_genre_movies: {
                name: "Family at Heart",
                description:
                    "Awarded for completing Family movies, because secretly, you just miss the talking animals.",
                value: "Family",
                tiers: [
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 35 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 50 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: queries.countCompletedGenre,
            },
            sci_genre_movies: {
                name: "Sci-Fi Navigator",
                description:
                    "Awarded for completing Science Fiction movies, because you like your plot twists served with a side of quantum stuff.",
                value: "Science Fiction",
                tiers: [
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 35 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 50 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: queries.countCompletedGenre,
            },
            animation_movies: {
                name: "Animation Enthusiast",
                description:
                    "Awarded for completing Animation movies, because you know that cartoons aren’t just for kids.",
                value: "Animation",
                tiers: [
                    { criteria: { count: 10 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 20 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 35 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 50 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: queries.countCompletedGenre,
            },
            long_movies: {
                name: "Epic Endurance",
                description:
                    "Awarded for completing movies longer than 2h30, because you’ve trained for the cinematic marathon.",
                value: 151,
                tiers: [
                    { criteria: { count: 12 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 25 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 35 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 45 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: duration,
            },
            short_movies: {
                name: "Short Attention Span",
                description:
                    "Awarded for completing movies shorter than 1h30, because ain’t nobody got time for three-hour epics.",
                value: 89,
                tiers: [
                    { criteria: { count: 12 }, difficulty: AchievementDifficulty.BRONZE, },
                    { criteria: { count: 25 }, difficulty: AchievementDifficulty.SILVER, },
                    { criteria: { count: 35 }, difficulty: AchievementDifficulty.GOLD, },
                    { criteria: { count: 45 }, difficulty: AchievementDifficulty.PLATINUM, },
                ],
                calculate: duration,
            }
        },
    });
};
