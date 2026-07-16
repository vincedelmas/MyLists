import {MediaType} from "@/lib/utils/enums";
import {
    UpsertBooksWithDetails,
    UpsertGameWithDetails,
    UpsertMangaWithDetails,
    UpsertMovieWithDetails,
    UpsertTvWithDetails,
} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";


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
