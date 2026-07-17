import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import {UserActivityService, UserStatsService} from "@/lib/server/domain/user";
import {ProfileUpdatesQuery} from "@/lib/server/domain/profile/profile-updates.query";
import {TvStatsReadRepository} from "@/lib/server/domain/library/tv/tv-stats-read.repository";
import {MovieStatsReadRepository} from "@/lib/server/domain/library/movies/movie-stats-read.repository";
import {GameStatsReadRepository} from "@/lib/server/domain/library/games/game-stats-read.repository";
import {BookStatsReadRepository} from "@/lib/server/domain/library/books/book-stats-read.repository";
import {MangaStatsReadRepository} from "@/lib/server/domain/library/manga/manga-stats-read.repository";


type BaseMediaStats = Awaited<ReturnType<MovieStatsReadRepository["getAggregatedMediaStats"]>>;
type UpdatesStats = Awaited<ReturnType<ProfileUpdatesQuery["mediaUpdatesStatsPerMonth"]>>;
type ActivityStats = { activityByMonth: Awaited<ReturnType<UserActivityService["getActivityStatsByMonth"]>> };
type OtherBase = { activatedMediaTypes: MediaType[]; ratingSystem: RatingSystemType; };
type TvSpecificStats = Awaited<ReturnType<TvStatsReadRepository["getAdvancedMediaStats"]>>;
type MoviesSpecificStats = Awaited<ReturnType<MovieStatsReadRepository["getAdvancedMediaStats"]>>;
type GamesSpecificStats = Awaited<ReturnType<GameStatsReadRepository["getAdvancedMediaStats"]>>;
type BooksSpecificStats = Awaited<ReturnType<BookStatsReadRepository["getAdvancedMediaStats"]>>;
type MangaSpecificStats = Awaited<ReturnType<MangaStatsReadRepository["getAdvancedMediaStats"]>>;


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

export type TopAffinity = TvSpecificStats["actorsStats"];

export type ExtractStatsByType<T extends MediaType | undefined> = Extract<UserStatsResult, { mediaType: T }>;
