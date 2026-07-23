import {MediaType} from "@/lib/utils/enums";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";


export const BOOKS_FIXED_DURATION_MIN = 1.7;


export const booksDefinition = defineMediaDefinition({
    identity: {
        mediaType: MediaType.BOOKS,
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
        progress: {
            redoLabel: "books re-read",
            totalSpecificLabel: "Total Pages Read",
        },
        durationDistribution: {
            unit: "p.",
            label: "Pages Distribution",
        },
    },
});
