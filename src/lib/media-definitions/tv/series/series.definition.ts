import {MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const SERIES_FALLBACK_DURATION = 40;


export const seriesDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.SERIES,
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
        progress: {
            redoLabel: "seasons re-watched",
            totalSpecificLabel: "Total Episodes Watched",
        },
        durationDistribution: {
            unit: "h",
            label: "Series Duration Distribution",
        },
    },
});
