import {SQL} from "drizzle-orm";
import {TvService} from "@/lib/server/domain/media/tv";
import {MangaService} from "@/lib/server/domain/media/manga";
import {GamesService} from "@/lib/server/domain/media/games";
import {BooksService} from "@/lib/server/domain/media/books";
import {MoviesService} from "@/lib/server/domain/media/movies";
import {SQLiteColumn, SQLiteTable} from "drizzle-orm/sqlite-core";
import {MediaType, RatingSystemType, Status} from "@/lib/utils/enums";
import {BaseRepository} from "@/lib/server/domain/media/base/base.repository";
import {UserActivityService, UserStatsRepository, UserStatsService, UserUpdatesRepository} from "@/lib/server/domain/user";


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


type BaseMediaStats = Awaited<ReturnType<typeof UserStatsRepository.getAggregatedMediaStats>>;
type UpdatesStats = Awaited<ReturnType<typeof UserUpdatesRepository.mediaUpdatesStatsPerMonth>>;
type ActivityStats = { activityByMonth: Awaited<ReturnType<UserActivityService["getActivityStatsByMonth"]>> };
type OtherBase = { activatedMediaTypes: MediaType[]; ratingSystem: RatingSystemType; };
type TvSpecificStats = Awaited<ReturnType<TvService["calculateAdvancedMediaStats"]>>;
type MoviesSpecificStats = Awaited<ReturnType<MoviesService["calculateAdvancedMediaStats"]>>;
type GamesSpecificStats = Awaited<ReturnType<GamesService["calculateAdvancedMediaStats"]>>;
type BooksSpecificStats = Awaited<ReturnType<BooksService["calculateAdvancedMediaStats"]>>;
type MangaSpecificStats = Awaited<ReturnType<MangaService["calculateAdvancedMediaStats"]>>;


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

export type MediaNaming = {
    redo?: string;
    totalSpecific?: string;
    durationDistribution: string;
    durationDistributionUnit: string;
}

export type TopAffinity = Awaited<ReturnType<BaseRepository<any>["_computeTopAffinityStats"]>>;

export type ExtractStatsByType<T extends MediaType | undefined> = Extract<UserStatsResult, { mediaType: T }>;
