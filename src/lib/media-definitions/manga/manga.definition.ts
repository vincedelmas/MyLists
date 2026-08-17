import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const MANGA_FIXED_DURATION_MIN = 7;


export const mangaDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.MANGA,
    },
    externalSearch: {
        provider: ApiProviderType.MANGA,
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
        repeat: {
            label: "Rereads",
            rateLabel: "Reread rate",
        },
        timeComparison: {
            referenceHours: 20,
            secondaryHours: 10 / 60,
            referenceLabel: "reads of the complete Death Note manga",
            secondaryLabel: "manga chapters, at ten minutes per chapter",
        },
        progress: {
            redoLabel: "manga re-read",
            totalSpecificLabel: "Total Chapters Read",
        },
        durationDistribution: {
            unit: "ch.",
            rangeMode: "integer",
            label: "Chapters Distribution",
        },
    },
});
