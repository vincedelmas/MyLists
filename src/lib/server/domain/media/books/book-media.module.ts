import {MediaType} from "@/lib/utils/enums";
import {GBooksApi} from "@/lib/server/api-providers/api";
import {BookLibraryService} from "@/lib/server/domain/media/books/library/book-library.service";
import {BookLibraryRepository} from "@/lib/server/domain/media/books/library/book-library.repository";
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
import {createCatalogMaintenance} from "@/lib/server/domain/media/shared/catalog/catalog-maintenance";
import {booksMyListsCSVRowSchema} from "@/lib/server/domain/media/books/imports/book-import.schemas";
import {booksAchievements} from "@/lib/server/domain/media/books/achievements/books.seed";
import {BookAchievementCalculator} from "@/lib/server/domain/media/books/achievements/book-achievement-calculator";
import type {AchievementCalculator} from "@/lib/server/domain/media/shared/achievements/media-achievement-calculator";
import {bookActivityDefinition} from "@/lib/server/domain/media/books/activity/book-activity.definition";
import {CommonLibraryRepository} from "@/lib/server/domain/media/shared/library/common-library.repository";
import {CommonLibraryService} from "@/lib/server/domain/media/shared/library/common-library.service";


export const setupBookMediaModule = (
    gBooks: GBooksApi,
) => {
    const commonLibraryRepository = new CommonLibraryRepository(MediaType.BOOKS);
    const libraryRepository = new BookLibraryRepository(commonLibraryRepository);
    const library = new BookLibraryService(
        libraryRepository,
        new CommonLibraryService(commonLibraryRepository),
    );
    const catalogRepository = new BookCatalogIngestionRepository();
    const catalogCommands = new BookCatalogIngestionCommand(catalogRepository, library);
    const catalogRead = new BookCatalogReadRepository();
    const catalogAdmin = new BookCatalogAdminRepository();
    const external = createGBooksBooksProvider(gBooks);
    const ingestion = createBooksIngestionService(catalogCommands, external);
    const refreshIdentity = new CatalogRefreshIdentityQuery(MediaType.BOOKS);

    return {
        kind: MediaType.BOOKS,
        catalog: {
            details: new BookDetailsQuery(catalogRead, library),
            read: catalogRead,
            admin: catalogAdmin,
            edit: new BookCatalogEditCommand(catalogAdmin, library),
            ingestion,
            contributeCover: new BookCoverContributionCommand(catalogAdmin),
            refresh: {
                identity: refreshIdentity,
                selfServiceAllowed: false,
            },
            maintenance: createCatalogMaintenance(MediaType.BOOKS),
        },
        library,
        external,
        contributions: {
            imports: {
                matcher: createBooksMatcher(catalogRepository, external, ingestion, library),
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
