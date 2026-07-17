import {ApiProviderType} from "@/lib/utils/enums";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {TvMediaType} from "@/lib/types/media-kind.types";
import {TvCatalogSnapshot} from "@/lib/server/domain/media/tv/catalog/tv-catalog-snapshot";
import {ExternalTMDBTvMatcher} from "@/lib/server/domain/media/tv/imports/external-tv.matcher";
import {TvImportListWriter} from "@/lib/server/domain/media/tv/imports/tv-import-list.writer";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {TvLibraryCommands} from "@/lib/server/domain/media/tv/library/tv-library.commands";
import {TvCatalogIngestionRepository} from "@/lib/server/domain/media/tv/catalog/tv-catalog-ingestion.repository";


export const createTvMatcher = (
    mediaType: TvMediaType,
    catalog: TvCatalogIngestionRepository,
    tvProvider: ExternalMediaProvider<TvCatalogSnapshot>,
    tvIngestion: MediaIngestionService<TvCatalogSnapshot>,
    libraryCommands: TvLibraryCommands,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.TMDB, catalog),
        internalNameDateMatcher(catalog),
    ],
    externalMatchers: [
        new ExternalTMDBTvMatcher(mediaType, tvProvider, tvIngestion),
    ],
    listWriter: new TvImportListWriter(catalog, mediaType, libraryCommands),
});
