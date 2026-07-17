import {MediaType} from "@/lib/utils/enums";
import {ApiClientModule} from "@/lib/server/core/container/api-client.module";
import {BookLibraryCommands} from "@/lib/server/domain/media/books/library/book-library.commands";
import {BookLibraryRepository} from "@/lib/server/domain/media/books/library/book-library.repository";
import {BookLibraryReadRepository} from "@/lib/server/domain/media/books/library/book-library-read.repository";
import {BookListReadRepository} from "@/lib/server/domain/media/books/library/book-list-read.repository";
import {BookStatsReadRepository} from "@/lib/server/domain/media/books/library/book-stats-read.repository";
import {BookDetailsQuery} from "@/lib/server/domain/media/books/catalog/book-details.query";
import {BookCatalogReadRepository} from "@/lib/server/domain/media/books/catalog/book-catalog-read.repository";
import {BookCatalogAdminRepository} from "@/lib/server/domain/media/books/catalog/book-catalog-admin.repository";
import {BookCatalogEditCommand} from "@/lib/server/domain/media/books/catalog/book-catalog-edit.command";
import {BookCatalogIngestionRepository} from "@/lib/server/domain/media/books/catalog/book-catalog-ingestion.repository";
import {BookCatalogIngestionCommand} from "@/lib/server/domain/media/books/catalog/book-catalog-ingestion.command";
import {BookCoverContributionCommand} from "@/lib/server/domain/media/books/catalog/book-cover-contribution.command";
import {createBooksIngestionService, createGBooksBooksProvider} from "@/lib/server/api-providers/gbooks-books.provider";
import {createBooksMatcher} from "@/lib/server/domain/media/books/imports/books.matcher";
import {CatalogRefreshIdentityQuery} from "@/lib/server/domain/media/shared/catalog/catalog-refresh-identity.query";
import {BookLibraryCsvExportQuery} from "@/lib/server/domain/media/books/library/book-library-csv-export.query";
import {BookStatsContributionQuery} from "@/lib/server/domain/media/books/library/book-stats-contribution.query";
import {LibraryStatsRebuildCommand} from "@/lib/server/domain/media/shared/library/library-stats-rebuild.command";
import {LibraryTagsQuery} from "@/lib/server/domain/media/shared/library/library-tags.query";
import {LibraryCustomCoverCommand} from "@/lib/server/domain/media/shared/library/library-custom-cover.command";
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {booksMyListsCSVRowSchema} from "@/lib/server/domain/imports/import-media.schemas";
import {booksAchievements} from "@/lib/server/domain/media/books/achievements/books.seed";
import {BookAchievementCalculator} from "@/lib/server/domain/media/books/achievements/book-achievement-calculator";
import {bookActivityDefinition} from "@/lib/utils/activity-utils";
import {CatalogActivityQuery} from "@/lib/server/domain/media/shared/activity/catalog-activity.query";


export const setupBookMediaModule = (
    apiClients: ApiClientModule,
) => {
    const libraryRepository = new BookLibraryRepository();
    const libraryCommands = new BookLibraryCommands(libraryRepository);
    const libraryRead = new BookLibraryReadRepository(libraryRepository);
    const catalogRepository = new BookCatalogIngestionRepository();
    const catalogCommands = new BookCatalogIngestionCommand(catalogRepository, libraryRepository, libraryCommands);
    const catalogRead = new BookCatalogReadRepository();
    const catalogAdmin = new BookCatalogAdminRepository();
    const external = createGBooksBooksProvider(apiClients.gBook);
    const ingestion = createBooksIngestionService(catalogCommands, external);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.BOOKS);
    const statsRead = new BookStatsReadRepository();
    const statsRebuild = new LibraryStatsRebuildCommand(MediaType.BOOKS, new BookStatsContributionQuery());
    const csvExport = new BookLibraryCsvExportQuery();
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
                csv: (userId: number) => csvExport.export(userId),
            },
            stats: {
                read: statsRead,
                rebuild: () => statsRebuild.rebuild(),
            },
            tags: {
                getNames: (userId: number) => tags.getNames(userId),
                edit: (params: Parameters<BookLibraryCommands["editTag"]>[0]) => libraryCommands.editTag(params),
            },
            covers: new LibraryCustomCoverCommand(MediaType.BOOKS, libraryRead, libraryCommands),
        },
        external,
        imports: {
            matcher: createBooksMatcher(catalogRepository, external, ingestion, libraryCommands),
            csv: {
                rowSchema: booksMyListsCSVRowSchema,
            },
        },
        achievements: {
            definitions: booksAchievements,
            calculator: new BookAchievementCalculator(),
        },
        activity: {
            definition: bookActivityDefinition,
            catalog: new CatalogActivityQuery(MediaType.BOOKS),
        },
    } as const;
};
