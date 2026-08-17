import {ApiProviderType, JobType, MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const ANIME_FALLBACK_DURATION = 24;


export const animeDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.ANIME,
    },
    externalSearch: {
        provider: ApiProviderType.TMDB,
    },
    terminology: {
        entry: {
            plural: "anime",
            singular: "anime",
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
            fallbackMinutes: ANIME_FALLBACK_DURATION,
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
            referenceHours: 37.5,
            secondaryHours: 1.5 / 60,
            secondaryLabel: "90-second anime opening sequences",
            referenceLabel: "complete watches of Attack on Titan",
        },
        progress: {
            redoLabel: "seasons re-watched",
            totalSpecificLabel: "Total Episodes Watched",
        },
        durationDistribution: {
            unit: "h",
            rangeMode: "integer",
            label: "Anime Duration Distribution",
        },
    },
});
