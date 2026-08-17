import {MediaType} from "@/lib/utils/enums";
import {XLineTop} from "lucide-react";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatNumber} from "@/lib/utils/number-formatting";
import {MangaListItem} from "@/lib/client/components/media/manga/MangaListItem";
import {MangaInfoGrid} from "@/lib/client/components/media/manga/MangaInfoGrid";
import {MangaOverTitle} from "@/lib/client/components/media/manga/MangaOverTitle";
import {defineMediaConfig} from "@/lib/client/components/media/media-config.types";
import {MangaFollowCard} from "@/lib/client/components/media/manga/MangaFollowCard";
import {MangaUnderTitle} from "@/lib/client/components/media/manga/MangaUnderTitle";
import {getMangaColumns} from "@/lib/client/components/media/manga/MangaListColumns";
import {MangaUserDetails} from "@/lib/client/components/media/manga/MangaUserDetails";
import {getMangaActiveFilters} from "@/lib/client/components/media/manga/MangaActiveFilters";


export const mangaMediaConfig = defineMediaConfig({
    mediaType: MediaType.MANGA,
    infoGrid: MangaInfoGrid,
    overTitle: MangaOverTitle,
    underTitle: MangaUnderTitle,
    mediaListCard: MangaListItem,
    mediaFollowCard: MangaFollowCard,
    mediaListColumns: getMangaColumns,
    mediaUserDetails: MangaUserDetails,
    sheetFilters: getMangaActiveFilters,
    communityActivity: {
        countLabel: "Read",
        extraLabel: "Rereads",
        extraMetric: "totalRedo",
    },
    statistics: {
        getStatCards: (stats) => [
            {
                icon: XLineTop,
                title: "Avg. Manga Length",
                value: stats.specificMediaStats.avgDuration === null
                    ? DEFAULT_DASH_FALLBACK
                    : `${formatNumber(stats.specificMediaStats.avgDuration, { fractionDigits: 0 })} chapters`,
            },
        ],
    },
});
