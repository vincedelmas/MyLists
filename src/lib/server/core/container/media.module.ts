import {MediaType} from "@/lib/utils/enums";
import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {createTvAchievementCatalog} from "@/lib/server/domain/media/tv/tv.achievements";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {mangaServerDefinition} from "@/lib/media-definitions/manga/manga.definition.server";
import {gamesServerDefinition} from "@/lib/media-definitions/games/games.definition.server";
import {moviesServerDefinition} from "@/lib/media-definitions/movies/movies.definition.server";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {createBooksAchievementCatalog} from "@/lib/server/domain/media/books/books.achievements";
import {createGamesAchievementCatalog} from "@/lib/server/domain/media/games/games.achievements";
import {createMangaAchievementCatalog} from "@/lib/server/domain/media/manga/manga.achievements";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";
import {createMoviesAchievementCatalog} from "@/lib/server/domain/media/movies/movies.achievements";
import {createTvMonthlyActivity} from "@/lib/server/domain/media/tv/tv.monthly-activity";
import {createBooksMonthlyActivity} from "@/lib/server/domain/media/books/books.monthly-activity";
import {createGamesMonthlyActivity} from "@/lib/server/domain/media/games/games.monthly-activity";
import {createMangaMonthlyActivity} from "@/lib/server/domain/media/manga/manga.monthly-activity";
import {createMoviesMonthlyActivity} from "@/lib/server/domain/media/movies/movies.monthly-activity";
import {setupMediaServicesModule} from "@/lib/server/core/container/media-services.module";
import {setupMediaStatisticsModule} from "@/lib/server/core/container/media-statistics.module";


export function setupMediaModule() {
    const mediaServicesModule = setupMediaServicesModule();
    const mediaStatisticsModule = setupMediaStatisticsModule();
    const {repositories, services} = mediaServicesModule;

    const mediaMonthlyActivityRegistry = createMediaRegistry({
        [MediaType.SERIES]: createTvMonthlyActivity(seriesServerDefinition, repositories.series),
        [MediaType.ANIME]: createTvMonthlyActivity(animeServerDefinition, repositories.anime),
        [MediaType.MOVIES]: createMoviesMonthlyActivity(moviesServerDefinition, repositories.movies),
        [MediaType.GAMES]: createGamesMonthlyActivity(gamesServerDefinition, repositories.games),
        [MediaType.BOOKS]: createBooksMonthlyActivity(booksServerDefinition, repositories.books),
        [MediaType.MANGA]: createMangaMonthlyActivity(mangaServerDefinition, repositories.manga),
    });

    const mediaAchievementsRegistry = createMediaRegistry({
        [MediaType.SERIES]: createTvAchievementCatalog(seriesServerDefinition),
        [MediaType.ANIME]: createTvAchievementCatalog(animeServerDefinition),
        [MediaType.MOVIES]: createMoviesAchievementCatalog(moviesServerDefinition),
        [MediaType.GAMES]: createGamesAchievementCatalog(gamesServerDefinition),
        [MediaType.BOOKS]: createBooksAchievementCatalog(booksServerDefinition),
        [MediaType.MANGA]: createMangaAchievementCatalog(mangaServerDefinition),
    });

    return {
        repositories,
        services,
        registries: {
            ...mediaServicesModule.registries,
            ...mediaStatisticsModule.registries,
            mediaAchievements: mediaAchievementsRegistry,
            mediaMonthlyActivity: mediaMonthlyActivityRegistry,
        }
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
