import type z from "zod";
import type {SQL} from "drizzle-orm";
import type {InferSelectModel} from "drizzle-orm";
import type {CoverType} from "@/lib/types/media-common.types";
import type {TopAffinityDefinition} from "@/lib/types/stats.types";
import type {MediaEditFieldByType} from "@/lib/schemas/media-details.schema";
import type {MyListsCSVImport} from "@/lib/server/domain/imports/mylists-format";
import type {MediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {MediaCategory, type ApiProviderType, type MediaType, type Status} from "@/lib/utils/enums";
import type {MediaSortColumns} from "@/lib/server/domain/media/base/media-sorting.queries";
import type {MediaFilterDefinitions} from "@/lib/server/domain/media/base/media-filters.queries";
import type {AnySQLiteColumn, AnySQLiteTable, SelectedFieldsFlat} from "drizzle-orm/sqlite-core";


type NotNullColumn<T> = AnySQLiteColumn<{ data: T; notNull: true }>;
type NullableColumn<T> = AnySQLiteColumn<{ data: T; notNull: false }>;


type MediaTableColumns = {
    id: NotNullColumn<number>;
    name: NotNullColumn<string>;
    addedAt: NullableColumn<string>;
    synopsis: NullableColumn<string>;
    imageCover: NotNullColumn<string>;
    voteCount?: NullableColumn<number>;
    voteAverage?: NullableColumn<number>;
    releaseDate: NullableColumn<string>;
    originalName?: NullableColumn<string>;
    collectionId?: NullableColumn<number>; // movies collection ids for example, not collections system ;)
    apiId: NotNullColumn<string | number>;
    lastApiUpdate: NullableColumn<string>;
};


type ListTableColumns = {
    id: NotNullColumn<number>;
    redo?: NotNullColumn<number>;
    userId: NotNullColumn<number>;
    status: NotNullColumn<Status>;
    rating: NullableColumn<number>;
    mediaId: NotNullColumn<number>;
    comment: NullableColumn<string>;
    addedAt: NullableColumn<string>;
    favorite: NotNullColumn<boolean>;
    lastUpdated: NullableColumn<string>;
    customTitle?: NotNullColumn<string>;
    customReleaseDate?: NullableColumn<string>;
    customCover: NullableColumn<string | null>;
    releaseNotificationsEnabled: NotNullColumn<boolean>;
};


type TagTableColumns = {
    tagId: NotNullColumn<number>;
    listId: NotNullColumn<number>;
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
};


type SortDefinitions = Record<string, SQL | [SQL, ...SQL[]]>;
type AffinityDefinitions = Record<string, TopAffinityDefinition>;


type SpecificAffinityKey<TDefinition extends Pick<MediaDefinition, "statistics">> = Exclude<
    TDefinition["statistics"]["affinities"][number]["key"],
    "genresStats"
>;


type BaseSelection = Omit<ListTableColumns, "redo"> & SelectedFieldsFlat & {
    redo?: NotNullColumn<number>;
    mediaName: NotNullColumn<string>;
    imageCover: NotNullColumn<string>;
};


type MediaCategoryDefinition = {
    matchExact?: boolean;
    sourceTable: AnySQLiteTable;
    getFilter?: (name: string) => SQL;
    mediaIdColumn: NotNullColumn<number>;
    nameColumn: NullableColumn<string> | NotNullColumn<string>;
    postProcess?: (results: { name: string | null }[]) => { name: string | null }[];
};


interface MediaRepositoryDefinition<
    TTables extends BaseMediaTables = BaseMediaTables,
    TSortDefinitions extends SortDefinitions = SortDefinitions,
    TSortColumns extends MediaSortColumns = MediaSortColumns,
    TSelection extends BaseSelection = BaseSelection,
> {
    readonly tables: TTables;
    readonly sortColumns: TSortColumns;
    readonly continuePreviewCondition?: SQL;
    readonly filters: MediaFilterDefinitions;
    readonly categories: Partial<Record<MediaCategory, MediaCategoryDefinition>>;
    readonly popularity?: {
        readonly eligibility: SQL;
    };
    readonly communityActivity: {
        readonly aggregates: Partial<Record<"totalRedo" | "totalSpecific" | "totalPlaytime", SQL<number>>>;
    };
    readonly listQuery: {
        readonly selection: TSelection;
        readonly sorts: TSortDefinitions;
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
    TMediaType extends MediaType = MediaType,
> {
    readonly editableFields: readonly MediaEditFieldByType[TMediaType][];
    readonly progressTotals: (state: InferSelectModel<TTables["listTable"]> | null, media: InferSelectModel<TTables["mediaTable"]>) => ProgressTotals;
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


export interface ServerMediaDefinition<
    TTables extends BaseMediaTables = BaseMediaTables,
    TSortDefinitions extends SortDefinitions = SortDefinitions,
    TAffinityDefinitions extends AffinityDefinitions = AffinityDefinitions,
    TMediaType extends MediaType = MediaType,
    TIngestion extends MediaIngestionPolicy = MediaIngestionPolicy,
    TSortColumns extends MediaSortColumns = MediaSortColumns,
    TSelection extends BaseSelection = BaseSelection,
    TCsvRowSchema extends z.ZodObject<{
        [K in keyof MyListsCSVImport]: z.ZodType<MyListsCSVImport[K]>
    }> = z.ZodObject<{ [K in keyof MyListsCSVImport]: z.ZodType<MyListsCSVImport[K]> }>,
> {
    readonly ingestion: TIngestion;
    readonly attribution: ProviderAttribution;
    readonly identity: MediaIdentity<TMediaType>;
    readonly service: MediaServicePolicy<TTables, TMediaType>;
    readonly statistics: MediaStatisticsDefinition<TAffinityDefinitions>;
    readonly repository: MediaRepositoryDefinition<TTables, TSortDefinitions, TSortColumns, TSelection>;
    readonly listImport: {
        readonly csvRowSchema: TCsvRowSchema;
        readonly optionalHeaders?: readonly string[];
        readonly validateCsvRow?: (row: z.output<TCsvRowSchema>, ctx: z.RefinementCtx) => void;
    };
}


export type AnyMediaRepositoryDefinition = {
    readonly tables: BaseMediaTables;
    readonly sortColumns: MediaSortColumns;
    readonly continuePreviewCondition?: SQL;
    readonly filters: MediaFilterDefinitions;
    readonly popularity?: { readonly eligibility: SQL };
    readonly categories: Partial<Record<MediaCategory, MediaCategoryDefinition>>;
    readonly communityActivity: {
        readonly aggregates: Partial<Record<"totalRedo" | "totalSpecific" | "totalPlaytime", SQL<number>>>;
    };
    readonly listQuery: {
        readonly defaultSort: string;
        readonly sorts: SortDefinitions;
        readonly selection: BaseSelection;
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


export type AnyServerMediaDefinition = {
    readonly identity: MediaIdentity;
    readonly ingestion: MediaIngestionPolicy;
    readonly attribution: ProviderAttribution;
    readonly repository: AnyMediaRepositoryDefinition;
    readonly statistics: AnyMediaStatisticsDefinition;
    readonly listImport: {
        readonly optionalHeaders?: readonly string[];
        readonly validateCsvRow?: (row: any, ctx: z.RefinementCtx) => void;
        readonly csvRowSchema: z.ZodObject<{ [K in keyof MyListsCSVImport]: z.ZodType<MyListsCSVImport[K]> }>;
    };
    readonly service: {
        readonly editableFields: readonly MediaEditFieldByType[MediaType][];
        readonly progressTotals: (state: any | null, media: any) => ProgressTotals;
    };
};


export const defineServerMediaDefinition = <
    const TTables extends BaseMediaTables,
    const TSortDefinitions extends SortDefinitions,
    const TAffinityDefinitions extends AffinityDefinitions,
    const TMediaType extends MediaType,
    const TIngestion extends MediaIngestionPolicy,
    const TSortColumns extends MediaSortColumns,
    const TSelection extends BaseSelection,
    const TCsvRowSchema extends z.ZodObject<{ [K in keyof MyListsCSVImport]: z.ZodType<MyListsCSVImport[K]> }>,
>(definition: ServerMediaDefinition<
    TTables, TSortDefinitions, TAffinityDefinitions, TMediaType, TIngestion, TSortColumns, TSelection, TCsvRowSchema
>) => {
    return {
        ...definition,
        repository: {
            ...definition.repository,
            categories: {
                [MediaCategory.GENRE]: {
                    matchExact: true,
                    sourceTable: definition.repository.tables.genreTable,
                    nameColumn: definition.repository.tables.genreTable.name,
                    mediaIdColumn: definition.repository.tables.genreTable.mediaId,
                },
                ...definition.repository.categories,
            },
        },
    };
}


export const defineAffinityDefinitions = <const TDefinition extends Pick<MediaDefinition, "statistics">>(
    _definition: TDefinition,
    affinities: Readonly<Record<SpecificAffinityKey<TDefinition>, TopAffinityDefinition>>,
) => affinities;
