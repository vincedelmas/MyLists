import {asc, desc, getTableColumns, ne, sql} from "drizzle-orm";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {BOOKS_FIXED_DURATION_MIN} from "@/lib/media-definitions/books/books.definition";
import {defineServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {createArrayFilter, createMediaColOptionsLoader} from "@/lib/server/domain/media/base/media-list.query";
import {books, booksAuthors, booksGenre, booksList, booksTags} from "@/lib/server/database/schema/media/books.schema";


export const booksServerDefinition = defineServerMediaDefinition({
    identity: {
        mediaType: MediaType.BOOKS,
        coverDirectory: "books-covers",
    },
    repository: {
        tables: {
            mediaTable: books,
            listTable: booksList,
            genreTable: booksGenre,
            tagTable: booksTags,
            deleteDependents: [booksAuthors, booksGenre, booksTags],
        },
        listQuery: {
            selection: {
                pages: books.pages,
                mediaName: books.name,
                imageCover: books.imageCover,
                ...getTableColumns(booksList),
            },
            filters: {
                langs: createArrayFilter({
                    argName: "langs",
                    mediaTable: books,
                    filterColumn: books.language,
                }),
                authors: createArrayFilter({
                    argName: "authors",
                    mediaTable: books,
                    entityTable: booksAuthors,
                    filterColumn: booksAuthors.name,
                }),
            },
            filterOptions: {
                langs: createMediaColOptionsLoader({
                    mediaTable: books,
                    listTable: booksList,
                    nameColumn: books.language,
                }),
            },
            defaultSort: "Title A-Z",
            sorts: {
                "Title A-Z": asc(books.name),
                "Title Z-A": desc(books.name),
                "Rating +": [desc(booksList.rating), asc(books.name)],
                "Rating -": [asc(booksList.rating), asc(books.name)],
                "Published Date +": [desc(books.releaseDate), asc(books.name)],
                "Published Date -": [sql`${books.releaseDate} ASC NULLS LAST`, asc(books.name)],
                "Recently Added": [desc(booksList.addedAt), asc(books.name)],
                "Recently Modified": [desc(booksList.lastUpdated), asc(books.name)],
                "Re-Read": [desc(booksList.redo), asc(books.name)],
                "Pages +": [desc(books.pages), asc(books.name)],
                "Pages -": [asc(books.pages), asc(books.name)],
            },
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
        affinity: {
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
        },
    },
    service: {
        defaultStatus: Status.PLAN_TO_READ,
        editableFields: ["name", "releaseDate", "pages", "language", "publishers", "synopsis", "lockStatus"],
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
