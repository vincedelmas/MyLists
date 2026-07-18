import {MediaType} from "@/lib/utils/enums";
import {GBooksApi} from "@/lib/server/api-providers/api";
import {BookLibraryCommands} from "@/lib/server/domain/media/books/library/book-library.commands";
import {BookLibraryRepository} from "@/lib/server/domain/media/books/library/book-library.repository";
import {BookLibraryReadRepository} from "@/lib/server/domain/media/books/library/book-library-read.repository";
import {BookListReadRepository} from "@/lib/server/domain/media/books/library/book-list-read.repository";
import {BookStatsRepository} from "@/lib/server/domain/media/books/library/book-stats.repository";
import {BookDetailsQuery} from "@/lib/server/domain/media/books/catalog/book-details.query";
import {BookCatalogReadRepository} from "@/lib/server/domain/media/books/catalog/book-catalog-read.repository";
import {BookCatalogAdminRepository} from "@/lib/server/domain/media/books/catalog/book-catalog-admin.repository";
import {BookCatalogEditCommand} from "@/lib/server/domain/media/books/catalog/book-catalog-edit.command";
import {BookCatalogIngestionRepository} from "@/lib/server/domain/media/books/catalog/book-catalog-ingestion.repository";
import {BookCatalogIngestionCommand} from "@/lib/server/domain/media/books/catalog/book-catalog-ingestion.command";
import {BookCoverContributionCommand} from "@/lib/server/domain/media/books/catalog/book-cover-contribution.command";
import {createBooksIngestionService, createGBooksBooksProvider} from "@/lib/server/domain/media/books/external/gbooks-books.provider";
import {createBooksMatcher} from "@/lib/server/domain/media/books/imports/books.matcher";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {exportBookLibraryCsv} from "@/lib/server/domain/media/books/library/book-library-csv-export";
import {LibraryTagsQuery} from "@/lib/server/domain/media/shared/library/library-tags.query";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/media/shared/library/library-custom-cover.command";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {booksMyListsCSVRowSchema} from "@/lib/server/domain/media/books/imports/book-import.schemas";
import {booksAchievements} from "@/lib/server/domain/media/books/achievements/books.seed";
import {BookAchievementCalculator} from "@/lib/server/domain/media/books/achievements/book-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {bookActivityDefinition} from "@/lib/server/domain/media/books/activity/book-activity.definition";


export const setupBookMediaModule = (
    gBooks: GBooksApi,
) => {
    const libraryRepository = new BookLibraryRepository();
    const libraryCommands = new BookLibraryCommands(libraryRepository);
    const libraryRead = new BookLibraryReadRepository(libraryRepository);
    const catalogRepository = new BookCatalogIngestionRepository();
    const catalogCommands = new BookCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);
    const catalogRead = new BookCatalogReadRepository();
    const catalogAdmin = new BookCatalogAdminRepository();
    const external = createGBooksBooksProvider(gBooks);
    const ingestion = createBooksIngestionService(catalogCommands, external);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.BOOKS);
    const tags = new LibraryTagsQuery(MediaType.BOOKS);

    return {
        kind: MediaType.BOOKS,
        catalog: {
            details: new BookDetailsQuery(catalogRead, libraryRead),
            read: catalogRead,
            admin: catalogAdmin,
            edit: new BookCatalogEditCommand(catalogAdmin, libraryRepository, libraryCommands),
            ingestion,
            contributeCover: new BookCoverContributionCommand(catalogAdmin),
            refresh: {
                identity: refreshIdentity,
                selfServiceAllowed: false,
            },
            maintenance: createCatalogMaintenance(MediaType.BOOKS),
        },
        library: {
            commands: libraryCommands,
            read: libraryRead,
            list: new BookListReadRepository(),
            export: {
                csv: exportBookLibraryCsv,
            },
            stats: BookStatsRepository,
            tags: {
                getNames: (userId: number) => tags.getNames(userId),
                edit: (params: Parameters<BookLibraryCommands["editTag"]>[0]) => libraryCommands.editTag(params),
            },
            covers: new LibraryCustomCoverCommand(MediaType.BOOKS, libraryRead, libraryCommands),
        },
        external,
        contributions: {
            imports: {
                matcher: createBooksMatcher(catalogRepository, external, ingestion, libraryCommands),
                csv: {
                    rowSchema: booksMyListsCSVRowSchema,
                },
            },
            achievements: {
                definitions: booksAchievements,
                calculator: BookAchievementCalculator satisfies AchievementCalculator,
            },
            activity: {
                definition: bookActivityDefinition,
            },
        },
    } as const;
};
