import {MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const MOVIES_FALLBACK_DURATION = 100;


export const moviesDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.MOVIES,
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
        progress: {
            redoLabel: "movies re-watched",
            totalSpecificLabel: "Total Movies Watched",
        },
        durationDistribution: {
            unit: "m.",
            label: "Movies Duration Distribution",
        },
    },
});
