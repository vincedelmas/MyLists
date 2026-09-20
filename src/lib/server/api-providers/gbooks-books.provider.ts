import {serverEnv} from "@/env/server";
import type {CacheManager} from "@/lib/server/core/cache-manager";
import {createOpenLibraryBookEnricher} from "@/lib/server/api-providers/open-library-books.enricher";
import {ApiProviderType} from "@/lib/utils/enums";
import {GBooksApi} from "@/lib/server/api-providers/api";
import {BooksRepository} from "@/lib/server/domain/media/books";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import {booksServerDefinition} from "@/lib/media-definitions/books/book.definition.server";
import {gBooksTransformer} from "@/lib/server/api-providers/transformers/gbook.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";


export const createGBooksBooksProvider = (gBooks: GBooksApi): ExternalMediaProvider<UpsertBooksWithDetails> => {
    const transformOptions = {
        ...booksServerDefinition.identity,
    };

    return {
        async search(query: string, page = 1, advancedFilters) {
            const bookFilters = advancedFilters?.provider === ApiProviderType.BOOKS
                ? advancedFilters
                : undefined;

            const raw = await gBooks.search(query, page, bookFilters);
            return gBooksTransformer.transformSearchResults(raw, transformOptions);
        },

        async getDetails(apiId: string) {
            const raw = await gBooks.getBooksDetails(apiId);
            return gBooksTransformer.transformDetailsResults(raw, transformOptions);
        },
    };
};


export const createBooksIngestionService = (repository: BooksRepository, provider: ExternalMediaProvider<UpsertBooksWithDetails>, cacheManager: CacheManager) => {
    return createMediaIngestionService({
        provider,
        repository,
        enrichers: serverEnv.OPEN_LIBRARY_BOOK_MATCHING ? [createOpenLibraryBookEnricher(cacheManager)] : [],
    });
}
