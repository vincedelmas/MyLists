import {asc, desc, getTableColumns, sql} from "drizzle-orm";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {MediaSchemaConfig} from "@/lib/types/media.config.types";
import {createArrayFilterDef} from "@/lib/server/domain/media/base/base.repository";
import {mangaAchievements} from "@/lib/server/domain/media/manga/achievements.seed";
import {manga, mangaAuthors, mangaGenre, mangaList, mangaTags} from "@/lib/server/database/schema/media/manga.schema";


export type MangaSchemaConfig = MediaSchemaConfig<
    typeof manga,
    typeof mangaList,
    typeof mangaGenre,
    typeof mangaTags
>;


export const mangaConfig: MangaSchemaConfig = {
    mediaTable: manga,
    listTable: mangaList,
    genreTable: mangaGenre,
    tagTable: mangaTags,
    mediaType: MediaType.MANGA,
    mediaList: {
        baseSelection: {
            mediaName: manga.name,
            chapters: manga.chapters,
            imageCover: manga.imageCover,
            ...getTableColumns(mangaList),
        },
        filterDefinitions: {
            authors: createArrayFilterDef({
                argName: "authors",
                mediaTable: manga,
                entityTable: mangaAuthors,
                filterColumn: mangaAuthors.name,
            }),
            publishers: createArrayFilterDef({
                argName: "publishers",
                mediaTable: manga,
                filterColumn: manga.publishers,
            }),
        },
        defaultStatus: Status.PLAN_TO_READ,
        defaultSortName: "Title A-Z",
        availableSorts: {
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
    communityActivityStats: {
        totalRedo: sql<number>`COALESCE(SUM(${mangaList.redo}), 0)`,
        totalSpecific: sql<number>`COALESCE(SUM(${mangaList.total}), 0)`,
    },
    apiProvider: {
        maxGenres: 5,
        name: "MyAnimeList",
        mediaUrl: "https://myanimelist.net/manga/",
    },
    editableFields: ["name", "releaseDate", "chapters", "publishers", "synopsis", "lockStatus"],
    jobDefinitions: {
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
    tablesForDeletion: [mangaAuthors, mangaGenre, mangaTags],
    achievements: mangaAchievements,
};
