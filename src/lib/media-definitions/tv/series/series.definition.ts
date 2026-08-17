import {ApiProviderType, JobType, MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const SERIES_FALLBACK_DURATION = 40;


export const seriesDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.SERIES,
    },
    externalSearch: {
        provider: ApiProviderType.TMDB,
    },
    terminology: {
        entry: {
            plural: "series",
            singular: "series",
        },
    },
    progress: {
        inputStep: 1,
        unit: {
            short: "eps",
            long: "Episodes",
            plural: "episodes",
            singular: "episode",
        },
        timing: {
            kind: "media-duration",
            fallbackMinutes: SERIES_FALLBACK_DURATION,
        },
    },
    statistics: {
        affinities: [
            { key: "networksStats", label: "Networks", job: JobType.PLATFORM },
            { key: "genresStats", label: "Genres" },
            { key: "actorsStats", label: "Actors", job: JobType.ACTOR },
            { key: "countriesStats", label: "Countries" },
        ],
        repeat: {
            label: "Rewatches",
            rateLabel: "Rewatch rate",
        },
        timeComparison: {
            referenceHours: 49,
            secondaryHours: 0.75,
            referenceLabel: "complete watches of Breaking Bad",
            secondaryLabel: "45-minute ‘just one more’ episodes",
        },
        progress: {
            redoLabel: "seasons re-watched",
            totalSpecificLabel: "Total Episodes Watched",
        },
        durationDistribution: {
            unit: "h",
            rangeMode: "integer",
            label: "Series Duration Distribution",
        },
    },
});
