import {MediaType} from "@/lib/utils/enums";
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
});
