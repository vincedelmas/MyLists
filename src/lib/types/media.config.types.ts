import type {SQL} from "drizzle-orm";
import type {AnySQLiteColumn, AnySQLiteTable, SelectedFieldsFlat,} from "drizzle-orm/sqlite-core";
import type {AchievementSeedData} from "@/lib/types/achievements.types";
import type {FilterDefinitions} from "@/lib/types/media-list.types";
import type {JobType, MediaType, Status} from "@/lib/utils/enums";


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
};


type TagTableColumns = {
    id: NotNullColumn<number>;
    name: NotNullColumn<string>;
    userId: NotNullColumn<number>;
    mediaId: NullableColumn<number>;
};


type RelatedEntityTableColumns = {
    id: NotNullColumn<number>;
    name: NotNullColumn<string>;
    mediaId: NotNullColumn<number>;
};


type EpsPerSeasonTableColumns = {
    id: NotNullColumn<number>;
    mediaId: NotNullColumn<number>;
    season: NotNullColumn<number>;
    episodes: NotNullColumn<number>;
};


type JobDefinition = {
    sourceTable: AnySQLiteTable;
    mediaIdColumn: NotNullColumn<number>;
    getFilter?: (name: string) => SQL | undefined;
    nameColumn: NullableColumn<string> | NotNullColumn<string>;
    postProcess?: (results: { name: string | null }[]) => { name: string | null }[];
};


type SortDefinitions = Record<string, SQL | [SQL, ...SQL[]]>;


type BaseSelection = Omit<ListTableColumns, "redo"> & SelectedFieldsFlat & {
    mediaName: NotNullColumn<string>;
    imageCover: NotNullColumn<string>;
    redo?: NotNullColumn<number>;
};


type TagTable = AnySQLiteTable & TagTableColumns;
type ListTable = AnySQLiteTable & ListTableColumns;
type GenreTable = AnySQLiteTable & RelatedEntityTableColumns;
type EpsPerSeasonTable = AnySQLiteTable & EpsPerSeasonTableColumns;
export type MediaTable = AnySQLiteTable & MediaTableColumns;


export interface MediaSchemaConfig<
    TMediaTable extends MediaTable = MediaTable,
    TListTable extends ListTable = ListTable,
    TGenreTable extends GenreTable = GenreTable,
    TTagTable extends TagTable = TagTable,
    TSortDefinitions extends SortDefinitions = SortDefinitions,
    TMediaType extends MediaType = MediaType,
> {
    readonly mediaTable: TMediaTable;
    readonly listTable: TListTable;
    readonly genreTable: TGenreTable;
    readonly tagTable: TTagTable;
    readonly mediaType: TMediaType;
    readonly popularity?: {
        readonly eligibility: SQL;
    };
    readonly mediaList: {
        readonly defaultStatus: Status;
        readonly baseSelection: BaseSelection;
        readonly availableSorts: TSortDefinitions;
        readonly filterDefinitions: FilterDefinitions;
        readonly defaultSortName: NoInfer<Extract<keyof TSortDefinitions, string>>;
    };
    readonly apiProvider: {
        readonly name: string;
        readonly maxGenres: number;
        readonly mediaUrl: string | null;
    };
    readonly tablesForDeletion: readonly (AnySQLiteTable & {
        mediaId: NotNullColumn<number> | NullableColumn<number>;
    })[];
    readonly jobDefinitions: Partial<Record<JobType, JobDefinition>>;
    readonly editableFields: readonly (keyof TMediaTable["$inferSelect"] & string)[];
    readonly achievements: readonly (AchievementSeedData & { mediaType: NoInfer<TMediaType> })[];
    readonly communityActivityStats: Partial<Record<"totalRedo" | "totalSpecific" | "totalPlaytime", SQL<number>>>;
}


export type AnyMediaSchemaConfig = Omit<MediaSchemaConfig, "editableFields"> & {
    readonly editableFields: readonly string[];
};


type TvMediaTableColumns = {
    nextEpisodeToAir: NullableColumn<string>;
};


export interface TvSchemaConfig<
    TMediaTable extends MediaTable & TvMediaTableColumns,
    TListTable extends ListTable,
    TGenreTable extends GenreTable,
    TTagTable extends TagTable,
    TActorTable extends GenreTable,
    TNetworkTable extends GenreTable,
    TEpsPerSeasonTable extends EpsPerSeasonTable,
    TSortDefinitions extends SortDefinitions = SortDefinitions,
    TMediaType extends MediaType = MediaType,
> extends MediaSchemaConfig<
    TMediaTable,
    TListTable,
    TGenreTable,
    TTagTable,
    TSortDefinitions,
    TMediaType
> {
    readonly actorTable: TActorTable;
    readonly networkTable: TNetworkTable;
    readonly epsPerSeasonTable: TEpsPerSeasonTable;
}


export const defineMediaSchemaConfig = <
    TMediaTable extends MediaTable,
    TListTable extends ListTable,
    TGenreTable extends GenreTable,
    TTagTable extends TagTable,
    const TSortDefinitions extends SortDefinitions,
    const TMediaType extends MediaType,
>(config: MediaSchemaConfig<
    TMediaTable,
    TListTable,
    TGenreTable,
    TTagTable,
    TSortDefinitions,
    TMediaType
>) => config;


export const defineTvSchemaConfig = <
    TMediaTable extends MediaTable & TvMediaTableColumns,
    TListTable extends ListTable,
    TGenreTable extends GenreTable,
    TTagTable extends TagTable,
    TActorTable extends GenreTable,
    TNetworkTable extends GenreTable,
    TEpsPerSeasonTable extends EpsPerSeasonTable,
    const TSortDefinitions extends SortDefinitions,
    const TMediaType extends MediaType,
>(config: TvSchemaConfig<
    TMediaTable,
    TListTable,
    TGenreTable,
    TTagTable,
    TActorTable,
    TNetworkTable,
    TEpsPerSeasonTable,
    TSortDefinitions,
    TMediaType
>) => config;
