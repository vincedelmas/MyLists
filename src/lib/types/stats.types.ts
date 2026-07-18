import {MediaType, RatingSystemType} from "@/lib/utils/enums";
import {UserStatsService} from "@/lib/server/domain/user";
import {ActivityService} from "@/lib/server/domain/activity/activity.service";
import {ProfileUpdatesQuery} from "@/lib/server/domain/profile/profile-updates.query";
import {TvStatsRepository} from "@/lib/server/domain/media/tv/library/tv-stats.repository";
import {GameStatsRepository} from "@/lib/server/domain/media/games/library/game-stats.repository";
import {BookStatsRepository} from "@/lib/server/domain/media/books/library/book-stats.repository";
import {MangaStatsRepository} from "@/lib/server/domain/media/manga/library/manga-stats.repository";
import {MovieStatsRepository} from "@/lib/server/domain/media/movies/library/movie-stats.repository";


type BaseMediaStats = Awaited<ReturnType<typeof MovieStatsRepository.getAggregatedMediaStats>>;
type UpdatesStats = Awaited<ReturnType<ProfileUpdatesQuery["mediaUpdatesStatsPerMonth"]>>;
type ActivityStats = { activityByMonth: Awaited<ReturnType<ActivityService["getActivityStatsByMonth"]>> };
type OtherBase = { activatedMediaTypes: MediaType[]; ratingSystem: RatingSystemType; };
type TvSpecificStats = Awaited<ReturnType<TvStatsRepository["getAdvancedMediaStats"]>>;
type MoviesSpecificStats = Awaited<ReturnType<typeof MovieStatsRepository.getAdvancedMediaStats>>;
type GamesSpecificStats = Awaited<ReturnType<typeof GameStatsRepository.getAdvancedMediaStats>>;
type BooksSpecificStats = Awaited<ReturnType<typeof BookStatsRepository.getAdvancedMediaStats>>;
type MangaSpecificStats = Awaited<ReturnType<typeof MangaStatsRepository.getAdvancedMediaStats>>;


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
