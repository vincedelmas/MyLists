import {MediaType} from "@/lib/utils/enums";
import {ColumnDef} from "@tanstack/react-table";
import {TvMediaType} from "@/lib/server/domain/media/tv/tv.types";
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
import {defineMediaConfig} from "@/lib/client/components/media/media-config.types";
import {getTvActiveFilters} from "@/lib/client/components/media/tv/TvActiveFilters";


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
});


export const seriesMediaConfig = createTvMediaConfig(MediaType.SERIES);


export const animeMediaConfig = createTvMediaConfig(MediaType.ANIME);
