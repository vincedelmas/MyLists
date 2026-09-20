import {PROGRESS_MAX} from "@/lib/utils/constants";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";
import type {ContinueStateByType} from "@/lib/media-definitions/base/continue.definition";
import {ApiProviderType, JobType, MediaType, Status, UpdateType} from "@/lib/utils/enums";


export const BOOKS_FIXED_DURATION_MIN = 1.7;


export const booksDefinition = defineMediaDefinition({
    continue: {
        status: Status.READING,
        getUpdate: (state: ContinueStateByType[typeof MediaType.BOOKS]) => {
            if (state.pages === null) return null;
            const value = state.actualPage ?? 0;
            const nextPage = Math.min(value + 10, state.pages, PROGRESS_MAX);
            if (nextPage > value) {
                return { type: UpdateType.PAGE, actualPage: nextPage };
            }
            return state.pages > 0 && value === state.pages
                ? { type: UpdateType.STATUS, status: Status.COMPLETED }
                : null;
        },
    },
    statuses: [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ],
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
        affinities: [
            { key: "authorsStats", label: "Authors", job: JobType.CREATOR },
            { key: "genresStats", label: "Genres" },
            { key: "publishersStats", label: "Publishers" },
            { key: "langsStats", label: "Languages" },
        ],
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
