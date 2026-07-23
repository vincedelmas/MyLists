import type {SQL} from "drizzle-orm";
import type {TvStatistics} from "@/lib/server/domain/media/tv";
import type {MangaStatistics} from "@/lib/server/domain/media/manga";
import type {GamesStatistics} from "@/lib/server/domain/media/games";
import type {BooksStatistics} from "@/lib/server/domain/media/books";
import type {MoviesStatistics} from "@/lib/server/domain/media/movies";
import type {SQLiteColumn, SQLiteTable} from "drizzle-orm/sqlite-core";
import type {MediaType, RatingSystemType, Status} from "@/lib/utils/enums";
import type {UserMonthlyActivityService, UserStatsRepository, UserStatsService, UserUpdatesRepository} from "@/lib/server/domain/user";


export type DeltaStats = {
    views?: number;
    timeSpent?: number;
    totalRedo?: number;
    totalEntries?: number;
    entriesRated?: number;
    totalSpecific?: number;
    sumEntriesRated?: number;
    entriesCommented?: number;
    entriesFavorites?: number;
    statusCounts?: Partial<Record<Status, number>>;
};


export type TopAffinityDefinition = {
    limit?: number,
    filters: SQL[],
    minRatingCount?: number,
    metricTable: SQLiteTable,
    metricIdCol: SQLiteColumn,
    mediaLinkCol: SQLiteColumn,
    metricNameCol: SQLiteColumn,
}


type OtherBase = { activatedMediaTypes: MediaType[]; ratingSystem: RatingSystemType; };
type BaseMediaStats = Awaited<ReturnType<typeof UserStatsRepository.getAggregatedMediaStats>>;
type UpdatesStats = Awaited<ReturnType<typeof UserUpdatesRepository.mediaUpdatesStatsPerMonth>>;
type ActivityStats = { activityByMonth: Awaited<ReturnType<UserMonthlyActivityService["getActivityStatsByMonth"]>> };

type TvSpecificStats = Awaited<ReturnType<TvStatistics["calculateAdvancedMediaStats"]>>;
type MoviesSpecificStats = Awaited<ReturnType<MoviesStatistics["calculateAdvancedMediaStats"]>>;
type GamesSpecificStats = Awaited<ReturnType<GamesStatistics["calculateAdvancedMediaStats"]>>;
type BooksSpecificStats = Awaited<ReturnType<BooksStatistics["calculateAdvancedMediaStats"]>>;
type MangaSpecificStats = Awaited<ReturnType<MangaStatistics["calculateAdvancedMediaStats"]>>;


export type AdvancedMediaStats =
    | (BaseMediaStats & UpdatesStats & ActivityStats & OtherBase & { mediaType: typeof MediaType.SERIES; specificMediaStats: TvSpecificStats })
    | (BaseMediaStats & UpdatesStats & ActivityStats & OtherBase & { mediaType: typeof MediaType.ANIME; specificMediaStats: TvSpecificStats })
    | (BaseMediaStats & UpdatesStats & ActivityStats & OtherBase & { mediaType: typeof MediaType.MOVIES; specificMediaStats: MoviesSpecificStats })
    | (BaseMediaStats & UpdatesStats & ActivityStats & OtherBase & { mediaType: typeof MediaType.GAMES; specificMediaStats: GamesSpecificStats })
    | (BaseMediaStats & UpdatesStats & ActivityStats & OtherBase & { mediaType: typeof MediaType.BOOKS; specificMediaStats: BooksSpecificStats })
    | (BaseMediaStats & UpdatesStats & ActivityStats & OtherBase & { mediaType: typeof MediaType.MANGA; specificMediaStats: MangaSpecificStats });

type OverviewStats = Awaited<ReturnType<UserStatsService["userAdvancedSummaryStats"]>> & OtherBase & { mediaType: undefined };

export type UserStatsResult = OverviewStats | AdvancedMediaStats;

export type NamedValue = { name: number | string; value: number };

export type TopAffinity = {
    name: string;
    value: string;
    metadata: {
        avgRating: string;
        entriesCount: number;
        favoriteCount: number;
    };
}[];

export type ExtractStatsByType<T extends MediaType | undefined> = Extract<UserStatsResult, { mediaType: T }>;
