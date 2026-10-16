import {JobType, MediaType} from "@/lib/utils/enums";
import {DEFAULT_DASH_FALLBACK} from "@/lib/utils/constants";
import {formatLocaleName} from "@/lib/utils/formatting/text";
import {formatCurrency, formatNumber} from "@/lib/utils/formatting/number";
import {MovieListItem} from "@/lib/client/components/media/movies/MovieListItem";
import {moviesDefinition} from "@/lib/media-definitions/movies/movies.definition";
import {MoviesInfoGrid} from "@/lib/client/components/media/movies/MoviesInfoGrid";
import {defineMediaConfig} from "@/lib/client/components/media/media-config.types";
import {Clapperboard, DollarSign, Music2, UserRound, XLineTop} from "lucide-react";
import {MoviesOverTitle} from "@/lib/client/components/media/movies/MoviesOverTitle";
import {MovieFollowCard} from "@/lib/client/components/media/movies/MovieFollowCard";
import {MoviesUnderTitle} from "@/lib/client/components/media/movies/MoviesUnderTitle";
import {getMoviesColumns} from "@/lib/client/components/media/movies/MoviesListColumns";
import {MoviesUserDetails} from "@/lib/client/components/media/movies/MoviesUserDetails";
import {tmdbSearchFilterDefinition} from "@/lib/client/components/search/TmdbSearchFilters";
import {MoviesExtraSections} from "@/lib/client/components/media/movies/MoviesExtraSections";
import {MoviesUpComingAlert} from "@/lib/client/components/media/movies/MoviesUpComingAlert";


export const moviesMediaConfig = defineMediaConfig({
    mediaType: MediaType.MOVIES,
    continue: null,
    infoGrid: MoviesInfoGrid,
    overTitle: MoviesOverTitle,
    underTitle: MoviesUnderTitle,
    mediaListCard: MovieListItem,
    mediaFollowCard: MovieFollowCard,
    upComingAlert: MoviesUpComingAlert,
    extraSections: MoviesExtraSections,
    mediaListColumns: getMoviesColumns,
    mediaUserDetails: MoviesUserDetails,
    metadataFilters: {
        actors: { title: "Actors", type: "search" },
        directors: { title: "Directors", type: "search" },
        langs: { title: "Languages", type: "checkbox", render: name => formatLocaleName(name, "language") },
    },
    jobs: {
        [JobType.ACTOR]: {
            label: "Actor",
            icon: UserRound,
            sectionTitle: "Filmography",
            descriptionVerb: "featuring",
            descriptionSuffix: " in the cast",
        },
        [JobType.CREATOR]: {
            label: "Director",
            icon: Clapperboard,
            descriptionSuffix: "",
            sectionTitle: "Filmography",
            descriptionVerb: "directed by",
        },
        [JobType.COMPOSITOR]: {
            icon: Music2,
            label: "Composer",
            descriptionSuffix: "",
            sectionTitle: "Credits",
            descriptionVerb: "featuring music by",
        },
    },
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
    advancedSearch: {
        provider: moviesDefinition.externalSearch.provider,
        ...tmdbSearchFilterDefinition,
    },
});
