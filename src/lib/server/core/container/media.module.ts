import {createTvModule} from "@/lib/server/domain/media/tv";
import {createBooksModule} from "@/lib/server/domain/media/books";
import {createGamesModule} from "@/lib/server/domain/media/games";
import {createMangaModule} from "@/lib/server/domain/media/manga";
import {createMoviesModule} from "@/lib/server/domain/media/movies";
import {createMediaRegistry} from "@/lib/server/domain/media/media.registries";
import {animeServerDefinition} from "@/lib/media-definitions/tv/anime/anime.definition.server";
import {seriesServerDefinition} from "@/lib/media-definitions/tv/series/series.definition.server";


export function setupMediaModule() {
    const series = createTvModule(seriesServerDefinition);
    const anime = createTvModule(animeServerDefinition);
    const movies = createMoviesModule();
    const games = createGamesModule();
    const books = createBooksModule();
    const manga = createMangaModule();
    const modules = [series, anime, movies, games, books, manga];

    return {
        repositories: {
            series: series.repository,
            anime: anime.repository,
            movies: movies.repository,
            games: games.repository,
            books: books.repository,
            manga: manga.repository,
        },
        services: {
            series: series.service,
            anime: anime.service,
            movies: movies.service,
            games: games.service,
            books: books.service,
            manga: manga.service,
        },
        registries: {
            mediaService: createMediaRegistry(modules, "service"),
            mediaStatistics: createMediaRegistry(modules, "statistics"),
            mediaRepository: createMediaRegistry(modules, "repository"),
            mediaAchievements: createMediaRegistry(modules, "achievements"),
            mediaMonthlyActivity: createMediaRegistry(modules, "monthlyActivity"),
        },
    };
}


export type MediaModule = ReturnType<typeof setupMediaModule>;
