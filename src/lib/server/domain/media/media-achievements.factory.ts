import {MediaType} from "@/lib/utils/enums";
import {createBooksAchievements} from "@/lib/server/domain/media/books/books.achievements";
import {createGamesAchievements} from "@/lib/server/domain/media/games/games.achievements";
import {createMangaAchievements} from "@/lib/server/domain/media/manga/manga.achievements";
import {createMoviesAchievements} from "@/lib/server/domain/media/movies/movies.achievements";
import {createTvAchievements} from "@/lib/server/domain/media/tv/tv.achievements";
import type {BookSchemaConfig} from "@/lib/server/domain/media/books/books.config";
import type {GamesSchemaConfig} from "@/lib/server/domain/media/games/games.config";
import type {MangaSchemaConfig} from "@/lib/server/domain/media/manga/manga.config";
import type {MovieSchemaConfig} from "@/lib/server/domain/media/movies/movies.config";
import type {AnimeSchemaConfig} from "@/lib/server/domain/media/tv/anime/anime.config";
import type {SeriesSchemaConfig} from "@/lib/server/domain/media/tv/series/series.config";


type MediaAchievementsConfig =
    | SeriesSchemaConfig
    | AnimeSchemaConfig
    | MovieSchemaConfig
    | GamesSchemaConfig
    | BookSchemaConfig
    | MangaSchemaConfig;


export function createMediaAchievements(config: SeriesSchemaConfig): ReturnType<typeof createTvAchievements>;
export function createMediaAchievements(config: AnimeSchemaConfig): ReturnType<typeof createTvAchievements>;
export function createMediaAchievements(config: MovieSchemaConfig): ReturnType<typeof createMoviesAchievements>;
export function createMediaAchievements(config: GamesSchemaConfig): ReturnType<typeof createGamesAchievements>;
export function createMediaAchievements(config: BookSchemaConfig): ReturnType<typeof createBooksAchievements>;
export function createMediaAchievements(config: MangaSchemaConfig): ReturnType<typeof createMangaAchievements>;
export function createMediaAchievements(config: MediaAchievementsConfig) {
    switch (config.mediaType) {
        case MediaType.SERIES:
        case MediaType.ANIME:
            return createTvAchievements(config);
        case MediaType.MOVIES:
            return createMoviesAchievements(config);
        case MediaType.GAMES:
            return createGamesAchievements(config);
        case MediaType.BOOKS:
            return createBooksAchievements(config);
        case MediaType.MANGA:
            return createMangaAchievements(config);
    }
}
