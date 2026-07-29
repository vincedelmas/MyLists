import {MediaType} from "@/lib/utils/enums";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {ComponentType, ReactElement, ReactNode} from "react";
import {DollarSign, SquareStack, XLineTop} from "lucide-react";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
import {StatCard} from "@/lib/client/components/media-stats/StatCard";
import {formatCurrency, formatNumber} from "@/lib/utils/number-formatting";
import {AnyMediaStats, MediaStatsFor, TopAffinity} from "@/lib/types/stats.types";
import {TopAffinityCard} from "@/lib/client/components/media-stats/TopAffinityCard";


type StatCardDefinition = {
    title: string;
    icon?: ReactNode;
    subtitle?: string;
    value: string | number | ReactElement | null;
};


type StatsSectionProps = {
    stats: AnyMediaStats;
};


type MediaStatsViewConfig = {
    SummaryStats: ComponentType<StatsSectionProps>;
    AffinityStats: ComponentType<StatsSectionProps>;
};


type AffinityCardDefinition = {
    title: string;
    topAffinity: TopAffinity;
    job?: "actor" | "creator" | "platform" | "publisher";
};


type AffinityCardsProps = {
    columns: 3 | 4;
    mediaType: MediaType;
    cards: AffinityCardDefinition[];
};


type TypedStatsConfig<T extends MediaType> = {
    affinityColumns: 3 | 4;
    getStatCards: (stats: MediaStatsFor<T>) => StatCardDefinition[];
    getAffinityCards: (stats: MediaStatsFor<T>) => AffinityCardDefinition[];
};


const affinityGridClasses = {
    3: "grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1",
    4: "grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1",
} as const;


const AffinityCards = ({ cards, columns, mediaType }: AffinityCardsProps) => (
    <div className={affinityGridClasses[columns]}>
        {cards.map((card) =>
            <TopAffinityCard
                job={card.job}
                key={card.title}
                title={card.title}
                mediaType={mediaType}
                topAffinity={card.topAffinity}
            />
        )}
    </div>
);


const defineMediaStatsView = <T extends MediaType>(mediaType: T, config: TypedStatsConfig<T>): MediaStatsViewConfig => {
    const getTypedStats = (stats: AnyMediaStats) => {
        if (stats.mediaType !== mediaType) return null;
        return stats as MediaStatsFor<T>;
    };

    const SummaryStats = ({ stats }: StatsSectionProps) => {
        const typedStats = getTypedStats(stats);
        if (!typedStats) return null;

        return config.getStatCards(typedStats).map((card) =>
            <StatCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
            />
        );
    };

    const AffinityStats = ({ stats }: StatsSectionProps) => {
        const typedStats = getTypedStats(stats);
        if (!typedStats) return null;

        const cards = config.getAffinityCards(typedStats);
        if (cards.length === 0) return null;

        return (
            <AffinityCards
                cards={cards}
                mediaType={typedStats.mediaType}
                columns={config.affinityColumns}
            />
        );
    };

    return { SummaryStats, AffinityStats };
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
        affinityColumns: 4,
        getStatCards: getTvStatCards,
        getAffinityCards: getTvAffinityCards,
    }),
    [MediaType.ANIME]: defineMediaStatsView(MediaType.ANIME, {
        affinityColumns: 4,
        getStatCards: getTvStatCards,
        getAffinityCards: getTvAffinityCards,
    }),
    [MediaType.MOVIES]: defineMediaStatsView(MediaType.MOVIES, {
        affinityColumns: 4,
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
        affinityColumns: 3,
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
        affinityColumns: 4,
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
        affinityColumns: 3,
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
