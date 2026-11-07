import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import type {ImportItemsSelect} from "@/lib/types/imports.types";
import type {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import type {UpsertMangaWithDetails} from "@/lib/server/domain/media/manga/manga.types";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import type {ExternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {filterImportCandidates, matchExternalItems} from "@/lib/server/domain/imports/matchers/external-matcher";


export class ExternalMalMangaMatcher implements ExternalMediaMatcher {
    constructor(
        private mangaProvider: ExternalMediaProvider<UpsertMangaWithDetails>,
        private mangaIngestion: MediaIngestionService,
        private resultBatchSize = 50,
    ) {
    }

    match(items: ImportItemsSelect[]) {
        return matchExternalItems({
            items,
            mediaLabel: "Manga",
            resultBatchSize: this.resultBatchSize,
            resolveItem: async item => {
                if (item.externalApiSource === ApiProviderType.MANGA && item.externalApiId) {
                    return { mediaId: await this.mangaIngestion.storeFromExternal(item.externalApiId, false) };
                }

                if (!item.name) return { statusReason: "Manga API match not found" };

                const searchResults = await this.mangaProvider.search(item.name);
                const candidates = filterImportCandidates(searchResults.data, MediaType.MANGA, item.releaseDate, item.name);

                if (candidates.length === 0) return { statusReason: "Manga API match not found" };
                if (candidates.length > 1) return { statusReason: "Manga API match is ambiguous" };

                return { mediaId: await this.mangaIngestion.storeFromExternal(candidates[0].id, false) };
            },
        });
    }
}
