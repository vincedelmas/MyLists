import {SQL, Table} from "drizzle-orm";
import {AnySQLiteColumn} from "drizzle-orm/sqlite-core";
import {JobType, MediaType, Status} from "@/lib/utils/enums";
import {FilterDefinitions} from "@/lib/types/media-list.types";
import {AchievementSeedData} from "@/lib/types/achievements.types";


type NotNullColumn<T> = AnySQLiteColumn<{ data: T; notNull: true }>;
type NullableColumn<T> = AnySQLiteColumn<{ data: T; notNull: false }>;


type MediaTableColumns = {
    id: NotNullColumn<number>;
    name: NotNullColumn<string>;
    imageCover: NotNullColumn<string>;
    apiId: NotNullColumn<string | number>;
    addedAt: NullableColumn<string>;
    synopsis: NullableColumn<string>;
    releaseDate: NullableColumn<string>;
    lastApiUpdate: NullableColumn<string>;
};


type ListTableColumns = {
    id: NotNullColumn<number>;
    userId: NotNullColumn<number>;
    status: NotNullColumn<Status>;
    rating: NullableColumn<number>;
    mediaId: NotNullColumn<number>;
    comment: NullableColumn<string>;
    addedAt: NullableColumn<string>;
    favorite: NullableColumn<boolean>;
    lastUpdated: NullableColumn<string>;
    customCover: NullableColumn<string | null>;
    redo?: NotNullColumn<number>;
}


type TagTableColumns = {
    id: NotNullColumn<number>;
    name: NotNullColumn<string>;
    userId: NotNullColumn<number>;
    mediaId: NullableColumn<number>;
}


type GenreTableColumns = {
    id: NotNullColumn<number>;
    name: NotNullColumn<string>;
    mediaId: NotNullColumn<number>;
}


type JobDefinition = {
    sourceTable: Table,
    mediaIdColumn: NotNullColumn<number>;
    getFilter?: (name: string) => SQL | undefined;
    nameColumn: NullableColumn<string> | NotNullColumn<string>;
    postProcess?: (results: { name: string | null }[]) => { name: string | null }[];
}


type BaseSelection<TListTable, TMediaTable> = {
    [K in keyof TListTable]: AnySQLiteColumn
} | {
    [K in keyof TMediaTable]: AnySQLiteColumn
} | {
    mediaName: AnySQLiteColumn,
    epsPerSeason?: SQL,
}


type TagTable = Table & TagTableColumns;
type ListTable = Table & ListTableColumns;
type GenreTable = Table & GenreTableColumns;
export type MediaTable = Table & MediaTableColumns;


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
    tablesForDeletion: (Table & { mediaId: NotNullColumn<number> | NullableColumn<number> })[];
}


type TvMediaTableColumns = {
    nextEpisodeToAir: NullableColumn<string>;
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
