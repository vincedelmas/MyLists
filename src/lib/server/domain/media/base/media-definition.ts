import type {SQL} from "drizzle-orm";
import type {CoverType} from "@/lib/types/media-common.types";
import type {TopAffinityDefinition} from "@/lib/types/stats.types";
import type {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
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


type ProgressTotals = {
    timeSpent: number;
    totalRedo: number;
    totalSpecific: number;
};


type MediaTable = AnySQLiteTable & MediaTableColumns;
type ListTable = AnySQLiteTable & ListTableColumns;
type GenreTable = AnySQLiteTable & RelatedEntityTableColumns;
type TagTable = AnySQLiteTable & TagTableColumns;


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


interface MediaRepositoryDefinition<
    TTables extends BaseMediaTables = BaseMediaTables,
    TSortDefinitions extends SortDefinitions = SortDefinitions,
> {
    readonly tables: TTables;
    readonly jobs: Partial<Record<JobType, JobDefinition>>;
    readonly popularity?: {
        readonly eligibility: SQL;
    };
    readonly communityActivity: {
        readonly aggregates: Partial<Record<"totalRedo" | "totalSpecific" | "totalPlaytime", SQL<number>>>;
    };
    readonly listQuery: {
        readonly sorts: TSortDefinitions;
        readonly selection: BaseSelection;
        readonly filters: FilterDefinitions;
        readonly filterOptions: FilterOptionLoaders;
        readonly defaultSort: NoInfer<Extract<keyof TSortDefinitions, string>>;
    };
}


interface MediaStatisticsDefinition<TAffinityDefinitions extends AffinityDefinitions = AffinityDefinitions> {
    readonly affinity: TAffinityDefinitions;
    readonly allUsers: {
        readonly timeSpent: SQL<number>;
        readonly totalSpecific: SQL<number>;
        readonly totalRedo?: SQL<number>;
    };
}


interface MediaServicePolicy<
    TTables extends BaseMediaTables = BaseMediaTables,
> {
    readonly defaultStatus: Status;
    readonly editableFields: readonly (keyof TTables["mediaTable"]["$inferSelect"] & string)[];
    readonly progressTotals: (state: TTables["listTable"]["$inferSelect"] | null, media: TTables["mediaTable"]["$inferSelect"]) => ProgressTotals;
}


type MediaIdentity<TMediaType extends MediaType = MediaType> = {
    readonly mediaType: TMediaType;
    readonly coverDirectory: Extract<CoverType, `${TMediaType}-covers`>;
};


export type MediaIngestionPolicy = {
    readonly externalApiSource: ApiProviderType;
    readonly defaultPages?: number;
    readonly defaultDuration?: number;
    readonly limits?: {
        readonly genres?: number;
        readonly actors?: number;
        readonly writers?: number;
        readonly authors?: number;
        readonly networks?: number;
    };
    readonly refresh?: {
        readonly chunkSize?: number;
        readonly staleAfterDays?: number;
        readonly lockAfterMonths?: number;
        readonly releaseGraceMonths?: number;
        readonly activeProdStatuses?: readonly string[];
    };
};


type ProviderAttribution = {
    readonly name: string;
    readonly mediaUrl?: string;
};


export interface MediaDefinition<
    TTables extends BaseMediaTables = BaseMediaTables,
    TSortDefinitions extends SortDefinitions = SortDefinitions,
    TAffinityDefinitions extends AffinityDefinitions = AffinityDefinitions,
    TMediaType extends MediaType = MediaType,
    TIngestion extends MediaIngestionPolicy = MediaIngestionPolicy,
> {
    readonly ingestion: TIngestion;
    readonly attribution: ProviderAttribution;
    readonly identity: MediaIdentity<TMediaType>;
    readonly service: MediaServicePolicy<TTables>;
    readonly statistics: MediaStatisticsDefinition<TAffinityDefinitions>;
    readonly repository: MediaRepositoryDefinition<TTables, TSortDefinitions>;
}


export type AnyMediaRepositoryDefinition = {
    readonly tables: BaseMediaTables;
    readonly popularity?: { readonly eligibility: SQL };
    readonly jobs: Partial<Record<JobType, JobDefinition>>;
    readonly communityActivity: {
        readonly aggregates: Partial<Record<"totalRedo" | "totalSpecific" | "totalPlaytime", SQL<number>>>;
    };
    readonly listQuery: {
        readonly defaultSort: string;
        readonly sorts: SortDefinitions;
        readonly selection: BaseSelection;
        readonly filters: FilterDefinitions;
        readonly filterOptions: FilterOptionLoaders;
    };
};


type AnyMediaStatisticsDefinition = {
    readonly affinity: AffinityDefinitions;
    readonly allUsers: {
        readonly timeSpent: SQL<number>;
        readonly totalSpecific: SQL<number>;
        readonly totalRedo?: SQL<number>;
    };
};


export type AnyMediaDefinition = {
    readonly identity: MediaIdentity;
    readonly ingestion: MediaIngestionPolicy;
    readonly attribution: ProviderAttribution;
    readonly repository: AnyMediaRepositoryDefinition;
    readonly statistics: AnyMediaStatisticsDefinition;
    readonly service: {
        readonly defaultStatus: Status;
        readonly editableFields: readonly string[];
        readonly progressTotals: (state: any | null, media: any) => ProgressTotals;
    };
};


export const defineMediaDefinition = <
    const TTables extends BaseMediaTables,
    const TSortDefinitions extends SortDefinitions,
    const TAffinityDefinitions extends AffinityDefinitions,
    const TMediaType extends MediaType,
    const TIngestion extends MediaIngestionPolicy,
>(definition: MediaDefinition<TTables, TSortDefinitions, TAffinityDefinitions, TMediaType, TIngestion>) => {
    return definition;
}
