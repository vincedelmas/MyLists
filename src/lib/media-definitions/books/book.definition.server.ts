import {getTableColumns, ne, not, sql} from "drizzle-orm";
import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {ApiProviderType, MediaCategory, MediaType, Status} from "@/lib/utils/enums";
import {booksMyListsCSVRowSchema} from "@/lib/server/domain/media/books/books.types";
import {defineMediaFilterDefinitions} from "@/lib/server/domain/media/base/media-filters.queries";
import {BOOKS_FIXED_DURATION_MIN, booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {createMediaListSorts, getCommonMediaSortColumns} from "@/lib/server/domain/media/base/media-sorting.queries";
import {books, booksAuthors, booksGenre, booksList, booksTags} from "@/lib/server/database/schema/media/books.schema";
import {defineAffinityDefinitions, defineServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";


export const MANUAL_BOOK_ID_PREFIX = "manual:";


export const isManualBookId = (apiId: string | number) => {
    return typeof apiId === "string" && apiId.startsWith(MANUAL_BOOK_ID_PREFIX);
}


const tables = {
    mediaTable: books,
    listTable: booksList,
    genreTable: booksGenre,
    tagTable: booksTags,
};


const sortColumns = {
    ...getCommonMediaSortColumns(tables),
    redo: booksList.redo,
    pages: sql`COALESCE(${booksList.customPages}, ${books.pages})`,
    title: sql`COALESCE(${booksList.customTitle}, ${books.name}) COLLATE NOCASE`,
    releaseDate: sql`JULIANDAY(CASE WHEN ${booksList.id} IS NOT NULL THEN ${booksList.customReleaseDate} ELSE ${books.releaseDate} END)`,
};


export const booksServerDefinition = defineServerMediaDefinition({
    listImport: {
        csvRowSchema: booksMyListsCSVRowSchema,
        optionalHeaders: ["customTitle", "customPages", "customPublisher", "customReleaseDate", "customLanguage"],
    },
    identity: {
        mediaType: MediaType.BOOKS,
        coverDirectory: "books-covers",
    },
    repository: {
        sortColumns,
        continuePreviewCondition: not(sql`COALESCE(${booksList.customPages} > 0 AND COALESCE(${booksList.actualPage}, 0) = ${booksList.customPages}, 0)`),
        filters: defineMediaFilterDefinitions(booksDefinition, tables, {
            langs: {
                optionsTable: booksList,
                filterColumn: booksList.customLanguage,
            },
            authors: {
                searchable: true,
                entityTable: booksAuthors,
                filterColumn: booksAuthors.name,
            },
        }),
        tables,
        listQuery: {
            selection: {
                pages: booksList.customPages,
                imageCover: books.imageCover,
                mediaName: booksList.customTitle,
                ...getTableColumns(booksList),
            },
            defaultSort: getMediaSortLabel(booksDefinition, booksDefinition.sorting.default),
            sorts: createMediaListSorts(booksDefinition, sortColumns, books.id),
        },
        communityActivity: {
            aggregates: {
                totalRedo: sql<number>`COALESCE(SUM(${booksList.redo}), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${booksList.total}), 0)`,
            },
        },
        categories: {
            [MediaCategory.CREATOR]: {
                sourceTable: booksAuthors,
                nameColumn: booksAuthors.name,
                mediaIdColumn: booksAuthors.mediaId,
            },
        },
    },
    statistics: {
        allUsers: {
            totalSpecific: sql<number>`COALESCE(SUM(${booksList.total}), 0)`,
            timeSpent: sql<number>`COALESCE(SUM(${booksList.total} * ${BOOKS_FIXED_DURATION_MIN}), 0)`,
        },
        affinity: defineAffinityDefinitions(booksDefinition, {
            langsStats: {
                metricIdCol: books.id,
                metricTable: booksList,
                mediaLinkCol: booksList.mediaId,
                metricNameCol: booksList.customLanguage,
                filters: [ne(booksList.status, Status.PLANNED)],
            },
            publishersStats: {
                metricIdCol: books.id,
                metricTable: booksList,
                mediaLinkCol: booksList.mediaId,
                metricNameCol: booksList.customPublisher,
                filters: [ne(booksList.status, Status.PLANNED)],
            },
            authorsStats: {
                metricTable: booksAuthors,
                mediaLinkCol: booksList.mediaId,
                metricNameCol: booksAuthors.name,
                metricIdCol: booksAuthors.mediaId,
                filters: [ne(booksList.status, Status.PLANNED)],
            },
        }),
    },
    service: {
        editableFields: ["name", "releaseDate", "pages", "language", "publishers", "synopsis", "lockStatus", "authors", "imageCover"],
        progressTotals: (state) => ({
            totalRedo: state?.redo ?? 0,
            totalSpecific: state?.total ?? 0,
            timeSpent: (state?.total ?? 0) * BOOKS_FIXED_DURATION_MIN,
        }),
    },
    ingestion: {
        defaultPages: 250,
        externalApiSource: ApiProviderType.BOOKS,
    },
    attribution: {
        name: "GoogleBooks",
        mediaUrl: "https://books.google.com/books?id=",
    },
});


export type BookServerDefinition = typeof booksServerDefinition;
