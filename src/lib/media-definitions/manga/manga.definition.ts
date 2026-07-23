import {MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const MANGA_FIXED_DURATION_MIN = 7;


export const mangaDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.MANGA,
    },
    terminology: {
        entry: {
            plural: "manga",
            singular: "manga",
        },
    },
    progress: {
        inputStep: 1,
        unit: {
            short: "ch.",
            plural: "chapters",
            singular: "chapter",
            long: "Chapters Read",
        },
        timing: {
            kind: "fixed",
            minutesPerUnit: MANGA_FIXED_DURATION_MIN,
        },
    },
    statistics: {
        progress: {
            redoLabel: "manga re-read",
            totalSpecificLabel: "Total Chapters Read",
        },
        durationDistribution: {
            unit: "ch.",
            label: "Chapters Distribution",
        },
    },
});
