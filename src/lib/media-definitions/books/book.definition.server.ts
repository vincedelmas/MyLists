import {asc, desc, getTableColumns, like, ne, or, sql} from "drizzle-orm";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {BOOKS_FIXED_DURATION_MIN, booksDefinition} from "@/lib/media-definitions/books/books.definition";
import {bookEditions, books, booksAuthors, booksGenre, booksList, booksTags} from "@/lib/server/database/schema/media/books.schema";
import {defineAffinityDefinitions, defineServerMediaDefinition} from "@/lib/media-definitions/base/media.definition.server";
import {createArrayFilter, createListColOptionsLoader} from "@/lib/server/domain/media/base/media-list.queries";


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
            deleteDependents: [booksAuthors, booksGenre, booksTags, bookEditions],
        },
        listQuery: {
            selection: {
                mediaName: books.name,
                imageCover: books.imageCover,
                ...getTableColumns(booksList),
            },
            filters: {
                search: {
                    isActive: args => !!args.search,
                    getCondition: args => or(like(books.name, `%${args.search}%`), sql`EXISTS (
                        SELECT 1 FROM ${bookEditions} WHERE ${bookEditions.mediaId} = ${books.id} AND ${bookEditions.name} LIKE ${`%${args.search}%`}
                    )`),
                },
                langs: createArrayFilter({
                    argName: "langs",
                    mediaTable: books,
                    filterColumn: booksList.language,
                }),
                authors: createArrayFilter({
                    argName: "authors",
                    mediaTable: books,
                    entityTable: booksAuthors,
                    filterColumn: booksAuthors.name,
                }),
            },
            filterOptions: {
                langs: createListColOptionsLoader({
                    listTable: booksList,
                    nameColumn: booksList.language,
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
                "Pages +": [desc(booksList.pages), asc(books.name)],
                "Pages -": [asc(booksList.pages), asc(books.name)],
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
        affinity: defineAffinityDefinitions(booksDefinition, {
            langsStats: {
                metricTable: booksList,
                metricIdCol: booksList.id,
                metricNameCol: booksList.language,
                mediaLinkCol: booksList.id,
                filters: [ne(booksList.status, Status.PLAN_TO_READ)],
            },
            publishersStats: {
                metricTable: booksList,
                metricIdCol: booksList.id,
                metricNameCol: booksList.publishers,
                mediaLinkCol: booksList.id,
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
        editableFields: [
            "name", "releaseDate", "synopsis",
            "lockStatus", "authors", "imageCover",
        ],
        progressTotals: (state) => ({
            totalRedo: state?.redo ?? 0,
            totalSpecific: state?.total ?? 0,
            timeSpent: (state?.total ?? 0) * BOOKS_FIXED_DURATION_MIN,
        }),
    },
    ingestion: {
        externalApiSource: ApiProviderType.BOOKS,
    },
    attribution: {
        name: "GoogleBooks",
        mediaUrl: "https://books.google.com/books?id=",
    },
});


export type BookServerDefinition = typeof booksServerDefinition;
