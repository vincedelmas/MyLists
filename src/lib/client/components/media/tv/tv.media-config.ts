import {MediaType, TvMediaType} from "@/lib/utils/enums";
import {SquareStack, XLineTop} from "lucide-react";
import {ColumnDef} from "@tanstack/react-table";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatNumber} from "@/lib/utils/number-formatting";
import {MediaStatsFor} from "@/lib/types/stats.types";
import {ExtractListByType} from "@/lib/types/query.options.types";
import {TvListItem} from "@/lib/client/components/media/tv/TvListItem";
import {TvInfoGrid} from "@/lib/client/components/media/tv/TvInfoGrid";
import {TvOverTitle} from "@/lib/client/components/media/tv/TvOverTitle";
import {TvFollowCard} from "@/lib/client/components/media/tv/TvFollowCard";
import {TvUnderTitle} from "@/lib/client/components/media/tv/TvUnderTitle";
import {getTvColumns} from "@/lib/client/components/media/tv/TvListColumns";
import {TvUserDetails} from "@/lib/client/components/media/tv/TvUserDetails";
import {TvExtraSections} from "@/lib/client/components/media/tv/TvExtraSections";
import {TvUpComingAlert} from "@/lib/client/components/media/tv/TvUpComingAlert";
import {defineMediaConfig, MediaStatCardDefinition} from "@/lib/client/components/media/media-config.types";
import {getTvActiveFilters} from "@/lib/client/components/media/tv/TvActiveFilters";


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
    sheetFilters: getTvActiveFilters,
    mediaListColumns: (props) => getTvColumns(props) as ColumnDef<ExtractListByType<T>>[],
    communityActivity: {
        countLabel: "Watched",
        extraMetric: "totalRedo",
        extraLabel: "Rewatched seasons",
    },
    statistics: {
        getStatCards: getTvStatCards,
    },
});


export const seriesMediaConfig = createTvMediaConfig(MediaType.SERIES);


export const animeMediaConfig = createTvMediaConfig(MediaType.ANIME);
