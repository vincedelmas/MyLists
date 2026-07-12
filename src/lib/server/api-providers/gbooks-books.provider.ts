import {MediaType} from "@/lib/utils/enums";
import {GBooksApi} from "@/lib/server/api-providers/api";
import {BooksRepository} from "@/lib/server/domain/media/books";
import {ExternalMediaProvider} from "@/lib/server/api-providers/interfaces.types";
import {UpsertBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import {gBooksTransformer} from "@/lib/server/api-providers/transformers/gbook.transformer";
import {createMediaIngestionService} from "@/lib/server/api-providers/media-ingestion.service";


export const createGBooksBooksProvider = (gBooks: GBooksApi): ExternalMediaProvider<UpsertBooksWithDetails> => {
    return {
        mediaType: MediaType.BOOKS,
        source: "google-books" as const,

        search: {
            async search(query: string, page = 1) {
                const raw = await gBooks.search(query, page);
                return gBooksTransformer.transformSearchResults(raw);
            },
        },

        details: {
            async getDetails(apiId: string) {
                const raw = await gBooks.getBooksDetails(apiId);
                return gBooksTransformer.transformDetailsResults(raw);
            },
        },
    };
};


export const createBooksIngestionService = (repository: BooksRepository, provider: ExternalMediaProvider<UpsertBooksWithDetails>) => {
    return createMediaIngestionService({
        provider,
        repository: repository,
    });
}
