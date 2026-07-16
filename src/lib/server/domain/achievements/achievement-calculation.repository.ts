import {
    and,
    count,
    countDistinct,
    eq,
    gte,
    inArray,
    isNotNull,
    like,
    lte,
    max,
    ne,
    notInArray,
    sql,
    sum,
} from "drizzle-orm";
import {Achievement} from "@/lib/types/achievements.types";
import {GamesPlatformsEnum, MediaType, Status} from "@/lib/utils/enums";
import {getDbClient} from "@/lib/server/database/async-storage";
import {
    bookAuthor,
    bookDetails,
    catalogGenre,
    catalogItem,
    catalogItemGenre,
    gameCompany,
    gameDetails,
    gameProgress,
    libraryEntry,
    mangaAuthor,
    mangaDetails,
    mangaProgress,
    movieActor,
    movieDetails,
    tvActor,
    tvDetails,
    tvNetwork,
} from "@/lib/server/database/schema";


const completedCodes = new Set([
    "completed_series", "completed_anime", "completed_movies", "completed_games", "completed_books", "completed_manga",
]);
const ratedCodes = new Set([
    "rated_series", "rated_anime", "rated_movies", "rated_games", "rated_books", "rated_manga",
]);
const commentCodes = new Set([
    "comment_anime", "comment_movies", "comment_games", "comment_books", "comment_manga",
]);
const genreCodes = new Set([
    "comedy_series", "drama_series", "shonen_anime", "seinen_anime",
    "war_genre_movies", "family_genre_movies", "sci_genre_movies", "animation_movies",
    "hack_slash_games", "classic_books", "young_adult_books", "crime_books", "fantasy_books",
    "hentai_manga", "shounen_manga", "seinen_manga",
]);


export class AchievementCalculationRepository {
    getAchievementCte(achievement: Achievement, userId?: number) {
        const kind = achievement.mediaType;
        if (completedCodes.has(achievement.codeName)) return this.countEntries(kind, eq(libraryEntry.status, Status.COMPLETED), userId);
        if (ratedCodes.has(achievement.codeName)) return this.countEntries(kind, isNotNull(libraryEntry.rating), userId);
        if (commentCodes.has(achievement.codeName)) return this.countEntries(kind, isNotNull(libraryEntry.comment), userId);
        if (genreCodes.has(achievement.codeName)) return this.countCompletedGenre(kind, String(achievement.value), userId);

        switch (achievement.codeName) {
            case "short_series":
            case "long_series":
            case "short_anime":
            case "long_anime":
                return this.countTvDuration(achievement, userId);
            case "network_series":
            case "network_anime":
                return this.countTvNetworks(kind, userId);
            case "actor_anime":
                return this.maxTvActor(kind, userId);
            case "short_movies":
            case "long_movies":
                return this.countMovieDuration(achievement, userId);
            case "director_movies":
                return this.maxMovieDirector(userId);
            case "actor_movies":
                return this.maxMovieActor(userId);
            case "origin_lang_movies":
                return this.countMovieLanguages(userId);
            case "multiplayer_games":
                return this.countGameMode(String(achievement.value), userId);
            case "log_hours_games":
                return this.sumGameHours(userId);
            case "platform_games":
                return this.countGamePlatforms(userId);
            case "pc_games":
                return this.countSpecificGamePlatform(achievement.value as GamesPlatformsEnum, userId);
            case "short_games":
            case "long_games":
                return this.countGamePlaytime(achievement, userId);
            case "developer_games":
            case "publisher_games":
                return this.maxGameCompany(achievement.value === "developer", userId);
            case "first_person_games":
                return this.countGamePerspective(String(achievement.value), userId);
            case "short_books":
            case "long_books":
                return this.countBookDuration(achievement, userId);
            case "author_books":
                return this.maxBookAuthor(userId);
            case "lang_books":
                return this.countBookLanguages(userId);
            case "short_manga":
            case "long_manga":
                return this.countMangaDuration(achievement, userId);
            case "author_manga":
                return this.maxMangaAuthor(userId);
            case "publisher_manga":
                return this.maxMangaPublisher(userId);
            case "chapter_manga":
                return this.sumMangaChapters(userId);
            default:
                throw new Error(`Achievement calculation is not implemented for ${achievement.codeName}.`);
        }
    }

    private countEntries(kind: MediaType, condition: ReturnType<typeof eq> | ReturnType<typeof isNotNull>, userId?: number) {
        return getDbClient().select({
            userId: libraryEntry.userId,
            value: count(libraryEntry.catalogItemId).as("value"),
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .where(and(eq(catalogItem.kind, kind), condition, this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countCompletedGenre(kind: MediaType, genre: string, userId?: number) {
        return getDbClient().select({
            userId: libraryEntry.userId,
            value: count(libraryEntry.catalogItemId).as("value"),
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(catalogItemGenre, eq(catalogItemGenre.catalogItemId, catalogItem.id))
            .innerJoin(catalogGenre, eq(catalogGenre.id, catalogItemGenre.genreId))
            .where(and(
                eq(catalogItem.kind, kind),
                eq(libraryEntry.status, Status.COMPLETED),
                eq(catalogGenre.name, genre),
                this.forUser(userId),
            )).groupBy(libraryEntry.userId).as("calculation");
    }

    private countTvDuration(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);
        const durationCondition = achievement.codeName.includes("long")
            ? gte(tvDetails.totalEpisodes, threshold)
            : lte(tvDetails.totalEpisodes, threshold);
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvDetails, eq(tvDetails.catalogItemId, catalogItem.id))
            .where(and(
                eq(catalogItem.kind, achievement.mediaType),
                eq(libraryEntry.status, Status.COMPLETED),
                durationCondition,
                this.forUser(userId),
            )).groupBy(libraryEntry.userId).as("calculation");
    }

    private countTvNetworks(kind: MediaType, userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: countDistinct(tvNetwork.name).as("value") })
            .from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvNetwork, eq(tvNetwork.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, kind), ne(libraryEntry.status, Status.PLAN_TO_WATCH), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private maxTvActor(kind: MediaType, userId?: number) {
        const grouped = getDbClient().select({
            userId: libraryEntry.userId,
            count: count(libraryEntry.catalogItemId).as("count"),
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(tvActor, eq(tvActor.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, kind), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, tvActor.name).as("grouped_tv_actor");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private countMovieDuration(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);
        const durationCondition = achievement.codeName.includes("long")
            ? gte(movieDetails.durationMinutes, threshold)
            : lte(movieDetails.durationMinutes, threshold);
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.MOVIES), eq(libraryEntry.status, Status.COMPLETED), durationCondition, this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private maxMovieDirector(userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.MOVIES), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, movieDetails.directorName).as("grouped_movie_director");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private maxMovieActor(userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieActor, eq(movieActor.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.MOVIES), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, movieActor.name).as("grouped_movie_actor");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private countMovieLanguages(userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: countDistinct(movieDetails.originalLanguage).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(movieDetails, eq(movieDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.MOVIES), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countGameMode(mode: string, userId?: number) {
        return this.countGames(and(like(gameDetails.gameModes, `%${mode}%`), this.playedGameStatus()), userId);
    }

    private sumGameHours(userId?: number) {
        return getDbClient().select({
            userId: libraryEntry.userId,
            value: sql<number>`sum(${gameProgress.playtimeMinutes}) / 60`.as("value"),
        }).from(libraryEntry)
            .innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(catalogItem.kind, MediaType.GAMES), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countGamePlatforms(userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: countDistinct(gameProgress.platform).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(catalogItem.kind, MediaType.GAMES), this.playedGameStatus(), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countSpecificGamePlatform(platform: GamesPlatformsEnum, userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(catalogItem.kind, MediaType.GAMES), eq(gameProgress.platform, platform), this.playedGameStatus(), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countGamePlaytime(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);
        const condition = achievement.codeName.includes("long")
            ? gte(gameProgress.playtimeMinutes, threshold)
            : lte(gameProgress.playtimeMinutes, threshold);
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameProgress, eq(gameProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(catalogItem.kind, MediaType.GAMES), condition,
                inArray(libraryEntry.status, [Status.PLAYING, Status.COMPLETED, Status.ENDLESS, Status.MULTIPLAYER]),
                this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private maxGameCompany(developer: boolean, userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameCompany, eq(gameCompany.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.GAMES), this.playedGameStatus(),
                developer ? eq(gameCompany.developer, true) : eq(gameCompany.publisher, true), this.forUser(userId)))
            .groupBy(libraryEntry.userId, gameCompany.name).as("grouped_game_company");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private countGamePerspective(perspective: string, userId?: number) {
        return this.countGames(and(eq(gameDetails.playerPerspective, perspective), this.playedGameStatus()), userId);
    }

    private countGames(condition: ReturnType<typeof and>, userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(gameDetails, eq(gameDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.GAMES), condition, this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countBookDuration(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);
        const condition = achievement.codeName.includes("long") ? gte(bookDetails.pages, threshold) : lte(bookDetails.pages, threshold);
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.BOOKS), eq(libraryEntry.status, Status.COMPLETED), condition, this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private maxBookAuthor(userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookAuthor, eq(bookAuthor.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.BOOKS), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, bookAuthor.name).as("grouped_book_author");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private countBookLanguages(userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: countDistinct(bookDetails.language).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(bookDetails, eq(bookDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.BOOKS), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private countMangaDuration(achievement: Achievement, userId?: number) {
        const threshold = Number(achievement.value);
        const condition = achievement.codeName.includes("long") ? gte(mangaDetails.chapters, threshold) : lte(mangaDetails.chapters, threshold);
        return getDbClient().select({ userId: libraryEntry.userId, value: count(libraryEntry.catalogItemId).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.MANGA), eq(libraryEntry.status, Status.COMPLETED), condition, this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private maxMangaAuthor(userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaAuthor, eq(mangaAuthor.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.MANGA), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, mangaAuthor.name).as("grouped_manga_author");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private maxMangaPublisher(userId?: number) {
        const grouped = getDbClient().select({ userId: libraryEntry.userId, count: count(libraryEntry.catalogItemId).as("count") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaDetails, eq(mangaDetails.catalogItemId, catalogItem.id))
            .where(and(eq(catalogItem.kind, MediaType.MANGA), eq(libraryEntry.status, Status.COMPLETED), this.forUser(userId)))
            .groupBy(libraryEntry.userId, mangaDetails.publisher).as("grouped_manga_publisher");
        return getDbClient().select({ userId: grouped.userId, value: max(grouped.count).as("value") })
            .from(grouped).groupBy(grouped.userId).as("calculation");
    }

    private sumMangaChapters(userId?: number) {
        return getDbClient().select({ userId: libraryEntry.userId, value: sum(mangaProgress.totalChaptersRead).as("value") })
            .from(libraryEntry).innerJoin(catalogItem, eq(catalogItem.id, libraryEntry.catalogItemId))
            .innerJoin(mangaProgress, eq(mangaProgress.libraryEntryId, libraryEntry.id))
            .where(and(eq(catalogItem.kind, MediaType.MANGA), this.forUser(userId)))
            .groupBy(libraryEntry.userId).as("calculation");
    }

    private playedGameStatus() {
        return notInArray(libraryEntry.status, [Status.DROPPED, Status.PLAN_TO_PLAY]);
    }

    private forUser(userId?: number) {
        return userId ? eq(libraryEntry.userId, userId) : undefined;
    }
}
