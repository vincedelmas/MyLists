import {ApiProviderType} from "@/lib/utils/enums";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {UpsertTvWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {ExternalTMDBTvMatcher} from "@/lib/server/domain/imports/matchers/external-tv.matcher";
import {TvImportListWriter} from "@/lib/server/domain/imports/list-writers/tv-import-list.writer";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {TvLibraryWriter} from "@/lib/server/domain/library/tv/tv-library.writer";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/catalog/tv/tv-catalog-ingestion.repository";


export const createTvMatcher = (
    mediaType: TvMediaType,
    catalog: TvCatalogIngestionRepository,
    tvProvider: ExternalMediaProvider<UpsertTvWithDetails>,
    tvIngestion: MediaIngestionService<UpsertTvWithDetails>,
    libraryWriter: TvLibraryWriter,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.TMDB, catalog),
        internalNameDateMatcher(catalog),
    ],
    externalMatchers: [
        new ExternalTMDBTvMatcher(mediaType, tvProvider, tvIngestion),
    ],
    listWriter: new TvImportListWriter(catalog, mediaType, libraryWriter),
});
