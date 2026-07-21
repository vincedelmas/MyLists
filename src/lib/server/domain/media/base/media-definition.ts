import type {SQL} from "drizzle-orm";
import type {CoverType} from "@/lib/types/media-common.types";
import type {JobType, MediaType, Status} from "@/lib/utils/enums";
import type {TopAffinityDefinition} from "@/lib/types/stats.types";
import type {AnySQLiteColumn, AnySQLiteTable, SelectedFieldsFlat} from "drizzle-orm/sqlite-core";
import type {FilterDefinitions, FilterOptionLoaders} from "@/lib/server/domain/media/base/media-list.query";


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
    season: NotNullColumn<number>;
    mediaId: NotNullColumn<number>;
    episodes: NotNullColumn<number>;
};


type TvMediaTableColumns = {
    nextEpisodeToAir: NullableColumn<string>;
};


type ProgressTotals = {
    timeSpent: number;
    totalRedo: number;
    totalSpecific: number;
};


export type MediaTable = AnySQLiteTable & MediaTableColumns;
export type ListTable = AnySQLiteTable & ListTableColumns;
export type GenreTable = AnySQLiteTable & RelatedEntityTableColumns;
export type TagTable = AnySQLiteTable & TagTableColumns;
export type EpsPerSeasonTable = AnySQLiteTable & EpsPerSeasonTableColumns;


export type BaseMediaTables<
    TMediaTable extends MediaTable = MediaTable,
    TListTable extends ListTable = ListTable,
    TGenreTable extends GenreTable = GenreTable,
    TTagTable extends TagTable = TagTable,
> = {
    mediaTable: TMediaTable;
    listTable: TListTable;
    genreTable: TGenreTable;
    tagTable: TTagTable;
    deleteDependents: readonly (AnySQLiteTable & { mediaId: NotNullColumn<number> | NullableColumn<number> })[];
};


export type TvMediaTables<
    TMediaTable extends MediaTable & TvMediaTableColumns = MediaTable & TvMediaTableColumns,
    TListTable extends ListTable = ListTable,
    TGenreTable extends GenreTable = GenreTable,
    TTagTable extends TagTable = TagTable,
    TActorTable extends GenreTable = GenreTable,
    TNetworkTable extends GenreTable = GenreTable,
    TEpsPerSeasonTable extends EpsPerSeasonTable = EpsPerSeasonTable,
> = BaseMediaTables<TMediaTable, TListTable, TGenreTable, TTagTable> & {
    actorsTable: TActorTable;
    networksTable: TNetworkTable;
    epsPerSeasonTable: TEpsPerSeasonTable;
};


type SortDefinitions = Record<string, SQL | [SQL, ...SQL[]]>;
type AffinityDefinitions = Record<string, TopAffinityDefinition>;


type BaseSelection = Omit<ListTableColumns, "redo"> & SelectedFieldsFlat & {
    mediaName: NotNullColumn<string>;
    imageCover: NotNullColumn<string>;
    redo?: NotNullColumn<number>;
};


type JobDefinition = {
    sourceTable: AnySQLiteTable;
    mediaIdColumn: NotNullColumn<number>;
    getFilter?: (name: string) => SQL | undefined;
    nameColumn: NullableColumn<string> | NotNullColumn<string>;
    postProcess?: (results: { name: string | null }[]) => { name: string | null }[];
};


export interface MediaRepositoryDefinition<
    TTables extends BaseMediaTables = BaseMediaTables,
    TSortDefinitions extends SortDefinitions = SortDefinitions,
    TAffinityDefinitions extends AffinityDefinitions = AffinityDefinitions,
    TMediaType extends MediaType = MediaType,
> {
    readonly mediaType: TMediaType;
    readonly tables: TTables;
    readonly popularity?: {
        readonly eligibility: SQL;
    };
    readonly listQuery: {
        readonly selection: BaseSelection;
        readonly sorts: TSortDefinitions;
        readonly filters: FilterDefinitions;
        readonly filterOptions: FilterOptionLoaders;
        readonly defaultSort: NoInfer<Extract<keyof TSortDefinitions, string>>;
    };
    readonly jobs: Partial<Record<JobType, JobDefinition>>;
    readonly stats: {
        readonly community: Partial<Record<"totalRedo" | "totalSpecific" | "totalPlaytime", SQL<number>>>;
        readonly allUsers: {
            readonly timeSpent: SQL<number>;
            readonly totalSpecific: SQL<number>;
            readonly totalRedo?: SQL<number>;
        };
        readonly affinity: TAffinityDefinitions;
    };
}


export interface MediaServicePolicy<
    TTables extends BaseMediaTables = BaseMediaTables,
    TMediaType extends MediaType = MediaType,
> {
    readonly mediaType: TMediaType;
    readonly coverDirectory: Extract<CoverType, `${MediaType}-covers`>;
    readonly defaultStatus: Status;
    readonly editableFields: readonly (keyof TTables["mediaTable"]["$inferSelect"] & string)[];
    readonly progressTotals: (state: TTables["listTable"]["$inferSelect"] | null, media: TTables["mediaTable"]["$inferSelect"]) => ProgressTotals;
}


export type ProviderAttribution = {
    readonly name: string;
    readonly mediaUrl: string | null;
};


export interface MediaDefinition<
    TTables extends BaseMediaTables = BaseMediaTables,
    TSortDefinitions extends SortDefinitions = SortDefinitions,
    TAffinityDefinitions extends AffinityDefinitions = AffinityDefinitions,
    TMediaType extends MediaType = MediaType,
> {
    readonly repository: MediaRepositoryDefinition<TTables, TSortDefinitions, TAffinityDefinitions, TMediaType>;
    readonly service: MediaServicePolicy<TTables, TMediaType>;
    readonly attribution: ProviderAttribution;
}


export type AnyMediaRepositoryDefinition = {
    readonly mediaType: MediaType;
    readonly tables: BaseMediaTables;
    readonly popularity?: { readonly eligibility: SQL };
    readonly listQuery: {
        readonly selection: BaseSelection;
        readonly sorts: SortDefinitions;
        readonly filters: FilterDefinitions;
        readonly filterOptions: FilterOptionLoaders;
        readonly defaultSort: string;
    };
    readonly jobs: Partial<Record<JobType, JobDefinition>>;
    readonly stats: {
        readonly community: Partial<Record<"totalRedo" | "totalSpecific" | "totalPlaytime", SQL<number>>>;
        readonly allUsers: {
            readonly timeSpent: SQL<number>;
            readonly totalSpecific: SQL<number>;
            readonly totalRedo?: SQL<number>;
        };
        readonly affinity: AffinityDefinitions;
    };
};


export type AnyMediaDefinition = {
    readonly repository: AnyMediaRepositoryDefinition;
    readonly service: {
        readonly mediaType: MediaType;
        readonly coverDirectory: Extract<CoverType, `${MediaType}-covers`>;
        readonly defaultStatus: Status;
        readonly editableFields: readonly string[];
        readonly progressTotals: (state: any | null, media: any) => ProgressTotals;
    };
    readonly attribution: ProviderAttribution;
};


export const defineMediaDefinition = <
    const TTables extends BaseMediaTables,
    const TSortDefinitions extends SortDefinitions,
    const TAffinityDefinitions extends AffinityDefinitions,
    const TMediaType extends MediaType,
>(definition: MediaDefinition<TTables, TSortDefinitions, TAffinityDefinitions, TMediaType>) => {
    return definition;
}
