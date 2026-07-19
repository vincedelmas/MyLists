import {MediaType} from "@/lib/utils/enums";
import {TvRepository, TvService} from "@/lib/server/domain/media/tv";
import {UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import {GamesRepository, GamesService} from "@/lib/server/domain/media/games";
import {MangaRepository, MangaService} from "@/lib/server/domain/media/manga";
import {BooksRepository, BooksService} from "@/lib/server/domain/media/books";
import {MoviesRepository, MoviesService} from "@/lib/server/domain/media/movies";
import {UpsertGameWithDetails} from "@/lib/server/domain/media/games/games.types";
import {MediaAchievements} from "@/lib/server/domain/media/base/base.achievements";
import {UpsertBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import {UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import {UpsertMovieWithDetails} from "@/lib/server/domain/media/movies/movies.types";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";


interface MediaRepositoryRegistryMap {
    [MediaType.SERIES]: TvRepository;
    [MediaType.ANIME]: TvRepository;
    [MediaType.MOVIES]: MoviesRepository;
    [MediaType.GAMES]: GamesRepository;
    [MediaType.BOOKS]: BooksRepository;
    [MediaType.MANGA]: MangaRepository;
}


export class MediaRepositoryRegistry {
    private static repositories: MediaRepositoryRegistryMap = {} as MediaRepositoryRegistryMap;

    static register<T extends keyof MediaRepositoryRegistryMap>(mediaType: T, repository: MediaRepositoryRegistryMap[T]) {
        this.repositories[mediaType] = repository;
    }

    static get<T extends keyof MediaRepositoryRegistryMap>(mediaType: T) {
        if (!this.repositories[mediaType]) {
            throw new Error(`Repository for media type ${mediaType} not registered`);
        }
        return this.repositories[mediaType];
    }
}


interface MediaServiceRegistryMap {
    [MediaType.SERIES]: TvService;
    [MediaType.ANIME]: TvService;
    [MediaType.MOVIES]: MoviesService;
    [MediaType.GAMES]: GamesService;
    [MediaType.BOOKS]: BooksService;
    [MediaType.MANGA]: MangaService;
}


export class MediaServiceRegistry {
    private static services: MediaServiceRegistryMap = {} as MediaServiceRegistryMap;

    static register<T extends keyof MediaServiceRegistryMap>(mediaType: T, service: MediaServiceRegistryMap[T]) {
        this.services[mediaType] = service;
    }

    static get<T extends keyof MediaServiceRegistryMap>(mediaType: T): MediaServiceRegistryMap[T] {
        if (!this.services[mediaType]) {
            throw new Error(`Service for media type ${mediaType} not registered`);
        }
        return this.services[mediaType];
    }
}


interface ExternalMediaProviderRegistryMap {
    [MediaType.SERIES]: ExternalMediaProvider<UpsertTvWithDetails>;
    [MediaType.ANIME]: ExternalMediaProvider<UpsertTvWithDetails>;
    [MediaType.MOVIES]: ExternalMediaProvider<UpsertMovieWithDetails>;
    [MediaType.GAMES]: ExternalMediaProvider<UpsertGameWithDetails>;
    [MediaType.BOOKS]: ExternalMediaProvider<UpsertBooksWithDetails>;
    [MediaType.MANGA]: ExternalMediaProvider<UpsertMangaWithDetails>;
}


export class ExternalMediaProviderRegistry {
    private static providers: ExternalMediaProviderRegistryMap = {} as ExternalMediaProviderRegistryMap;

    static register<T extends keyof ExternalMediaProviderRegistryMap>(mediaType: T, provider: ExternalMediaProviderRegistryMap[T]) {
        this.providers[mediaType] = provider;
    }

    static get<T extends keyof ExternalMediaProviderRegistryMap>(mediaType: T) {
        if (!this.providers[mediaType]) {
            throw new Error(`ExternalMediaProvider for media type ${mediaType} not registered`);
        }
        return this.providers[mediaType];
    }
}


interface MediaIngestionServiceRegistryMap {
    [MediaType.SERIES]: MediaIngestionService<UpsertTvWithDetails>;
    [MediaType.ANIME]: MediaIngestionService<UpsertTvWithDetails>;
    [MediaType.MOVIES]: MediaIngestionService<UpsertMovieWithDetails>;
    [MediaType.GAMES]: MediaIngestionService<UpsertGameWithDetails>;
    [MediaType.BOOKS]: MediaIngestionService<UpsertBooksWithDetails>;
    [MediaType.MANGA]: MediaIngestionService<UpsertMangaWithDetails>;
}


export class MediaIngestionServiceRegistry {
    private static ingestion: MediaIngestionServiceRegistryMap = {} as MediaIngestionServiceRegistryMap;

    static register<T extends keyof MediaIngestionServiceRegistryMap>(mediaType: T, provider: MediaIngestionServiceRegistryMap[T]) {
        this.ingestion[mediaType] = provider;
    }

    static get<T extends keyof MediaIngestionServiceRegistryMap>(mediaType: T) {
        if (!this.ingestion[mediaType]) {
            throw new Error(`IngestionService for media type ${mediaType} not registered`);
        }
        return this.ingestion[mediaType];
    }
}


type MediaAchievementsRegistryMap = Record<MediaType, MediaAchievements>;


export class MediaAchievementsRegistry {
    private static achievements: MediaAchievementsRegistryMap = {} as MediaAchievementsRegistryMap;

    static register<T extends MediaType>(mediaType: T, achievements: MediaAchievementsRegistryMap[T]) {
        this.achievements[mediaType] = achievements;
    }

    static get<T extends MediaType>(mediaType: T): MediaAchievementsRegistryMap[T] {
        if (!this.achievements[mediaType]) {
            throw new Error(`Achievements for media type ${mediaType} not registered`);
        }
        return this.achievements[mediaType];
    }
}
