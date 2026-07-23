import {MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const ANIME_FALLBACK_DURATION = 24;


export const animeDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.ANIME,
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
        progress: {
            redoLabel: "seasons re-watched",
            totalSpecificLabel: "Total Episodes Watched",
        },
        durationDistribution: {
            unit: "h",
            label: "Anime Duration Distribution",
        },
    },
});
