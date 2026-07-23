import {MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const gamesDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.GAMES,
    },
    terminology: {
        entry: {
            plural: "games",
            singular: "game",
        },
    },
    progress: {
        inputStep: 0.25,
        unit: {
            short: "h.",
            plural: "hours",
            singular: "hour",
            long: "Hours Played",
        },
        timing: {
            kind: "stored-minutes",
            minutesPerInputUnit: 60,
        },
    },
    statistics: {
        durationDistribution: {
            unit: "h",
            label: "Playthrough Duration Distribution",
        },
    },
});
