import {ApiProviderType, MediaType, Status} from "@/lib/utils/enums";
import type {BooksService} from "@/lib/server/domain/media/books/books.service";
import {isManualBookId} from "@/lib/media-definitions/books/book.definition.server";
import type {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import type {MediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";
import {createImportListWriter, createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {filterImportCandidates, matchExternalItems} from "@/lib/server/domain/imports/matchers/external-matcher";
import {internalApiIdMatcher, internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-matchers";
import {type UpsertBooksWithDetails, booksFinalListInsertSchema, booksImportPayloadSchema} from "@/lib/server/domain/media/books/books.types";


export const createBooksMatcher = (
    booksService: BooksService,
    booksProvider: ExternalMediaProvider<UpsertBooksWithDetails>,
    booksIngestion: MediaIngestionService,
) => {
    return createMediaMatcher({
        internalMatchers: [
            internalApiIdMatcher(ApiProviderType.BOOKS, booksService),
            internalNameDateMatcher(booksService, ApiProviderType.BOOKS),
        ],
        externalMatchers: [{
            match: (items) => {
                return matchExternalItems({
                    items,
                    mediaLabel: "Book",
                    resultBatchSize: 50,
                    resolveItem: async item => {
                        if (item.externalApiId && isManualBookId(item.externalApiId)) {
                            return { statusReason: "This manually added book is no longer available." };
                        }
                        if (item.externalApiSource === ApiProviderType.BOOKS && item.externalApiId) {
                            return { mediaId: await booksIngestion.storeFromExternal(item.externalApiId, false) };
                        }

                        if (!item.name) return { statusReason: "Book API match not found" };

                        const searchResults = await booksProvider.search(item.name);
                        const candidates = filterImportCandidates(searchResults.data, MediaType.BOOKS, item.releaseDate);

                        if (candidates.length === 0) return { statusReason: "Book API match not found" };
                        if (candidates.length > 1) return { statusReason: "Book API match is ambiguous" };

                        return { mediaId: await booksIngestion.storeFromExternal(candidates[0].id, false) };
                    },
                })
            },
        }],
        listWriter: createImportListWriter({
            insertRows: booksService.bulkInsertUserMedia,
            toRow: (userId, { item, mediaId }) => {
                const payload = booksImportPayloadSchema.parse(item.payload);

                const media = booksService.findById(mediaId);
                if (!media) {
                    throw new Error(`Matched book media ${mediaId} does not exist`);
                }

                let total = payload.total;
                const redo = payload.redo ?? 0;

                const actualPage = payload.actualPage === undefined
                    ? payload.status === Status.COMPLETED ? media.pages : 0
                    : payload.actualPage;

                if (total === undefined) {
                    if (payload.status === Status.COMPLETED) total = media.pages * (1 + redo);
                    else if (payload.status === Status.PLANNED) total = 0;
                    else total = (actualPage ?? 0) + redo * media.pages;
                }

                return booksFinalListInsertSchema.parse({ userId, mediaId, ...payload, redo, total, actualPage });
            },
        }),
    });
}
