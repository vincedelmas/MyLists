import {ApiProviderType, JobType, MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const MOVIES_FALLBACK_DURATION = 100;


export const moviesDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.MOVIES,
    },
    externalSearch: {
        provider: ApiProviderType.TMDB,
    },
    terminology: {
        entry: {
            plural: "movies",
            singular: "movie",
        },
    },
    progress: {
        inputStep: 1,
        unit: {
            short: "views",
            plural: "viewings",
            singular: "viewing",
            long: "Times Watched",
        },
        timing: {
            kind: "media-duration",
            fallbackMinutes: MOVIES_FALLBACK_DURATION,
        },
    },
    statistics: {
        affinities: [
            { key: "directorsStats", label: "Directors", job: JobType.CREATOR },
            { key: "actorsStats", label: "Actors", job: JobType.ACTOR },
            { key: "genresStats", label: "Genres" },
            { key: "langsStats", label: "Languages" },
        ],
        repeat: {
            label: "Rewatches",
            rateLabel: "Rewatch rate",
        },
        timeComparison: {
            secondaryHours: 2,
            referenceHours: 169 / 60,
            referenceLabel: "full watches of Interstellar",
            secondaryLabel: "cinema-sized popcorns, at one per two-hour film",
        },
        progress: {
            redoLabel: "movies re-watched",
            totalSpecificLabel: "Total Movies Watched",
        },
        durationDistribution: {
            unit: "m.",
            rangeMode: "integer",
            label: "Movies Duration Distribution",
        },
    },
});
