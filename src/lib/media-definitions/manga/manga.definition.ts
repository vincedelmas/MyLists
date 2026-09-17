import {PROGRESS_MAX} from "@/lib/utils/constants";
import {defineMediaDefinition} from "@/lib/media-definitions/base/media.definition";
import type {ContinueStateByType} from "@/lib/media-definitions/base/continue.definition";
import {ApiProviderType, JobType, MediaType, Status, UpdateType} from "@/lib/utils/enums";


export const MANGA_FIXED_DURATION_MIN = 7;


export const mangaDefinition = defineMediaDefinition({
    continue: {
        status: Status.READING,
        getUpdate: (state: ContinueStateByType[typeof MediaType.MANGA]) => {
            const nextChapter = Math.min(state.currentChapter + 1, state.chapters || PROGRESS_MAX, PROGRESS_MAX);
            if (nextChapter > state.currentChapter) {
                return { type: UpdateType.CHAPTER, currentChapter: nextChapter };
            }
            return state.chapters && state.currentChapter === state.chapters
                ? { type: UpdateType.STATUS, status: Status.COMPLETED }
                : null;
        },
    },
    statuses: [Status.READING, Status.COMPLETED, Status.ON_HOLD, Status.DROPPED, Status.PLAN_TO_READ],
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
        affinities: [
            { key: "authorsStats", label: "Authors", job: JobType.CREATOR },
            { key: "genresStats", label: "Genres" },
            { key: "publishersStats", label: "Publishers", job: JobType.PUBLISHER },
        ],
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
