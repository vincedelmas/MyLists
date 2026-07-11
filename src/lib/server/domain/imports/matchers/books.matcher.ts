import {ApiProviderType} from "@/lib/utils/enums";
import {BooksService} from "@/lib/server/domain/media/books/books.service";
import {UpsertBooksWithDetails} from "@/lib/server/domain/media/books/books.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalGoogleBooksMatcher} from "@/lib/server/domain/imports/matchers/external-books.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {BooksImportListWriter} from "@/lib/server/domain/imports/list-writers/books-import-list.writer";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";


export const createBooksMatcher = (
    booksService: BooksService,
    booksProvider: ExternalMediaProvider<UpsertBooksWithDetails>,
    booksIngestion: MediaIngestionService<UpsertBooksWithDetails>,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.BOOKS, booksService),
        internalNameDateMatcher(booksService),
    ],
    externalMatchers: [
        new ExternalGoogleBooksMatcher(booksProvider, booksIngestion),
    ],
    listWriter: new BooksImportListWriter(booksService),
});
