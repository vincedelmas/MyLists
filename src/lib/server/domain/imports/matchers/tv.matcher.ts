import {ApiProviderType} from "@/lib/utils/enums";
import {TvService} from "@/lib/server/domain/media/tv/tv.service";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {TvMediaType, UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import {ExternalTMDBTvMatcher} from "@/lib/server/domain/imports/matchers/external-tv.matcher";
import {TvImportListWriter} from "@/lib/server/domain/imports/list-writers/tv-import-list.writer";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";


export const createTvMatcher = (
    mediaType: TvMediaType,
    tvService: TvService,
    tvProvider: ExternalMediaProvider<UpsertTvWithDetails>,
    tvIngestion: MediaIngestionService<UpsertTvWithDetails>,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.TMDB, tvService),
        internalNameDateMatcher(tvService),
    ],
    externalMatchers: [
        new ExternalTMDBTvMatcher(mediaType, tvProvider, tvIngestion),
    ],
    listWriter: new TvImportListWriter(tvService),
});
