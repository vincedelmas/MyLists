import {ColumnDef} from "@tanstack/react-table";
import {MediaStatsFor} from "@/lib/types/stats.types";
import {formatNumber} from "@/lib/utils/formatting/number";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {ExtractListByType} from "@/lib/types/query.options.types";
import {TvListItem} from "@/lib/client/components/media/tv/TvListItem";
import {MediaCategory, MediaType, TvMediaType} from "@/lib/utils/enums";
import {TvFollowCard} from "@/lib/client/components/media/tv/TvFollowCard";
import {getTvColumns} from "@/lib/client/components/media/tv/TvListColumns";
import {TvUserDetails} from "@/lib/client/components/media/tv/TvUserDetails";
import {TvExtraSections} from "@/lib/client/components/media/tv/TvExtraSections";
import {mediaTableFeatures} from "@/lib/client/components/media/media-table-features";
import {getTvContinueProgress} from "@/lib/client/components/media/tv/continue-progress";
import {Clapperboard, Globe, RadioTower, SquareStack, UserRound, XLineTop} from "lucide-react";
import {TvInfoGrid, TvOverTitle, TvUnderTitle, TvUpComingAlert} from "@/lib/client/components/media/tv/TvDetails";
import {defineMediaConfig, MediaClientConfig, MediaStatCardDefinition} from "@/lib/client/components/media/media-config.types";


const getTvStatCards = (stats: MediaStatsFor<TvMediaType>): MediaStatCardDefinition[] => [
    {
        icon: XLineTop,
        title: stats.mediaType === MediaType.ANIME ? "Avg. Anime Duration" : "Avg. Series Duration",
        value: stats.specificMediaStats.avgDuration
            ? `${formatNumber(stats.specificMediaStats.avgDuration / 60, { fractionDigits: 1, locale: "en" })} hours`
            : DEFAULT_DASH_FALLBACK,
    },
    {
        icon: SquareStack,
        title: "Total Seasons",
        value: formatNumber(stats.specificMediaStats.totalSeasons),
    },
];


const tvMetadataFilters = {
    actors: { title: "Actors", type: "search" },
    creators: { title: "Creators", type: "search" },
    networks: { title: "Networks", type: "search" },
    langs: { title: "Countries", type: "checkbox", render: name => formatLocaleName(name, "region") },
} satisfies MediaClientConfig<TvMediaType>["metadataFilters"];


const createTvMediaConfig = <T extends TvMediaType>(mediaType: T) => defineMediaConfig<T>({
    mediaType,
    infoGrid: TvInfoGrid,
    overTitle: TvOverTitle,
    underTitle: TvUnderTitle,
    mediaListCard: TvListItem,
    mediaFollowCard: TvFollowCard,
    upComingAlert: TvUpComingAlert,
    extraSections: TvExtraSections,
    mediaUserDetails: TvUserDetails,
    metadataFilters: tvMetadataFilters as MediaClientConfig<T>["metadataFilters"],
    continue: {
        getProgress: getTvContinueProgress,
    },
    statistics: {
        getStatCards: getTvStatCards,
    },
    mediaListColumns: (props) => {
        return getTvColumns(props) as ColumnDef<typeof mediaTableFeatures, ExtractListByType<T>>[];
    },
    communityActivity: {
        countLabel: "Watched",
        extraMetric: "totalRedo",
        extraLabel: "Rewatched seasons",
    },
    categories: {
        [MediaCategory.COUNTRY]: {
            icon: Globe,
            label: "Country",
            descriptionSuffix: "",
            descriptionVerb: "from",
            sectionTitle: "Catalogue",
        },
        [MediaCategory.ACTOR]: {
            label: "Actor",
            icon: UserRound,
            sectionTitle: "Filmography",
            descriptionVerb: "featuring",
            descriptionSuffix: " in the cast",
        },
        [MediaCategory.CREATOR]: {
            label: "Creator",
            icon: Clapperboard,
            descriptionSuffix: "",
            sectionTitle: "Catalogue",
            descriptionVerb: "created by",
        },
        [MediaCategory.PLATFORM]: {
            label: "Network",
            icon: RadioTower,
            descriptionSuffix: "",
            sectionTitle: "Catalogue",
            descriptionVerb: "aired on",
        },
    },
});


export const seriesMediaConfig = createTvMediaConfig(MediaType.SERIES);


export const animeMediaConfig = createTvMediaConfig(MediaType.ANIME);
