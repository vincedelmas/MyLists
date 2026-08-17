import {ApiProviderType, MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const BOOKS_FIXED_DURATION_MIN = 1.7;


export const booksDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.BOOKS,
    },
    externalSearch: {
        provider: ApiProviderType.BOOKS,
    },
    terminology: {
        entry: {
            plural: "books",
            singular: "book",
        },
    },
    progress: {
        inputStep: 1,
        unit: {
            short: "p.",
            plural: "pages",
            singular: "page",
            long: "Pages Read",
        },
        timing: {
            kind: "fixed",
            minutesPerUnit: BOOKS_FIXED_DURATION_MIN,
        },
    },
    statistics: {
        repeat: {
            label: "Rereads",
            rateLabel: "Reread rate",
        },
        timeComparison: {
            secondaryHours: 2,
            referenceHours: 5.5,
            referenceLabel: "reads of Harry Potter and the Philosopher’s Stone",
            secondaryLabel: "cups of tea gone cold, at one every two reading hours",
        },
        progress: {
            redoLabel: "books re-read",
            totalSpecificLabel: "Total Pages Read",
        },
        durationDistribution: {
            unit: "p.",
            rangeMode: "integer",
            label: "Pages Distribution",
        },
    },
});
