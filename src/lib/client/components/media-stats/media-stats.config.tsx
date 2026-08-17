import {MediaType} from "@/lib/utils/enums";
import {ReactElement, ReactNode} from "react";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {DollarSign, SquareStack, XLineTop} from "lucide-react";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
import {formatCurrency, formatNumber} from "@/lib/utils/number-formatting";
import {AnyMediaStats, MediaStatsFor, TopAffinity} from "@/lib/types/stats.types";


type StatCardDefinition = {
    title: string;
    icon?: ReactNode;
    subtitle?: string;
    value: string | number | ReactElement | null;
};


type MediaStatsViewConfig = {
    getStatCards: (stats: AnyMediaStats) => StatCardDefinition[];
    getAffinityCards: (stats: AnyMediaStats) => AffinityCardDefinition[];
};


type AffinityCardDefinition = {
    title: string;
    topAffinity: TopAffinity;
    job?: "actor" | "creator" | "platform" | "publisher";
};


type TypedStatsConfig<T extends MediaType> = {
    getStatCards: (stats: MediaStatsFor<T>) => StatCardDefinition[];
    getAffinityCards: (stats: MediaStatsFor<T>) => AffinityCardDefinition[];
};


const defineMediaStatsView = <T extends MediaType>(_mediaType: T, config: TypedStatsConfig<T>) => {
    return config as MediaStatsViewConfig;
};


const getTvStatCards = (stats: MediaStatsFor<TvMediaType>): StatCardDefinition[] => [
    {
        icon: <XLineTop className="size-4"/>,
        title: stats.mediaType === MediaType.ANIME ? "Avg. Anime Duration" : "Avg. Series Duration",
        value: stats.specificMediaStats.avgDuration
            ? `${formatNumber(stats.specificMediaStats.avgDuration / 60, { fractionDigits: 1, locale: "en" })} hours`
            : DEFAULT_DASH_FALLBACK,
    },
    {
        title: "Total Seasons",
        icon: <SquareStack className="size-4"/>,
        value: formatNumber(stats.specificMediaStats.totalSeasons),
    },
];


const getTvAffinityCards = (stats: MediaStatsFor<TvMediaType>): AffinityCardDefinition[] => [
    { title: "Networks", job: "platform", topAffinity: stats.specificMediaStats.networksStats },
    { title: "Genres", topAffinity: stats.specificMediaStats.genresStats },
    { title: "Actors", job: "actor", topAffinity: stats.specificMediaStats.actorsStats },
    { title: "Countries", topAffinity: stats.specificMediaStats.countriesStats },
];


export const mediaStatsViewConfig = {
    [MediaType.SERIES]: defineMediaStatsView(MediaType.SERIES, {
        getStatCards: getTvStatCards,
        getAffinityCards: getTvAffinityCards,
    }),
    [MediaType.ANIME]: defineMediaStatsView(MediaType.ANIME, {
        getStatCards: getTvStatCards,
        getAffinityCards: getTvAffinityCards,
    }),
    [MediaType.MOVIES]: defineMediaStatsView(MediaType.MOVIES, {
        getStatCards: (stats) => [
            {
                title: "Avg. Movie Duration",
                icon: <XLineTop className="size-4"/>,
                value: stats.specificMediaStats.avgDuration === null
                    ? DEFAULT_DASH_FALLBACK
                    : `${formatNumber(stats.specificMediaStats.avgDuration, { fractionDigits: 0 })} min`,
            },
            {
                title: "Total Budget",
                icon: <DollarSign className="size-4"/>,
                value: formatCurrency(stats.specificMediaStats.totalBudget),
            },
            {
                title: "Total Revenue",
                icon: <DollarSign className="size-4"/>,
                value: formatCurrency(stats.specificMediaStats.totalRevenue),
            },
        ],
        getAffinityCards: (stats) => [
            { title: "Directors", job: "creator", topAffinity: stats.specificMediaStats.directorsStats },
            { title: "Actors", job: "actor", topAffinity: stats.specificMediaStats.actorsStats },
            { title: "Genres", topAffinity: stats.specificMediaStats.genresStats },
            { title: "Languages", topAffinity: stats.specificMediaStats.langsStats },
        ],
    }),
    [MediaType.GAMES]: defineMediaStatsView(MediaType.GAMES, {
        getStatCards: (stats) => [
            {
                title: "Avg. Game Playtime",
                subtitle: "All games included",
                icon: <XLineTop className="size-4"/>,
                value: stats.specificMediaStats.avgDuration === null
                    ? DEFAULT_DASH_FALLBACK
                    : `${formatNumber(stats.specificMediaStats.avgDuration, { fractionDigits: 1 })} hours`,
            },
        ],
        getAffinityCards: (stats) => [
            { title: "Developers", job: "creator", topAffinity: stats.specificMediaStats.developersStats },
            { title: "Platforms", topAffinity: stats.specificMediaStats.platformsStats },
            { title: "Genres", topAffinity: stats.specificMediaStats.genresStats },
            { title: "Publishers", topAffinity: stats.specificMediaStats.publishersStats },
            { title: "Engines", topAffinity: stats.specificMediaStats.enginesStats },
            { title: "Perspectives", topAffinity: stats.specificMediaStats.perspectivesStats },
        ],
    }),
    [MediaType.BOOKS]: defineMediaStatsView(MediaType.BOOKS, {
        getStatCards: (stats) => [
            {
                title: "Avg. Book Length",
                icon: <XLineTop className="size-4"/>,
                value: stats.specificMediaStats.avgDuration === null
                    ? DEFAULT_DASH_FALLBACK
                    : `${formatNumber(stats.specificMediaStats.avgDuration)} pages`,
            },
        ],
        getAffinityCards: (stats) => [
            { title: "Authors", job: "creator", topAffinity: stats.specificMediaStats.authorsStats },
            { title: "Genres", topAffinity: stats.specificMediaStats.genresStats },
            { title: "Publishers", topAffinity: stats.specificMediaStats.publishersStats },
            { title: "Languages", topAffinity: stats.specificMediaStats.langsStats },
        ],
    }),
    [MediaType.MANGA]: defineMediaStatsView(MediaType.MANGA, {
        getStatCards: (stats) => [
            {
                title: "Avg. Manga Length",
                icon: <XLineTop className="size-4"/>,
                value: stats.specificMediaStats.avgDuration === null
                    ? DEFAULT_DASH_FALLBACK
                    : `${formatNumber(stats.specificMediaStats.avgDuration, { fractionDigits: 0 })} chapters`,
            },
        ],
        getAffinityCards: (stats) => [
            { title: "Authors", job: "creator", topAffinity: stats.specificMediaStats.authorsStats },
            { title: "Genres", topAffinity: stats.specificMediaStats.genresStats },
            { title: "Publishers", job: "publisher", topAffinity: stats.specificMediaStats.publishersStats },
        ],
    }),
} satisfies Record<MediaType, MediaStatsViewConfig>;
