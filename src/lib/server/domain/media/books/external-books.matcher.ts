import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import type {ImportItemsSelect} from "@/lib/types/imports.types";
import {isManualBookId} from "@/lib/media-definitions/books/book.definition.server";
import type {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import type {UpsertBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import type {ExternalMediaMatcher} from "@/lib/server/domain/imports/matchers/media-matcher.interfaces";
import {filterImportCandidates, matchExternalItems} from "@/lib/server/domain/imports/matchers/external-matcher";


export class ExternalGoogleBooksMatcher implements ExternalMediaMatcher {
    constructor(
        private booksProvider: ExternalMediaProvider<UpsertBooksWithDetails>,
        private booksIngestion: MediaIngestionService,
        private resultBatchSize = 50,
    ) {
    }

    match(items: ImportItemsSelect[]) {
        return matchExternalItems({
            items,
            mediaLabel: "Book",
            resultBatchSize: this.resultBatchSize,
            resolveItem: async item => {
                if (item.externalApiId && isManualBookId(item.externalApiId)) {
                    return {
                        statusReason: "This manually added book is no longer available."
                    };
                }
                if (item.externalApiSource === ApiProviderType.BOOKS && item.externalApiId) {
                    return {
                        mediaId: await this.booksIngestion.storeFromExternal(item.externalApiId, false),
                    };
                }

                if (!item.name) return { statusReason: "Book API match not found" };

                const searchResults = await this.booksProvider.search(item.name);
                const candidates = filterImportCandidates(searchResults.data, MediaType.BOOKS, item.releaseDate);

                if (candidates.length === 0) return { statusReason: "Book API match not found" };
                if (candidates.length > 1) return { statusReason: "Book API match is ambiguous" };

                return { mediaId: await this.booksIngestion.storeFromExternal(candidates[0].id, false) };
            },
        });
    }
}
