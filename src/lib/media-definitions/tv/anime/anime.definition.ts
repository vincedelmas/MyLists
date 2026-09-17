import {ApiProviderType, JobType, MediaType, Status} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";
import {tvContinueDefinition} from "@/lib/media-definitions/tv/continue.definition";


export const ANIME_FALLBACK_DURATION = 24;


export const animeDefinition = defineMediaDefinition({
    continue: tvContinueDefinition,
    statuses: [Status.WATCHING, Status.COMPLETED, Status.ON_HOLD, Status.RANDOM, Status.DROPPED, Status.PLAN_TO_WATCH],
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
