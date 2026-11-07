import {ApiProviderType, TvMediaType} from "@/lib/utils/enums";
import type {ImportItemsSelect} from "@/lib/types/imports.types";
import type {UpsertTvWithDetails} from "@/lib/server/domain/media/tv/tv.types";
import type {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import type {ExternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {filterImportCandidates, matchExternalItems} from "@/lib/server/domain/imports/matchers/external-matcher";


export class ExternalTMDBTvMatcher implements ExternalMediaMatcher {
    constructor(
        private mediaType: TvMediaType,
        private tvProvider: ExternalMediaProvider<UpsertTvWithDetails>,
        private tvIngestion: MediaIngestionService,
        private resultBatchSize = 50,
    ) {
    }

    match(items: ImportItemsSelect[]) {
        return matchExternalItems({
            items,
            mediaLabel: "TV",
            resultBatchSize: this.resultBatchSize,
            resolveItem: async item => {
                if (item.externalApiSource === ApiProviderType.TMDB && item.externalApiId) {
                    return { mediaId: await this.tvIngestion.storeFromExternal(item.externalApiId, false, true) };
                }

                if (!item.name) return { statusReason: "TV API match not found" };

                const searchResults = await this.tvProvider.search(item.name);
                const candidates = filterImportCandidates(searchResults.data, this.mediaType, item.releaseDate, item.name);

                if (candidates.length === 0) return { statusReason: "TV API match not found" };
                if (candidates.length > 1) return { statusReason: "TV API match is ambiguous" };

                return { mediaId: await this.tvIngestion.storeFromExternal(candidates[0].id, false, true) };
            },
        });
    }
}
