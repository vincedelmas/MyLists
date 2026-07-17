import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {BookLibraryCommands} from "@/lib/server/domain/library/books/book-library.commands";
import {BookLibraryRepository} from "@/lib/server/domain/library/books/book-library.repository";
import {BookLibraryReadRepository} from "@/lib/server/domain/library/books/book-library-read.repository";
import {BookListReadRepository} from "@/lib/server/domain/library/books/book-list-read.repository";
import {BookStatsReadRepository} from "@/lib/server/domain/library/books/book-stats-read.repository";
import {BookDetailsQuery} from "@/lib/server/domain/catalog/books/book-details.query";
import {BookCatalogReadRepository} from "@/lib/server/domain/catalog/books/book-catalog-read.repository";
import {BookCatalogAdminRepository} from "@/lib/server/domain/catalog/books/book-catalog-admin.repository";
import {BookCatalogEditCommand} from "@/lib/server/domain/catalog/books/book-catalog-edit.command";
import {BookCatalogIngestionRepository} from "@/lib/server/domain/catalog/books/book-catalog-ingestion.repository";
import {BookCatalogIngestionCommand} from "@/lib/server/domain/catalog/books/book-catalog-ingestion.command";
import {BookCoverContributionCommand} from "@/lib/server/domain/catalog/books/book-cover-contribution.command";
import {CatalogRefreshCandidateRepository} from "@/lib/server/domain/catalog/catalog-refresh-candidate.repository";
import {createBooksIngestionService, createGBooksBooksProvider} from "@/lib/server/api-providers/gbooks-books.provider";
import {createBooksMatcher} from "@/lib/server/domain/imports/matchers/books.matcher";


export const setupBookMediaModule = (
    apiClients: ApiClientModule,
    refreshCandidates: CatalogRefreshCandidateRepository,
) => {
    const libraryRepository = new BookLibraryRepository();
    const libraryCommands = new BookLibraryCommands(libraryRepository);
    const catalogRepository = new BookCatalogIngestionRepository();
    const catalogCommands = new BookCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);
    const catalogRead = new BookCatalogReadRepository();
    const catalogAdmin = new BookCatalogAdminRepository();
    const external = createGBooksBooksProvider(apiClients.gBook);
    const ingestion = createBooksIngestionService(catalogCommands, external);

    return {
        kind: MediaType.BOOKS,
        catalog: {
            details: new BookDetailsQuery(catalogRead),
            read: catalogRead,
            admin: catalogAdmin,
            edit: new BookCatalogEditCommand(catalogAdmin, libraryRepository, libraryCommands),
            ingestion,
            contributeCover: new BookCoverContributionCommand(catalogAdmin),
            refreshIdentity: {
                get: (catalogItemId: number) => refreshCandidates.getItemIdentity(MediaType.BOOKS, catalogItemId),
            },
        },
        library: {
            commands: libraryCommands,
            read: new BookLibraryReadRepository(),
            list: new BookListReadRepository(),
            stats: new BookStatsReadRepository(),
        },
        external,
        imports: {
            matcher: createBooksMatcher(catalogRepository, external, ingestion, libraryCommands),
        },
    } as const;
};

