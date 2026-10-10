import {getTableColumns, ne, sql} from "drizzle-orm";
import {getMediaSortLabel} from "@/lib/utils/media/sorting";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {BOOKS_FIXED_DURATION_MIN, booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {createMediaListSorts, getCommonMediaSortColumns} from "@/lib/server/domain/media/base/media-sorting.queries";
import {books, booksAuthors, booksGenre, booksList, booksTags} from "@/lib/server/database/schema/media/books.schema";
import {defineAffinityDefinitions, defineServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {defineMediaFilterDefinitions} from "@/lib/server/domain/media/base/media-filters.queries";


const tables = {
    mediaTable: books,
    listTable: booksList,
    genreTable: booksGenre,
    tagTable: booksTags,
    deleteDependents: [booksAuthors, booksGenre, booksTags],
};


const sortColumns = {
    ...getCommonMediaSortColumns(tables),
    redo: booksList.redo,
    pages: books.pages,
};


export const booksServerDefinition = defineServerMediaDefinition({
    identity: {
        mediaType: MediaType.BOOKS,
        coverDirectory: "books-covers",
    },
    repository: {
        sortColumns,
        filters: defineMediaFilterDefinitions(booksDefinition, tables, {
            langs: {
                filterColumn: books.language,
            },
            authors: {
                entityTable: booksAuthors,
                filterColumn: booksAuthors.name,
            },
        }),
        tables,
        listQuery: {
            selection: {
                pages: books.pages,
                mediaName: books.name,
                imageCover: books.imageCover,
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
        jobs: {
            [JobType.CREATOR]: {
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
                metricTable: books,
                metricIdCol: books.id,
                metricNameCol: books.language,
                mediaLinkCol: booksList.mediaId,
                filters: [ne(booksList.status, Status.PLAN_TO_READ)],
            },
            publishersStats: {
                metricTable: books,
                metricIdCol: books.id,
                metricNameCol: books.publishers,
                mediaLinkCol: booksList.mediaId,
                filters: [ne(booksList.status, Status.PLAN_TO_READ)],
            },
            authorsStats: {
                metricTable: booksAuthors,
                mediaLinkCol: booksList.mediaId,
                metricNameCol: booksAuthors.name,
                metricIdCol: booksAuthors.mediaId,
                filters: [ne(booksList.status, Status.PLAN_TO_READ)],
            },
        }),
    },
    service: {
        defaultStatus: Status.PLAN_TO_READ,
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
