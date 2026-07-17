import {ApiProviderType} from "@/lib/utils/enums";
import {UpsertBooksWithDetails} from "@/lib/server/domain/catalog/catalog-ingestion.types";
import {createMediaMatcher} from "@/lib/server/domain/imports/matchers/media.matcher";
import {internalApiIdMatcher} from "@/lib/server/domain/imports/matchers/internal-api-id.matcher";
import {ExternalGoogleBooksMatcher} from "@/lib/server/domain/imports/matchers/external-books.matcher";
import {internalNameDateMatcher} from "@/lib/server/domain/imports/matchers/internal-name-date.matcher";
import {BooksImportListWriter} from "@/lib/server/domain/imports/list-writers/books-import-list.writer";
import {ExternalMediaProvider, MediaIngestionService} from "@/lib/server/api-providers/interfaces.types";
import {BookLibraryCommands} from "@/lib/server/domain/library/books/book-library.commands";
import {BookCatalogIngestionRepository} from "@/lib/server/domain/catalog/books/book-catalog-ingestion.repository";


export const createBooksMatcher = (
    catalog: BookCatalogIngestionRepository,
    booksProvider: ExternalMediaProvider<UpsertBooksWithDetails>,
    booksIngestion: MediaIngestionService<UpsertBooksWithDetails>,
    libraryCommands: BookLibraryCommands,
) => createMediaMatcher({
    internalMatchers: [
        internalApiIdMatcher(ApiProviderType.BOOKS, catalog),
        internalNameDateMatcher(catalog),
    ],
    externalMatchers: [
        new ExternalGoogleBooksMatcher(booksProvider, booksIngestion),
    ],
    listWriter: new BooksImportListWriter(catalog, libraryCommands),
});
