import {Column, SQL, Table} from "drizzle-orm";
import {SQLiteColumn} from "drizzle-orm/sqlite-core";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {FilterDefinitions} from "@/lib/types/media-list.types";
import {AchievementSeedData} from "@/lib/types/achievements.types";


type MediaTableColumns = {
    id: Column<any, any, any>;
    name: Column<any, any, any>;
    apiId: Column<any, any, any>;
    addedAt: Column<any, any, any>;
    synopsis: Column<any, any, any>;
    imageCover: Column<any, any, any>;
    releaseDate: Column<any, any, any>;
    lastApiUpdate: Column<any, any, any>;
};


type ListTableColumns = {
    id: Column<any, any, any>;
    userId: Column<any, any, any>;
    mediaId: Column<any, any, any>;
    status: Column<any, any, any>;
    favorite: Column<any, any, any>;
    comment: Column<any, any, any>;
    rating: Column<any, any, any>;
    customCover: Column<any, any, any>;
    addedAt: Column<any, any, any>;
    lastUpdated: Column<any, any, any>;
    redo?: Column<any, any, any>;
}


type TagTableColumns = {
    id: Column<any, any, any>;
    name: Column<any, any, any>;
    userId: Column<any, any, any>;
    mediaId: Column<any, any, any>;
}


type GenreTableColumns = {
    id: Column<any, any, any>;
    name: Column<any, any, any>;
    mediaId: Column<any, any, any>;
}


type JobDefinition = {
    sourceTable: Table,
    nameColumn: Column<any, any, any>,
    mediaIdColumn: Column<any, any, any>,
    getFilter?: (name: string) => SQL | undefined;
    postProcess?: (results: { name: string | null }[]) => { name: string | null }[];
}


type BaseSelection<TListTable, TMediaTable> = {
    [K in keyof TListTable]: SQLiteColumn | SQL
} | {
    [K in keyof TMediaTable]: SQLiteColumn | SQL
} | {
    mediaName: SQLiteColumn | SQL,
    epsPerSeason?: SQLiteColumn | SQL,
}


export type ListTable = Table & ListTableColumns;
export type MediaTable = Table & MediaTableColumns;
export type GenreTable = Table & GenreTableColumns;
export type TagTable = Table & TagTableColumns;


export interface MediaSchemaConfig<
    TMediaTable extends MediaTable = MediaTable,
    TListTable extends ListTable = ListTable,
    TGenreTable extends GenreTable = GenreTable,
    TTagTable extends TagTable = TagTable,
> {
    mediaTable: TMediaTable,
    listTable: TListTable,
    genreTable: TGenreTable,
    tagTable: TTagTable,
    mediaType: MediaType,
    popularity?: {
        eligibility: SQL,
    },
    mediaList: {
        defaultStatus: Status;
        defaultSortName: string;
        filterDefinitions: FilterDefinitions;
        availableSorts: Record<string, SQL | SQL[]>;
        baseSelection: BaseSelection<TListTable, TMediaTable>;
    }
    communityActivityStats: Partial<Record<"totalRedo" | "totalSpecific" | "totalPlaytime", SQL<number>>>;
    apiProvider: {
        name: string,
        maxGenres: number,
        mediaUrl: string | null,
    }
    achievements: readonly AchievementSeedData[];
    jobDefinitions: Partial<Record<JobType, JobDefinition>>;
    editableFields: Array<keyof TMediaTable["$inferSelect"]>;
    tablesForDeletion: (Table & { mediaId: Column<any, any, any> })[];
}


type TvMediaTableColumns = {
    nextEpisodeToAir: Column<any, any, any>;
}


export interface TvSchemaConfig<
    TMediaTable extends MediaTable & TvMediaTableColumns,
    TListTable extends ListTable,
    TGenreTable extends GenreTable,
    TTagTable extends TagTable,
    TActorTable extends Table,
    TNetworkTable extends Table,
    TEpsPerSeasonTable extends Table,
> extends MediaSchemaConfig<TMediaTable, TListTable, TGenreTable, TTagTable> {
    actorTable: TActorTable;
    networkTable: TNetworkTable;
    epsPerSeasonTable: TEpsPerSeasonTable;
}
