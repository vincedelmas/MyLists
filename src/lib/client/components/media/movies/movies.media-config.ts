import {MediaType} from "@/lib/utils/enums";
import {DollarSign, XLineTop} from "lucide-react";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatCurrency, formatNumber} from "@/lib/utils/number-formatting";
import {MovieListItem} from "@/lib/client/components/media/movies/MovieListItem";
import {MoviesInfoGrid} from "@/lib/client/components/media/movies/MoviesInfoGrid";
import {defineMediaConfig} from "@/lib/client/components/media/media-config.types";
import {MoviesOverTitle} from "@/lib/client/components/media/movies/MoviesOverTitle";
import {MovieFollowCard} from "@/lib/client/components/media/movies/MovieFollowCard";
import {MoviesUnderTitle} from "@/lib/client/components/media/movies/MoviesUnderTitle";
import {getMoviesColumns} from "@/lib/client/components/media/movies/MoviesListColumns";
import {MoviesUserDetails} from "@/lib/client/components/media/movies/MoviesUserDetails";
import {MoviesExtraSections} from "@/lib/client/components/media/movies/MoviesExtraSections";
import {MoviesUpComingAlert} from "@/lib/client/components/media/movies/MoviesUpComingAlert";
import {getMoviesActiveFilters} from "@/lib/client/components/media/movies/MoviesActiveFilters";


export const moviesMediaConfig = defineMediaConfig({
    mediaType: MediaType.MOVIES,
    infoGrid: MoviesInfoGrid,
    overTitle: MoviesOverTitle,
    underTitle: MoviesUnderTitle,
    mediaListCard: MovieListItem,
    mediaFollowCard: MovieFollowCard,
    upComingAlert: MoviesUpComingAlert,
    extraSections: MoviesExtraSections,
    mediaListColumns: getMoviesColumns,
    mediaUserDetails: MoviesUserDetails,
    sheetFilters: getMoviesActiveFilters,
    communityActivity: {
        countLabel: "Watched",
        extraLabel: "Rewatches",
        extraMetric: "totalRedo",
    },
    statistics: {
        getStatCards: (stats) => [
            {
                title: "Avg. Movie Duration",
                icon: XLineTop,
                value: stats.specificMediaStats.avgDuration === null
                    ? DEFAULT_DASH_FALLBACK
                    : `${formatNumber(stats.specificMediaStats.avgDuration, { fractionDigits: 0 })} min`,
            },
            {
                title: "Total Budget",
                icon: DollarSign,
                value: formatCurrency(stats.specificMediaStats.totalBudget),
            },
            {
                title: "Total Revenue",
                icon: DollarSign,
                value: formatCurrency(stats.specificMediaStats.totalRevenue),
            },
        ],
    },
});
