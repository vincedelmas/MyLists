import {asc, desc, getTableColumns, ne, sql} from "drizzle-orm";
import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {createArrayFilter} from "@/lib/server/domain/media/base/media-list.query";
import {defineMediaDefinition} from "@/lib/server/domain/media/base/media-definition";
import {manga, mangaAuthors, mangaGenre, mangaList, mangaTags} from "@/lib/server/database/schema/media/manga.schema";


const MANGA_READING_MINUTES_PER_CHAPTER = 7;


export const mangaDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.MANGA,
        coverDirectory: "manga-covers",
    },
    repository: {
        tables: {
            mediaTable: manga,
            listTable: mangaList,
            genreTable: mangaGenre,
            tagTable: mangaTags,
            deleteDependents: [mangaAuthors, mangaGenre, mangaTags],
        },
        popularity: {
            eligibility: sql`${manga.voteCount} >= 5000`,
        },
        listQuery: {
            selection: {
                mediaName: manga.name,
                chapters: manga.chapters,
                imageCover: manga.imageCover,
                ...getTableColumns(mangaList),
            },
            filters: {
                authors: createArrayFilter({
                    argName: "authors",
                    mediaTable: manga,
                    entityTable: mangaAuthors,
                    filterColumn: mangaAuthors.name,
                }),
                publishers: createArrayFilter({
                    argName: "publishers",
                    mediaTable: manga,
                    filterColumn: manga.publishers,
                }),
            },
            filterOptions: {},
            defaultSort: "Title A-Z",
            sorts: {
                "Title A-Z": asc(manga.name),
                "Title Z-A": desc(manga.name),
                "Rating +": [desc(mangaList.rating), asc(manga.name)],
                "Rating -": [asc(mangaList.rating), asc(manga.name)],
                "Published Date +": [desc(manga.releaseDate), asc(manga.name)],
                "Published Date -": [sql`${manga.releaseDate} ASC NULLS LAST`, asc(manga.name)],
                "Recently Added": [desc(mangaList.addedAt), asc(manga.name)],
                "Recently Modified": [desc(mangaList.lastUpdated), asc(manga.name)],
                "Re-Read": [desc(mangaList.redo), asc(manga.name)],
                "Chapters +": [desc(manga.chapters), asc(manga.name)],
                "Chapters -": [asc(manga.chapters), asc(manga.name)],
            },
        },
        stats: {
            community: {
                totalRedo: sql<number>`COALESCE(SUM(${mangaList.redo}), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${mangaList.total}), 0)`,
            },
            allUsers: {
                timeSpent: sql<number>`COALESCE(SUM(${mangaList.total} * ${MANGA_READING_MINUTES_PER_CHAPTER}), 0)`,
                totalSpecific: sql<number>`COALESCE(SUM(${mangaList.total}), 0)`,
            },
            affinity: {
                publishersStats: {
                    metricTable: manga,
                    metricNameCol: manga.publishers,
                    metricIdCol: manga.id,
                    mediaLinkCol: mangaList.mediaId,
                    filters: [ne(mangaList.status, Status.PLAN_TO_READ)],
                },
                authorsStats: {
                    metricTable: mangaAuthors,
                    metricNameCol: mangaAuthors.name,
                    metricIdCol: mangaAuthors.mediaId,
                    mediaLinkCol: mangaList.mediaId,
                    filters: [ne(mangaList.status, Status.PLAN_TO_READ)],
                },
            },
        },
        jobs: {
            [JobType.CREATOR]: {
                sourceTable: mangaAuthors,
                nameColumn: mangaAuthors.name,
                mediaIdColumn: mangaAuthors.mediaId,
            },
            [JobType.PUBLISHER]: {
                sourceTable: manga,
                mediaIdColumn: manga.id,
                nameColumn: manga.publishers,
            },
        },
    },
    service: {
        defaultStatus: Status.PLAN_TO_READ,
        editableFields: ["name", "releaseDate", "chapters", "publishers", "synopsis", "lockStatus"],
        progressTotals: (state) => ({
            totalRedo: state?.redo ?? 0,
            totalSpecific: state?.total ?? 0,
            timeSpent: (state?.total ?? 0) * MANGA_READING_MINUTES_PER_CHAPTER,
        }),
    },
    ingestion: {
        externalApiSource: ApiProviderType.MANGA,
        limits: {
            authors: 2,
        },
        refresh: {
            staleAfterDays: 6,
            activeProdStatuses: ["Publishing", "On Hiatus"],
        },
    },
    attribution: {
        name: "MyAnimeList",
        mediaUrl: "https://myanimelist.net/manga/",
    },
});


export type MangaDefinition = typeof mangaDefinition;
